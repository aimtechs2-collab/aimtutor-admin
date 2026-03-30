/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireDbUser } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { toCourseBaseDict, toNotificationDict, toUserDict } from "./utils";

async function ensureAdmin() {
  const me = await requireDbUser();
  if (me.role !== "admin") return { status: 403, json: { error: "Admin access required" } } as const;
  return null;
}

export async function getProfile() {
  const me = await requireDbUser();
  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return { status: 404, json: { error: "User not found" } } as const;
  return { user: toUserDict(user) };
}

export async function getUserCertificatesCompat() {
  const me = await requireDbUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT c.*, co.title AS course_title
      FROM certificates c
      LEFT JOIN courses co ON co.id = c.course_id
      WHERE c.user_id = $1
      ORDER BY c.issued_at DESC
      `,
      me.id,
    )) as any[];
    return { certificates: rows };
  } catch {
    return { certificates: [] };
  }
}

export async function getMyCourses() {
  const me = await requireDbUser();
  const courses = await prisma.course.findMany({
    where: { instructorId: me.id },
    include: { instructor: true, enrollments: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    courses: courses.map((c: any) => toCourseBaseDict(c, c.enrollments.length)),
  };
}

export async function publishCourse(courseId: number) {
  const me = await requireDbUser();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { status: 404, json: { error: "Course not found" } } as const;
  if (me.role !== "admin" && course.instructorId !== me.id) {
    return { status: 403, json: { error: "Unauthorized" } } as const;
  }
  const updated = await prisma.course.update({ where: { id: courseId }, data: { status: "published" } });
  return { message: "Course published", course: updated };
}

export async function getCourseEnrollments(courseId: number) {
  const me = await requireDbUser();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { status: 404, json: { error: "Course not found" } } as const;
  if (me.role !== "admin" && course.instructorId !== me.id) {
    return { status: 403, json: { error: "Unauthorized" } } as const;
  }
  const rows = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: true },
    orderBy: { enrolledAt: "desc" },
  });
  return {
    enrollments: rows.map((r: any) => ({
      id: r.id,
      user_id: r.userId,
      course_id: r.courseId,
      enrolled_at: r.enrolledAt.toISOString(),
      completed_at: r.completedAt?.toISOString() ?? null,
      progress_percentage: r.progressPercentage,
      is_active: r.isActive,
      user: {
        id: r.user.id,
        email: r.user.email,
        first_name: r.user.firstName,
        last_name: r.user.lastName,
      },
    })),
  };
}

export async function uploadFileCompat(body: any) {
  await requireDbUser();
  return {
    message: "Upload endpoint compatibility mode",
    file_path: body?.file_path ?? null,
    file_type: body?.file_type ?? null,
    file_size: body?.file_size ?? null,
  };
}

export async function downloadResourceCompat(resourceId: number) {
  await requireDbUser();
  const resource = await prisma.lessonResource.findUnique({ where: { id: resourceId } });
  if (!resource) return { status: 404, json: { error: "Resource not found" } } as const;
  return {
    resource_id: resource.id,
    file_path: resource.filePath,
    file_type: resource.fileType,
    file_size: resource.fileSize,
  };
}

export async function uploadCourseThumbnailCompat(body: any) {
  const me = await requireDbUser();
  const courseId = Number(body?.course_id);
  const thumbnail = String(body?.thumbnail ?? body?.file_path ?? "").trim();
  if (!Number.isFinite(courseId) || !thumbnail) return { status: 400, json: { error: "course_id and thumbnail are required" } } as const;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { status: 404, json: { error: "Course not found" } } as const;
  if (me.role !== "admin" && course.instructorId !== me.id) return { status: 403, json: { error: "Unauthorized" } } as const;
  const updated = await prisma.course.update({ where: { id: courseId }, data: { thumbnail } });
  return { message: "Thumbnail updated", course: updated };
}

export async function uploadProfilePictureCompat(body: any) {
  const me = await requireDbUser();
  const profilePicture = String(body?.profile_picture ?? body?.file_path ?? "").trim();
  if (!profilePicture) return { status: 400, json: { error: "profile_picture is required" } } as const;
  const updated = await prisma.user.update({ where: { id: me.id }, data: { profilePicture } });
  return { message: "Profile picture updated", user: toUserDict(updated) };
}

export async function lessonResourcesByLessonCompat(lessonId: number) {
  await requireDbUser();
  const resources = await prisma.lessonResource.findMany({ where: { lessonId }, orderBy: { createdAt: "desc" } });
  return { resources };
}

export async function deleteResourceCompat(resourceId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  await prisma.lessonResource.delete({ where: { id: resourceId } });
  return { message: "Resource deleted successfully" };
}

export async function sendNotification(body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const userId = Number(body?.user_id);
  const title = String(body?.title ?? "").trim();
  const message = String(body?.message ?? "").trim();
  if (!Number.isFinite(userId) || !title || !message) {
    return { status: 400, json: { error: "user_id, title and message are required" } } as const;
  }
  const created = await prisma.notification.create({
    data: { userId, title, message, type: body?.type ?? null, isRead: false },
  });
  return { message: "Notification sent", notification: toNotificationDict(created) };
}

export async function broadcastNotification(body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const title = String(body?.title ?? "").trim();
  const message = String(body?.message ?? "").trim();
  if (!title || !message) return { status: 400, json: { error: "title and message are required" } } as const;
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  if (!users.length) return { message: "Broadcast completed", sent: 0 };
  const created = await prisma.notification.createMany({
    data: users.map((u: any) => ({
      userId: u.id,
      title,
      message,
      type: body?.type ?? "broadcast",
      isRead: false,
    })),
  });
  return { message: "Broadcast completed", sent: created.count };
}

export async function getNotificationSettings() {
  await requireDbUser();
  return {
    settings: {
      email_notifications: true,
      push_notifications: true,
      marketing_notifications: false,
      course_updates: true,
      live_session_reminders: true,
    },
  };
}

export async function updateNotificationSettings(body: any) {
  await requireDbUser();
  return {
    message: "Notification settings updated",
    settings: {
      email_notifications: body?.email_notifications ?? true,
      push_notifications: body?.push_notifications ?? true,
      marketing_notifications: body?.marketing_notifications ?? false,
      course_updates: body?.course_updates ?? true,
      live_session_reminders: body?.live_session_reminders ?? true,
    },
  };
}

export async function sendCourseNotification(body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const courseId = Number(body?.course_id);
  const title = String(body?.title ?? "").trim();
  const message = String(body?.message ?? "").trim();
  if (!Number.isFinite(courseId) || !title || !message) {
    return { status: 400, json: { error: "course_id, title and message are required" } } as const;
  }
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, isActive: true },
    select: { userId: true },
  });
  if (!enrollments.length) return { message: "No active learners for this course", sent: 0 };
  const created = await prisma.notification.createMany({
    data: enrollments.map((e: any) => ({
      userId: e.userId,
      title,
      message,
      type: "course_update",
      isRead: false,
    })),
  });
  return { message: "Course notification sent", sent: created.count };
}

export async function authCompat(path: string, body: any) {
  // Clerk-first compatibility responses for legacy endpoints.
  if (path === "me") {
    const me = await requireDbUser();
    return {
      user: {
        id: me.id,
        email: me.email,
        first_name: me.firstName,
        last_name: me.lastName,
        role: me.role,
      },
    };
  }

  if (path === "logout") return { message: "Handled by Clerk session sign-out on frontend" };
  if (path === "refresh") return { message: "Handled by Clerk session token rotation" };
  if (path === "login" || path === "register" || path === "google") {
    return {
      message: "Use Clerk auth flow",
      clerk_required: true,
      endpoint: `/auth/${path}`,
    };
  }

  if (path === "verify-otp" || path === "resend-otp" || path === "send-token" || path === "reset-password" || path === "set-password" || path === "change-password") {
    return {
      message: "Use Clerk verification/password reset flow",
      clerk_required: true,
      payload: body ?? {},
    };
  }

  return { status: 404, json: { error: "Auth endpoint not found" } } as const;
}
