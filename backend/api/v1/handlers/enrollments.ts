/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@backend/lib/prisma";
import { requireDbUser } from "@backend/lib/auth";
import { toCourseBaseDict, toEnrollmentDict } from "./utils";

export async function getEnrollments() {
  const dbUser = await requireDbUser();

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: dbUser.id, isActive: true },
    orderBy: { enrolledAt: "desc" },
    include: { course: { include: { instructor: true, enrollments: true } } },
  });

  const enrollment_data = enrollments.map((e: any) => {
    const course = e.course;
    const courseData = toCourseBaseDict(course as any, course.enrollments.length);
    return {
      ...courseData,
      enrollment: toEnrollmentDict(e),
    };
  });

  return { enrollments: enrollment_data };
}

export async function enrollFree(body: any) {
  const dbUser = await requireDbUser();

  const course_id = body?.course_id ?? body?.courseId ?? body?.course;
  const courseId = typeof course_id === "number" ? course_id : Number(course_id);
  if (!Number.isFinite(courseId)) {
    return { status: 400, json: { error: "course_id is required" } } as const;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true },
  });
  if (!course) return { status: 404, json: { error: "Course not found" } } as const;
  if (course.status !== "published") {
    return {
      status: 400,
      json: { error: "Course is not available for enrollment" },
    } as const;
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: dbUser.id, courseId } },
  });

  if (existing) {
    if (existing.isActive) {
      return { status: 409, json: { error: "Already enrolled in this course" } } as const;
    }

    const updated = await prisma.enrollment.update({
      where: { id: existing.id },
      data: { isActive: true },
    });

    return {
      status: 200,
      json: {
        message: "Successfully re-enrolled in course",
        enrollment: toEnrollmentDict(updated),
      },
    } as const;
  }

  const created = await prisma.enrollment.create({
    data: {
      userId: dbUser.id,
      courseId,
      isActive: true,
    },
  });

  return {
    status: 201,
    json: {
      message: "Successfully enrolled in course",
      enrollment: toEnrollmentDict(created),
    },
  } as const;
}

export async function getCourseProgress(courseId: number) {
  const dbUser = await requireDbUser();
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: dbUser.id, courseId, isActive: true },
  });

  if (!enrollment) {
    return { status: 404, json: { error: "Not enrolled in this course" } } as const;
  }

  const lessonProgress = await prisma.lessonProgress.findMany({
    where: { enrollmentId: enrollment.id },
    orderBy: { lessonId: "asc" },
  });

  return {
    course_id: courseId,
    enrollment: toEnrollmentDict(enrollment),
    lesson_progress: lessonProgress.map((lp: any) => ({
      lesson_id: lp.lessonId,
      completed: lp.completed,
      completed_at: lp.completedAt ? lp.completedAt.toISOString() : null,
      watch_time_seconds: lp.watchTimeSeconds,
    })),
  };
}

export async function updateLessonProgress(courseId: number, lessonId: number, body: any) {
  const dbUser = await requireDbUser();
  const data = body ?? {};

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: dbUser.id, courseId, isActive: true },
  });
  if (!enrollment) {
    return { status: 404, json: { error: "Not enrolled in this course" } } as const;
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return { status: 404, json: { error: "Lesson not found" } } as const;
  }

  const lp = await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
    },
    update: {
      ...(typeof data.completed === "boolean"
        ? {
            completed: data.completed,
            completedAt: data.completed ? new Date() : null,
          }
        : {}),
      ...(typeof data.watch_time_seconds === "number"
        ? { watchTimeSeconds: data.watch_time_seconds }
        : {}),
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId,
      completed: !!data.completed,
      completedAt: data.completed ? new Date() : null,
      watchTimeSeconds: typeof data.watch_time_seconds === "number" ? data.watch_time_seconds : 0,
    },
  });

  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lessonProgress.count({ where: { enrollmentId: enrollment.id } }),
    prisma.lessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } }),
  ]);

  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercentage: progress,
      ...(progress === 100 && !enrollment.completedAt ? { completedAt: new Date() } : {}),
    },
  });

  return {
    message: "Lesson progress updated successfully",
    lesson_progress: {
      lesson_id: lp.lessonId,
      completed: lp.completed,
      completed_at: lp.completedAt ? lp.completedAt.toISOString() : null,
      watch_time_seconds: lp.watchTimeSeconds,
    },
    course_progress: updatedEnrollment.progressPercentage,
  };
}

