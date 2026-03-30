/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireDbUser } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { toCourseBaseDict, toEnrollmentDict, toUserDict } from "./utils";

async function ensureAdmin() {
  const me = await requireDbUser();
  if (me.role !== "admin") {
    return { status: 403, json: { error: "Admin access required" } } as const;
  }
  return null;
}

export async function getAdminDashboard() {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  // Split into two Promise.all calls to stay within TS tuple-inference limits
  // (Turbopack's type-checker on Vercel fails with 9+ items).
  const [users, courses, enrollments, notifications, masterCategories, subcategories, publishedCourses] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.notification.count(),
      prisma.masterCategory.count(),
      prisma.subCategory.count(),
      prisma.course.count({ where: { status: "published" } }),
    ]);

  const [recentUsers, recentEnrollmentsRaw] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.enrollment.findMany({
      where: { isActive: true },
      orderBy: { enrolledAt: "desc" },
      take: 10,
      include: { user: true, course: true },
    }),
  ]);

  let totalRevenue = 0;
  let thisMonthRevenue = 0;
  let recentPayments: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
  }> = [];

  try {
    const [revAll, revMonth, payRows] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
      prisma.payment.aggregate({
        where: { status: "completed", createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    totalRevenue = Number(revAll._sum.amount ?? 0);
    thisMonthRevenue = Number(revMonth._sum.amount ?? 0);
    recentPayments = payRows.map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      created_at: p.createdAt.toISOString(),
    }));
  } catch {
    /* payments table optional in some environments */
  }

  const recent_enrollments = recentEnrollmentsRaw.map((e: typeof recentEnrollmentsRaw[number]) => ({
    user: {
      first_name: e.user.firstName,
      last_name: e.user.lastName,
      email: e.user.email,
    },
    course: { title: e.course.title },
    enrollment: {
      id: e.id,
      enrolled_at: e.enrolledAt.toISOString(),
      progress_percentage: e.progressPercentage,
    },
  }));

  return {
    summary: {
      users,
      courses,
      enrollments,
      notifications,
    },
    statistics: {
      master_categories: masterCategories,
      subcategories: subcategories,
      total_courses: courses,
      published_courses: publishedCourses,
      total_users: users,
      total_enrollments: enrollments,
      total_revenue: totalRevenue,
      this_month_revenue: thisMonthRevenue,
    },
    recent_activity: {
      recent_users: recentUsers.map(toUserDict),
      recent_enrollments,
      recent_payments: recentPayments,
    },
  };
}

export async function getAdminUsers(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const role = searchParams.get("role");
  const q = (searchParams.get("q") ?? "").trim();

  const where: any = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    users: users.map(toUserDict),
    pagination: {
      page,
      per_page: perPage,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
      has_next: page * perPage < total,
      has_prev: page > 1,
    },
  };
}

export async function getAdminUser(userId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { status: 404, json: { error: "User not found" } } as const;
  return { user: toUserDict(user) };
}

export async function updateAdminUser(userId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const payload = body ?? {};

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { status: 404, json: { error: "User not found" } } as const;

  const data: any = {};
  if (typeof payload.first_name === "string") data.firstName = payload.first_name;
  if (typeof payload.last_name === "string") data.lastName = payload.last_name;
  if (typeof payload.phone === "string" || payload.phone === null) data.phone = payload.phone;
  if (typeof payload.bio === "string" || payload.bio === null) data.bio = payload.bio;
  if (typeof payload.is_active === "boolean") data.isActive = payload.is_active;
  if (typeof payload.role === "string") data.role = payload.role;

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return { message: "User updated successfully", user: toUserDict(updated) };
}

export async function deleteAdminUser(userId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { status: 404, json: { error: "User not found" } } as const;

  // Soft delete to preserve references.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  return { message: "User deactivated", user: toUserDict(updated) };
}

export async function promoteInstructor(userId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { status: 404, json: { error: "User not found" } } as const;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: "instructor" },
  });
  return { message: "User promoted to instructor", user: toUserDict(updated) };
}

export async function updateCourseStatus(courseId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const status = body?.status;
  if (status !== "draft" && status !== "published") {
    return { status: 400, json: { error: "status must be draft or published" } } as const;
  }
  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) return { status: 404, json: { error: "Course not found" } } as const;

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status },
  });
  return { message: "Course status updated", course: updated };
}

export async function getAdminAnalytics() {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const [activeUsers, publishedCourses, completedEnrollments, avgProgress] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.course.count({ where: { status: "published" } }),
    prisma.enrollment.count({ where: { completedAt: { not: null } } }),
    prisma.enrollment.aggregate({ _avg: { progressPercentage: true } }),
  ]);

  return {
    analytics: {
      active_users: activeUsers,
      published_courses: publishedCourses,
      completed_enrollments: completedEnrollments,
      average_progress_percentage: avgProgress._avg.progressPercentage ?? 0,
    },
  };
}

export async function getAdminCourses(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") ?? "").trim();

  const where: any = {
    ...(status === "draft" || status === "published" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { shortDescription: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      include: { instructor: true, enrollments: true, subcategory: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    courses: courses.map((c: any) => ({
      ...toCourseBaseDict(c, c.enrollments.length),
      subcategory_id: c.subcategoryId,
      subcategory_name: c.subcategory?.name ?? null,
    })),
    pagination: {
      page,
      per_page: perPage,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
      has_next: page * perPage < total,
      has_prev: page > 1,
    },
  };
}

export async function getAdminEnrollments(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const completion = searchParams.get("completion");
  const q = (searchParams.get("q") ?? "").trim();

  const where: any = {
    ...(completion === "completed"
      ? { completedAt: { not: null } }
      : completion === "in-progress"
        ? { completedAt: null }
        : {}),
    ...(q
      ? {
          OR: [
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { firstName: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
            { course: { title: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      include: { user: true, course: true },
      orderBy: { enrolledAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    enrollments: enrollments.map((e: any) => ({
      ...toEnrollmentDict(e),
      user: {
        id: e.user.id,
        email: e.user.email,
        first_name: e.user.firstName,
        last_name: e.user.lastName,
        phone: e.user.phone,
      },
      course: {
        id: e.course.id,
        title: e.course.title,
        difficulty_level: e.course.difficultyLevel,
        duration_hours: e.course.durationHours,
        price: Number(e.course.price),
        currency: e.course.currency,
      },
    })),
    pagination: {
      page,
      per_page: perPage,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
      has_next: page * perPage < total,
      has_prev: page > 1,
    },
  };
}

export async function getAdminPayments(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const status = searchParams.get("status");
  const search = (searchParams.get("search") ?? "").trim();
  const allowedStatuses = new Set(["pending", "completed", "failed", "refunded"]);

  // NOTE: This endpoint uses raw SQL to keep working even if relations
  // are incomplete; we sanitize string inputs since it uses Unsafe raw queries.
  const conditions: string[] = [];
  if (status && allowedStatuses.has(status)) {
    conditions.push(`p.status = '${status.replaceAll("'", "''")}'`);
  }
  if (search) {
    const q = search.replaceAll("'", "''");
    conditions.push(`(
      u.email ILIKE '%${q}%'
      OR u.first_name ILIKE '%${q}%'
      OR u.last_name ILIKE '%${q}%'
      OR u.phone ILIKE '%${q}%'
      OR c.title ILIKE '%${q}%'
    )`);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const offset = (page - 1) * perPage;
  try {
    const countRows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM payments p ${whereSql};`,
    )) as Array<{ total: number }>;

    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        p.id,
        p.user_id,
        p.course_id,
        p.amount::text AS amount,
        p.currency,
        p.status::text AS status,
        p.payment_method,
        p.created_at,
        p.updated_at,
        u.email AS user_email,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.phone AS user_phone,
        c.title AS course_title,
        c.thumbnail AS course_thumbnail,
        c.difficulty_level AS course_difficulty_level,
        c.duration_hours AS course_duration_hours,
        iu.first_name AS instructor_first_name,
        iu.last_name AS instructor_last_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN courses c ON c.id = p.course_id
      LEFT JOIN users iu ON iu.id = c.instructor_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ${perPage} OFFSET ${offset};
      `,
    )) as Array<{
      id: number;
      user_id: number;
      course_id: number;
      amount: string;
      currency: string;
      status: string;
      payment_method: string | null;
      created_at: Date;
      updated_at: Date;
      user_email: string | null;
      user_first_name: string | null;
      user_last_name: string | null;
      user_phone: string | null;
      course_title: string | null;
      course_thumbnail: string | null;
      course_difficulty_level: string | null;
      course_duration_hours: number | null;
      instructor_first_name: string | null;
      instructor_last_name: string | null;
    }>;

    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
      payments: rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        course_id: r.course_id,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        payment_method: r.payment_method,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
        user_email: r.user_email,
        course_title: r.course_title,
        user: {
          first_name: r.user_first_name,
          last_name: r.user_last_name,
          email: r.user_email,
          phone: r.user_phone,
        },
        course: {
          title: r.course_title,
          thumbnail: r.course_thumbnail,
          difficulty_level: r.course_difficulty_level,
          duration_hours: r.course_duration_hours,
          instructor_name: `${r.instructor_first_name ?? ""} ${r.instructor_last_name ?? ""}`.trim() || null,
        },
      })),
      pagination: {
        page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
        // Legacy pagination keys (used by legacy UI clones)
        total,
        pages: totalPages,
        has_next: page * perPage < total,
        has_prev: page > 1,
      },
    };
  } catch {
    // If payments table is not yet present in the target DB, keep endpoint stable.
    return {
      payments: [],
      pagination: {
        page: 1,
        per_page: perPage,
        total_items: 0,
        total_pages: 1,
        total: 0,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    };
  }
}
