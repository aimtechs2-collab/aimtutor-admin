import type { CourseStatus, Prisma } from "@prisma/client";
import { requireDbUser } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { invalidateCachePattern } from "@/lib/redis";

async function ensureAdmin() {
  const me = await requireDbUser();
  if (me.role !== "admin") {
    return { status: 403, json: { error: "Admin access required" } } as const;
  }
  return null;
}

async function ensureAdminOrInstructor() {
  const me = await requireDbUser();
  if (me.role !== "admin" && me.role !== "instructor") {
    return { status: 403, json: { error: "Admin or instructor access required" } } as const;
  }
  return null;
}

export async function createMasterCategory(body: Record<string, unknown>) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const name = String(body?.name ?? "").trim();
  if (!name) return { status: 400, json: { error: "name is required" } } as const;

  const created = await prisma.masterCategory.create({ data: { name } });
  await invalidateCachePattern("public:mastercategories*");
  return { message: "Master category created", category: created };
}

export async function updateMasterCategory(id: number, body: Record<string, unknown>) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const name = String(body.name ?? "").trim();
  if (!name) return { status: 400, json: { error: "name is required" } } as const;

  const updated = await prisma.masterCategory.update({ where: { id }, data: { name } });
  await invalidateCachePattern("public:mastercategories*");
  await invalidateCachePattern(`public:mastercategory:${id}*`);
  return { message: "Master category updated", category: updated };
}

export async function deleteMasterCategory(id: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  await prisma.masterCategory.delete({ where: { id } });
  await invalidateCachePattern("public:mastercategories*");
  await invalidateCachePattern(`public:mastercategory:${id}*`);
  return { message: "Master category deleted" };
}

export async function createSubcategory(body: Record<string, unknown>) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const name = String(body?.name ?? "").trim();
  const masterCategoryId = Number(body?.master_category_id);
  if (!name || !Number.isFinite(masterCategoryId)) {
    return { status: 400, json: { error: "name and master_category_id are required" } } as const;
  }

  const created = await prisma.subCategory.create({
    data: { name, masterCategoryId },
  });
  await invalidateCachePattern("public:subcategories*");
  await invalidateCachePattern("public:mastercategories*");
  // Must match keys in public.ts getMastercategoryById: `public:mastercategory:${id}:crs=*`
  await invalidateCachePattern(`public:mastercategory:${masterCategoryId}*`);
  return { message: "Subcategory created", subcategory: created };
}

export async function updateSubcategory(id: number, body: Record<string, unknown>) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const data: Prisma.SubCategoryUncheckedUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.master_category_id !== undefined) data.masterCategoryId = Number(body.master_category_id);
  const existing = await prisma.subCategory.findUnique({ where: { id } });
  const updated = await prisma.subCategory.update({ where: { id }, data });
  await invalidateCachePattern("public:subcategories*");
  await invalidateCachePattern(`public:subcategory:${id}*`);
  await invalidateCachePattern("public:mastercategories*");
  if (existing?.masterCategoryId) {
    await invalidateCachePattern(`public:mastercategory:${existing.masterCategoryId}*`);
  }
  if (updated.masterCategoryId !== existing?.masterCategoryId) {
    await invalidateCachePattern(`public:mastercategory:${updated.masterCategoryId}*`);
  }
  return { message: "Subcategory updated", subcategory: updated };
}

export async function deleteSubcategory(id: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const existing = await prisma.subCategory.findUnique({ where: { id } });
  await prisma.subCategory.delete({ where: { id } });
  await invalidateCachePattern("public:subcategories*");
  await invalidateCachePattern(`public:subcategory:${id}*`);
  await invalidateCachePattern("public:mastercategories*");
  if (existing?.masterCategoryId) {
    await invalidateCachePattern(`public:mastercategory:${existing.masterCategoryId}*`);
  }
  return { message: "Subcategory deleted" };
}

export async function createCourse(body: Record<string, unknown>) {
  const forbidden = await ensureAdminOrInstructor();
  if (forbidden) return forbidden;

  const me = await requireDbUser();
  const title = String(body.title ?? "").trim();
  let instructorId = Number(body.instructor_id);
  if (!Number.isFinite(instructorId)) {
    instructorId = me.id;
  }
  if (me.role === "instructor" && instructorId !== me.id) {
    return { status: 403, json: { error: "Instructors can only assign themselves as instructor" } } as const;
  }
  const price = Number(body.price ?? 0);

  if (!title) {
    return { status: 400, json: { error: "title is required" } } as const;
  }

  const subRaw = body.subcategory_id;
  const subcategoryId =
    subRaw === undefined || subRaw === null || subRaw === "" || !Number.isFinite(Number(subRaw))
      ? null
      : Number(subRaw);

  let status: CourseStatus = "draft";
  if (body.status === "published") status = "published";
  else if (body.status === "archived") status = "draft";

  const created = await prisma.course.create({
    data: {
      title,
      description: typeof body.description === "string" ? body.description : null,
      shortDescription: typeof body.short_description === "string" ? body.short_description : null,
      subcategoryId,
      instructorId,
      price,
      currency: typeof body.currency === "string" ? body.currency : "USD",
      durationHours: Number.isFinite(Number(body.duration_hours)) ? Number(body.duration_hours) : null,
      difficultyLevel: typeof body.difficulty_level === "string" ? body.difficulty_level : null,
      thumbnail: typeof body.thumbnail === "string" ? body.thumbnail : null,
      status,
      maxStudents: Number.isFinite(Number(body.max_students)) ? Number(body.max_students) : null,
      prerequisites: typeof body.prerequisites === "string" ? body.prerequisites : null,
      learningOutcomes: typeof body.learning_outcomes === "string" ? body.learning_outcomes : null,
    },
  });

  await invalidateCachePattern("public:courses*");
  await invalidateCachePattern("public:subcategories*");
  await invalidateCachePattern("public:mastercategories*");
  if (subcategoryId != null) {
    await invalidateCachePattern(`public:subcategory:${subcategoryId}*`);
    const sub = await prisma.subCategory.findUnique({
      where: { id: subcategoryId },
      select: { masterCategoryId: true },
    });
    if (sub) await invalidateCachePattern(`public:mastercategory:${sub.masterCategoryId}*`);
  }
  return { message: "Course created", course: created };
}

export async function updateCourse(id: number, body: Record<string, unknown>) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const existing = await prisma.course.findUnique({
    where: { id },
    select: { subcategoryId: true },
  });
  if (!existing) {
    return { status: 404, json: { error: "Course not found" } } as const;
  }
  const data: Prisma.CourseUncheckedUpdateInput = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.description === "string" || body.description === null) data.description = body.description;
  if (typeof body.short_description === "string" || body.short_description === null)
    data.shortDescription = body.short_description;
  if (body.subcategory_id !== undefined) data.subcategoryId = body.subcategory_id === null ? null : Number(body.subcategory_id);
  if (body.instructor_id !== undefined) data.instructorId = Number(body.instructor_id);
  if (body.price !== undefined) data.price = Number(body.price);
  if (typeof body.currency === "string") data.currency = body.currency;
  if (body.duration_hours !== undefined) data.durationHours = body.duration_hours === null ? null : Number(body.duration_hours);
  if (typeof body.difficulty_level === "string" || body.difficulty_level === null) data.difficultyLevel = body.difficulty_level;
  if (typeof body.thumbnail === "string" || body.thumbnail === null) data.thumbnail = body.thumbnail;
  if (body.status === "draft" || body.status === "published") data.status = body.status;
  else if (body.status === "archived") data.status = "draft";
  if (body.max_students !== undefined) data.maxStudents = body.max_students === null ? null : Number(body.max_students);
  if (typeof body.prerequisites === "string" || body.prerequisites === null) data.prerequisites = body.prerequisites;
  if (typeof body.learning_outcomes === "string" || body.learning_outcomes === null) data.learningOutcomes = body.learning_outcomes;

  const updated = await prisma.course.update({ where: { id }, data });

  await invalidateCachePattern("public:courses*");
  await invalidateCachePattern(`public:course:${id}*`);
  await invalidateCachePattern("public:subcategories*");
  await invalidateCachePattern("public:mastercategories*");

  const oldSub = existing.subcategoryId;
  const newSub = updated.subcategoryId;
  if (oldSub != null) await invalidateCachePattern(`public:subcategory:${oldSub}*`);
  if (newSub != null && newSub !== oldSub) await invalidateCachePattern(`public:subcategory:${newSub}*`);

  const masterIds = new Set<number>();
  if (oldSub != null) {
    const s = await prisma.subCategory.findUnique({
      where: { id: oldSub },
      select: { masterCategoryId: true },
    });
    if (s) masterIds.add(s.masterCategoryId);
  }
  if (newSub != null) {
    const s = await prisma.subCategory.findUnique({
      where: { id: newSub },
      select: { masterCategoryId: true },
    });
    if (s) masterIds.add(s.masterCategoryId);
  }
  for (const mid of masterIds) {
    await invalidateCachePattern(`public:mastercategory:${mid}*`);
  }

  return { message: "Course updated", course: updated };
}

export async function deleteCourse(id: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const existing = await prisma.course.findUnique({
    where: { id },
    select: { subcategoryId: true },
  });
  if (!existing) {
    return { status: 404, json: { error: "Course not found" } } as const;
  }
  await prisma.course.delete({ where: { id } });

  await invalidateCachePattern("public:courses*");
  await invalidateCachePattern(`public:course:${id}*`);
  await invalidateCachePattern("public:subcategories*");
  await invalidateCachePattern("public:mastercategories*");
  if (existing.subcategoryId != null) {
    await invalidateCachePattern(`public:subcategory:${existing.subcategoryId}*`);
    const sub = await prisma.subCategory.findUnique({
      where: { id: existing.subcategoryId },
      select: { masterCategoryId: true },
    });
    if (sub) await invalidateCachePattern(`public:mastercategory:${sub.masterCategoryId}*`);
  }

  return { message: "Course deleted" };
}
