import type { Course, Enrollment, Lesson, LessonResource, Notification, User } from "@prisma/client";

export function toUserDict(u: User) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.firstName,
    last_name: u.lastName,
    role: u.role,
    is_active: u.isActive,
    email_verified: u.emailVerified,
    phone: u.phone,
    profile_picture: u.profilePicture,
    bio: u.bio,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
}

export function toEnrollmentDict(e: Enrollment) {
  return {
    id: e.id,
    user_id: e.userId,
    course_id: e.courseId,
    enrolled_at: e.enrolledAt.toISOString(),
    completed_at: e.completedAt ? e.completedAt.toISOString() : null,
    progress_percentage: e.progressPercentage,
    is_active: e.isActive,
  };
}

export function toCourseBaseDict(
  c: Course & { instructor?: Pick<User, "firstName" | "lastName" | "id"> },
  enrollmentCount: number,
) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    short_description: c.shortDescription,
    instructor_id: c.instructorId,
    instructor_name: c.instructor
      ? `${c.instructor.firstName} ${c.instructor.lastName}`.trim()
      : "",
    price: Number(c.price),
    currency: c.currency,
    duration_hours: c.durationHours,
    difficulty_level: c.difficultyLevel,
    thumbnail: c.thumbnail,
    status: c.status,
    max_students: c.maxStudents,
    prerequisites: c.prerequisites,
    learning_outcomes: c.learningOutcomes,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    enrollment_count: enrollmentCount,
    prerequisites_courses: [],
  };
}

export function toLessonDict(l: Lesson & { resources?: LessonResource[] }, includeResources: boolean) {
  const dict: Record<string, unknown> = {
    id: l.id,
    module_id: l.moduleId,
    title: l.title,
    content: l.content,
    video_url: l.isPreview ? l.videoUrl : null,
    duration_minutes: l.durationMinutes,
    order: l.sortOrder,
    is_preview: l.isPreview,
    created_at: l.createdAt.toISOString(),
  };

  if (includeResources && l.resources) {
    dict.resources = l.resources.map((r) => toLessonResourceDict(r));
  }

  return dict;
}

export function toLessonResourceDict(r: LessonResource) {
  return {
    id: r.id,
    lesson_id: r.lessonId,
    title: r.title,
    duration_minutes: r.durationMinutes,
    file_path: r.filePath,
    file_type: r.fileType,
    file_size: r.fileSize,
    created_at: r.createdAt.toISOString(),
  };
}

export function toNotificationDict(n: Notification) {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    is_read: n.isRead,
    created_at: n.createdAt.toISOString(),
  };
}

