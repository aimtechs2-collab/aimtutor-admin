/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@backend/lib/prisma";
import { requireDbUser } from "@backend/lib/auth";
import { toCourseBaseDict, toEnrollmentDict, toUserDict } from "./utils";

export async function getDashboard() {
  const dbUser = await requireDbUser();

  // Active enrollments for totals and recent activity.
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: dbUser.id, isActive: true },
    orderBy: { enrolledAt: "desc" },
    include: { course: { include: { instructor: true, enrollments: true } } },
  });

  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completedAt !== null).length;
  const inProgressCourses = totalCourses - completedCourses;

  const recentEnrollments = enrollments.slice(0, 5);

  const recent_activity = recentEnrollments.map((e) => {
    const course = e.course;
    const courseData = toCourseBaseDict(course as any, course.enrollments.length);
    return {
      ...courseData,
      enrollment: toEnrollmentDict(e),
    };
  });

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      first_name: dbUser.firstName,
      last_name: dbUser.lastName,
      role: dbUser.role,
      is_active: dbUser.isActive,
      email_verified: dbUser.emailVerified,
      phone: dbUser.phone,
      profile_picture: dbUser.profilePicture,
      bio: dbUser.bio,
      created_at: dbUser.createdAt.toISOString(),
      updated_at: dbUser.updatedAt.toISOString(),
    },
    statistics: {
      total_courses: totalCourses,
      completed_courses: completedCourses,
      in_progress_courses: inProgressCourses,
      total_certificates: 0,
    },
    recent_activity,
    certificates: [],
    payments: [],
  };
}

export async function updateProfile(body: any) {
  const dbUser = await requireDbUser();
  const data = body ?? {};

  const update: any = {};
  if (typeof data.first_name === "string") update.firstName = data.first_name;
  if (typeof data.last_name === "string") update.lastName = data.last_name;
  if (typeof data.phone === "string") update.phone = data.phone;
  if (typeof data.bio === "string" || data.bio === null) update.bio = data.bio;
  if (typeof data.profile_picture === "string") update.profilePicture = data.profile_picture;

  if (typeof data.email === "string" && data.email.trim().length) {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email, id: { not: dbUser.id } },
    });
    if (existing) {
      return { status: 409, json: { error: "Email already taken" } } as const;
    }
    update.email = email;
    update.emailVerified = false;
  }

  const user = await prisma.user.update({
    where: { id: dbUser.id },
    data: update,
  });

  return {
    message: "Profile updated successfully",
    user: toUserDict(user),
  };
}

