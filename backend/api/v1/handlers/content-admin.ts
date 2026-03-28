import { requireDbUser } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { withDbRetry } from "@backend/lib/dbRetry";
import { invalidateCachePattern } from "@/lib/redis";

/** Fire-and-forget: Redis SCAN can take seconds; blocking the HTTP response makes lesson creates look "stuck". */
function invalidateCourseCaches() {
  void Promise.all([
    invalidateCachePattern("public:courses*"),
    invalidateCachePattern("public:course:*"),
  ]).catch((err) => {
    console.warn("[invalidateCourseCaches]", err);
  });
}

async function ensureAdmin() {
  const me = await requireDbUser();
  if (me.role !== "admin") return { status: 403, json: { error: "Admin access required" } } as const;
  return null;
}

export async function createModule(courseId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const title = String(body?.title ?? "").trim();
  if (!title) return { status: 400, json: { error: "title is required" } } as const;
  const created = await prisma.courseModule.create({
    data: {
      courseId,
      title,
      description: body?.description ?? null,
      durationMinutes: Number.isFinite(Number(body?.duration_minutes)) ? Number(body.duration_minutes) : null,
      sortOrder: Number.isFinite(Number(body?.order)) ? Number(body.order) : 1,
      isPreview: Boolean(body?.is_preview ?? false),
    },
  });
  invalidateCourseCaches();
  return { message: "Module created successfully", module: created };
}

export async function getModules(searchParams: URLSearchParams) {
  const courseId = Number(searchParams.get("course_id"));
  const where = Number.isFinite(courseId) ? { courseId } : undefined;
  const modules = await prisma.courseModule.findMany({ where, orderBy: { sortOrder: "asc" } });
  return { modules };
}

export async function getModuleById(moduleId: number) {
  const moduleItem = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!moduleItem) return { status: 404, json: { error: "Module not found" } } as const;
  return { module: moduleItem };
}

export async function updateModule(moduleId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const data: any = {};
  if (body?.title !== undefined) data.title = body.title;
  if (body?.description !== undefined) data.description = body.description;
  if (body?.duration_minutes !== undefined) data.durationMinutes = body.duration_minutes === null ? null : Number(body.duration_minutes);
  if (body?.order !== undefined) data.sortOrder = Number(body.order);
  if (body?.is_preview !== undefined) data.isPreview = Boolean(body.is_preview);
  const updated = await prisma.courseModule.update({ where: { id: moduleId }, data });
  invalidateCourseCaches();
  return { message: "Module updated successfully", module: updated };
}

export async function deleteModule(moduleId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  await prisma.courseModule.delete({ where: { id: moduleId } });
  invalidateCourseCaches();
  return { message: "Module deleted successfully" };
}

export async function createLesson(moduleId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const title = String(body?.title ?? "").trim();
  if (!title) return { status: 400, json: { error: "title is required" } } as const;
  const created = await prisma.lesson.create({
    data: {
      moduleId,
      title,
      content: body?.content ?? null,
      videoUrl: body?.video_url ?? null,
      resourceLink: body?.resource_link ?? null,
      durationMinutes: Number.isFinite(Number(body?.duration_minutes)) ? Number(body.duration_minutes) : null,
      sortOrder: Number.isFinite(Number(body?.order)) ? Number(body.order) : 1,
      isPreview: Boolean(body?.is_preview ?? false),
    },
  });
  invalidateCourseCaches();
  return { message: "Lesson created successfully", lesson: created };
}

export async function getLessons(searchParams: URLSearchParams) {
  const moduleId = Number(searchParams.get("module_id"));
  const where = Number.isFinite(moduleId) ? { moduleId } : undefined;
  const lessons = await withDbRetry(() =>
    prisma.lesson.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: { resources: true },
    }),
  );
  return { lessons };
}

export async function getLessonById(lessonId: number) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return { status: 404, json: { error: "Lesson not found" } } as const;
  return { lesson };
}

export async function updateLesson(lessonId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const data: any = {};
  if (body?.title !== undefined) data.title = body.title;
  if (body?.content !== undefined) data.content = body.content;
  if (body?.video_url !== undefined) data.videoUrl = body.video_url;
  if (body?.resource_link !== undefined) data.resourceLink = body.resource_link;
  if (body?.duration_minutes !== undefined) data.durationMinutes = body.duration_minutes === null ? null : Number(body.duration_minutes);
  if (body?.order !== undefined) data.sortOrder = Number(body.order);
  if (body?.is_preview !== undefined) data.isPreview = Boolean(body.is_preview);
  const updated = await prisma.lesson.update({ where: { id: lessonId }, data });
  invalidateCourseCaches();
  return { message: "Lesson updated successfully", lesson: updated };
}

export async function deleteLesson(lessonId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  await prisma.lesson.delete({ where: { id: lessonId } });
  invalidateCourseCaches();
  return { message: "Lesson deleted successfully" };
}

export async function createLessonResource(lessonId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const title = String(body?.title ?? "").trim();
  const filePath = String(body?.file_path ?? "").trim();
  if (!title || !filePath) return { status: 400, json: { error: "title and file_path are required" } } as const;
  const created = await prisma.lessonResource.create({
    data: {
      lessonId,
      title,
      filePath,
      fileType: body?.file_type ?? null,
      fileSize: Number.isFinite(Number(body?.file_size)) ? Number(body.file_size) : null,
      durationMinutes: Number.isFinite(Number(body?.duration_minutes)) ? Number(body.duration_minutes) : null,
      isActive: body?.is_active === undefined ? false : Boolean(body.is_active),
    },
  });
  invalidateCourseCaches();
  return { message: "Lesson resource created successfully", resource: created };
}

export async function getLessonResources(searchParams: URLSearchParams) {
  const lessonId = Number(searchParams.get("lesson_id"));
  const where = Number.isFinite(lessonId) ? { lessonId } : undefined;
  const resources = await prisma.lessonResource.findMany({ where, orderBy: { createdAt: "desc" } });
  return { resources };
}

export async function getLessonResourceById(resourceId: number) {
  const resource = await prisma.lessonResource.findUnique({ where: { id: resourceId } });
  if (!resource) return { status: 404, json: { error: "Lesson resource not found" } } as const;
  return { resource };
}

export async function updateLessonResource(resourceId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const data: any = {};
  if (body?.title !== undefined) data.title = body.title;
  if (body?.file_path !== undefined) data.filePath = body.file_path;
  if (body?.file_type !== undefined) data.fileType = body.file_type;
  if (body?.file_size !== undefined) data.fileSize = body.file_size === null ? null : Number(body.file_size);
  if (body?.duration_minutes !== undefined) data.durationMinutes = body.duration_minutes === null ? null : Number(body.duration_minutes);
  if (body?.is_active !== undefined) data.isActive = Boolean(body.is_active);
  const updated = await prisma.lessonResource.update({ where: { id: resourceId }, data });
  invalidateCourseCaches();
  return { message: "Lesson resource updated successfully", resource: updated };
}

export async function deleteLessonResource(resourceId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  await prisma.lessonResource.delete({ where: { id: resourceId } });
  invalidateCourseCaches();
  return { message: "Lesson resource deleted successfully" };
}

export async function createPrerequisite(courseId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return { status: 400, json: { error: "Invalid course id", message: "Invalid course id" } } as const;
  }

  // Legacy UI sends either:
  // - { prerequisite_course_ids: number[] }
  // - or a single { prerequisite_course_id } / { prereq_id }
  const prereqIdsRaw = Array.isArray(body?.prerequisite_course_ids)
    ? body.prerequisite_course_ids
    : body?.prerequisite_course_id != null
      ? [body.prerequisite_course_id]
      : body?.prereq_id != null
        ? [body.prereq_id]
        : [];

  const prereqIds = prereqIdsRaw
    .map((v: any) => Number(v))
    .filter((id: number) => Number.isFinite(id) && id > 0 && id !== courseId);

  if (!prereqIds.length) {
    return {
      status: 400,
      json: { error: "prerequisite_course_ids is required", message: "Select at least one prerequisite course" },
    } as const;
  }

  const host = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!host) {
    return { status: 404, json: { error: "Course not found", message: "Course not found" } } as const;
  }

  const existingTargets = await prisma.course.findMany({
    where: { id: { in: prereqIds } },
    select: { id: true },
  });
  const validIds = prereqIds.filter((id) => existingTargets.some((c) => c.id === id));
  if (!validIds.length) {
    return {
      status: 400,
      json: { error: "Invalid prerequisite ids", message: "No matching prerequisite courses found" },
    } as const;
  }

  try {
    await prisma.coursePrerequisite.createMany({
      data: validIds.map((prerequisiteCourseId) => ({ courseId, prerequisiteCourseId })),
      skipDuplicates: true,
    });
    invalidateCourseCaches();
    return { message: "Prerequisites added successfully" };
  } catch (e: unknown) {
    console.error("[createPrerequisite]", e);
    return { status: 500, json: { error: "Failed to add prerequisites", message: "Failed to add prerequisites" } } as const;
  }
}

export async function getPrerequisites(courseId: number) {
  try {
    const rows = await prisma.coursePrerequisite.findMany({
      where: { courseId },
      include: {
        prerequisiteCourse: {
          include: {
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      prerequisites: rows.map((row) => {
        const c = row.prerequisiteCourse;
        const u = c.instructor;
        return {
          id: row.id,
          course_id: row.courseId,
          prerequisite_course_id: row.prerequisiteCourseId,
          created_at: row.createdAt,
          prerequisite_course: {
            id: c.id,
            title: c.title,
            difficulty_level: c.difficultyLevel,
            status: c.status,
            price: c.price != null ? Number(c.price) : null,
            instructor_name:
              u && (u.firstName || u.lastName)
                ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                : null,
          },
        };
      }),
    };
  } catch (e: unknown) {
    console.error("[getPrerequisites]", e);
    return { prerequisites: [] };
  }
}

export async function deletePrerequisiteById(prereqRowId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    await prisma.coursePrerequisite.delete({ where: { id: prereqRowId } });
    invalidateCourseCaches();
    return { message: "Prerequisite removed successfully" };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return { status: 404, json: { error: "Prerequisite not found", message: "Prerequisite not found" } } as const;
    }
    console.error("[deletePrerequisiteById]", e);
    return { status: 500, json: { error: "Failed to remove prerequisite", message: "Failed to remove prerequisite" } } as const;
  }
}

export async function deletePrerequisite(courseId: number, prereqId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const res = await prisma.coursePrerequisite.deleteMany({
      where: { courseId, prerequisiteCourseId: prereqId },
    });
    if (res.count === 0) {
      return { status: 404, json: { error: "Prerequisite not found", message: "Prerequisite not found" } } as const;
    }
    invalidateCourseCaches();
    return { message: "Prerequisite removed successfully" };
  } catch (e: unknown) {
    console.error("[deletePrerequisite]", e);
    return { status: 500, json: { error: "Failed to remove prerequisite", message: "Failed to remove prerequisite" } } as const;
  }
}

export async function updatePrerequisite(courseId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const oldPrereqId = Number(body?.old_prerequisite_course_id);
  const newPrereqId = Number(body?.new_prerequisite_course_id);
  if (!Number.isFinite(oldPrereqId) || !Number.isFinite(newPrereqId)) {
    return { status: 400, json: { error: "old_prerequisite_course_id and new_prerequisite_course_id are required" } } as const;
  }
  if (newPrereqId === courseId) {
    return { status: 400, json: { error: "A course cannot be its own prerequisite" } } as const;
  }
  try {
    const target = await prisma.course.findUnique({ where: { id: newPrereqId }, select: { id: true } });
    if (!target) {
      return { status: 400, json: { error: "New prerequisite course not found" } } as const;
    }
    const updated = await prisma.coursePrerequisite.updateMany({
      where: { courseId, prerequisiteCourseId: oldPrereqId },
      data: { prerequisiteCourseId: newPrereqId },
    });
    if (updated.count === 0) {
      return { status: 404, json: { error: "Prerequisite link not found" } } as const;
    }
    invalidateCourseCaches();
    return { message: "Prerequisite updated successfully" };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return { status: 409, json: { error: "That prerequisite is already set for this course" } } as const;
    }
    console.error("[updatePrerequisite]", e);
    return { status: 500, json: { error: "Failed to update prerequisite" } } as const;
  }
}

function contactFormToLegacy(row: {
  id: number;
  name: string;
  email: string;
  message: string | null;
  courseInterest: string | null;
  phoneNumber: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone_number: row.phoneNumber,
    message: row.message,
    course_interest: row.courseInterest,
    created_at: row.createdAt.toISOString(),
  };
}

export async function createContactForm(body: any) {
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const phone = String(body?.phone_number ?? "").trim();
  if (!name || !email || !phone) return { status: 400, json: { error: "name, email, and phone_number are required" } } as const;
  try {
    const row = await prisma.contactForm.create({
      data: {
        name,
        email,
        phoneNumber: phone,
        message: body?.message != null ? String(body.message) : null,
        courseInterest: body?.course_interest != null ? String(body.course_interest) : null,
      },
    });
    return { message: "Contact form submitted successfully", contact_form: contactFormToLegacy(row) };
  } catch {
    return { status: 500, json: { error: "Failed to submit contact form" } } as const;
  }
}

export async function getContactForms() {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const forms = await prisma.contactForm.findMany({ orderBy: { createdAt: "desc" } });
    return { contact_forms: forms.map(contactFormToLegacy) };
  } catch {
    return { contact_forms: [] };
  }
}

export async function getContactForm(formId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const row = await prisma.contactForm.findUnique({ where: { id: formId } });
    if (!row) return { status: 404, json: { error: "Contact form not found" } } as const;
    return { contact_form: contactFormToLegacy(row) };
  } catch {
    return { status: 500, json: { error: "Failed to fetch contact form" } } as const;
  }
}

export async function updateContactForm(formId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const existing = await prisma.contactForm.findUnique({ where: { id: formId } });
    if (!existing) return { status: 404, json: { error: "Contact form not found" } } as const;
    const row = await prisma.contactForm.update({
      where: { id: formId },
      data: {
        ...(typeof body?.name === "string" ? { name: body.name } : {}),
        ...(typeof body?.email === "string" ? { email: body.email } : {}),
        ...(typeof body?.phone_number === "string" ? { phoneNumber: body.phone_number } : {}),
        ...(body?.message !== undefined ? { message: body.message == null ? null : String(body.message) } : {}),
        ...(body?.course_interest !== undefined
          ? { courseInterest: body.course_interest == null ? null : String(body.course_interest) }
          : {}),
      },
    });
    return { message: "Contact form updated successfully", contact_form: contactFormToLegacy(row) };
  } catch {
    return { status: 500, json: { error: "Failed to update contact form" } } as const;
  }
}

export async function deleteContactForm(formId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    await prisma.contactForm.delete({ where: { id: formId } });
    return { message: "Contact form deleted successfully" };
  } catch {
    return { status: 404, json: { error: "Contact form not found" } } as const;
  }
}
