/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getAllSubcategories,
  getCourseById,
  getCoursesAll,
  getMastercategoryById,
  getMastercategoriesOnly,
  getSubcategoryById,
} from "@backend/api/v1/handlers/public";
import { getDashboard, updateProfile } from "@backend/api/v1/handlers/users";
import {
  enrollFree,
  getCourseProgress,
  getEnrollments,
  updateLessonProgress,
} from "@backend/api/v1/handlers/enrollments";
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markNotificationRead,
} from "@backend/api/v1/handlers/notifications";
import {
  deleteAdminUser,
  getAdminCourses,
  getAdminAnalytics,
  getAdminDashboard,
  getAdminEnrollments,
  getAdminPayments,
  getAdminUser,
  getAdminUsers,
  promoteInstructor,
  updateAdminUser,
  updateCourseStatus,
} from "@backend/api/v1/handlers/admin";
import {
  createCourse,
  createMasterCategory,
  createSubcategory,
  deleteCourse,
  deleteMasterCategory,
  deleteSubcategory,
  updateCourse,
  updateMasterCategory,
  updateSubcategory,
} from "@backend/api/v1/handlers/catalog-admin";
import {
  createContactForm,
  createLesson,
  createLessonResource,
  createModule,
  createPrerequisite,
  deleteContactForm,
  deleteLesson,
  deleteLessonResource,
  deleteModule,
  deletePrerequisite,
  deletePrerequisiteById,
  getContactForm,
  getContactForms,
  getLessonById,
  getLessonResourceById,
  getLessonResources,
  getLessons,
  getModuleById,
  getModules,
  getPrerequisites,
  updateContactForm,
  updateLesson,
  updateLessonResource,
  updateModule,
  updatePrerequisite,
} from "@backend/api/v1/handlers/content-admin";
import {
  bulkGenerateCertificatesAdmin,
  createCheckoutSession,
  createOrder,
  downloadCertificate,
  generateCertificate,
  getUserCertificates,
  getCourseCertificatesAdmin,
  getCourseLiveSessionsAdmin,
  createLiveSessionAdmin,
  deleteLiveSessionAdmin,
  getAllCertificatesAdmin,
  getLiveSessionAdmin,
  getLiveSessionsAdmin,
  getUpcomingLiveSessionsAdmin,
  getPaymentDetailsAdmin,
  getPaymentHistoryAdmin,
  joinLiveSession,
  paymentCancel,
  paymentSuccess,
  razorpayWebhook,
  regenerateCertificate,
  refundPaymentAdmin,
  stripeWebhook,
  updateLiveSessionAdmin,
  verifyPayment,
  verifyCertificate,
} from "@backend/api/v1/handlers/legacy-domains-admin";
import {
  authCompat,
  broadcastNotification,
  deleteResourceCompat,
  downloadResourceCompat,
  getCourseEnrollments,
  getMyCourses,
  getNotificationSettings,
  getProfile,
  getUserCertificatesCompat,
  lessonResourcesByLessonCompat,
  publishCourse,
  sendCourseNotification,
  sendNotification,
  updateNotificationSettings,
  uploadCourseThumbnailCompat,
  uploadFileCompat,
  uploadProfilePictureCompat,
} from "@backend/api/v1/handlers/compat-extra";
import { requireDbUser } from "@backend/lib/auth";
import { getJsonOrMultipartBody } from "../multipart-helpers";

type RouteParams = {
  path: string[];
};

function json(data: unknown, status?: unknown) {
  const safeStatus = typeof status === "number" ? status : 200;
  return NextResponse.json(data, { status: safeStatus });
}

function isErrorResponse(res: unknown): res is { status: number; json: unknown } {
  return (
    typeof res === "object" &&
    res !== null &&
    "status" in res &&
    typeof (res as { status?: unknown }).status === "number" &&
    "json" in res
  );
}

async function dispatch(
  req: Request,
  pathSegments: string[],
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body: any,
) {
  const joined = pathSegments.join("/");
  const searchParams = new URL(req.url).searchParams;

  try {
    // If a user is signed-in, we’ll map them to a DB user for "student" endpoints
    // and for enrollment-aware course details.
    const { userId } = await auth();
    let dbUserId: number | null = null;
    if (userId) {
      try {
        dbUserId = (await requireDbUser()).id;
      } catch {
        // Keep public and non-user-bound reads working even if Clerk->DB sync lags.
        dbUserId = null;
      }
    }

    // Public endpoints (student landing / geo pages)
    if (joined === "public/get-mastercategories" && method === "POST") {
      return json(await getMastercategoriesOnly(searchParams));
    }

    if (pathSegments[0] === "public" && pathSegments[1] === "get-mastercategories" && method === "POST") {
      const categoryId = Number(pathSegments[2]);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return json({ error: "Invalid category id" }, 400);
      }
      const res = await getMastercategoryById(categoryId, searchParams.get("courses"));
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Alias used by migrated Next student pages:
    // /api/v1/mastercategories/get-mastercategories/:id?courses=True
    if (pathSegments[0] === "mastercategories" && pathSegments[1] === "get-mastercategories" && method === "POST") {
      const categoryId = Number(pathSegments[2]);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return json({ error: "Invalid category id" }, 400);
      }
      const res = await getMastercategoryById(categoryId, searchParams.get("courses"));
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (joined === "public/get-subcategories" && method === "POST") {
      return json(await getAllSubcategories(searchParams));
    }

    if (joined === "subcategories/get-subcategories" && method === "POST") {
      return json(await getAllSubcategories(searchParams));
    }

    if (pathSegments[0] === "public" && pathSegments[1] === "get-subcategories" && method === "POST") {
      const subcategoryId = Number(pathSegments[2]);
      const res = await getSubcategoryById(subcategoryId);
      return res ? json(res) : json({ error: "Subcategory not found" }, 404);
    }

    if (pathSegments[0] === "subcategories" && pathSegments[1] === "get-subcategories" && method === "POST") {
      const subcategoryId = Number(pathSegments[2]);
      const res = await getSubcategoryById(subcategoryId);
      return res ? json(res) : json({ error: "Subcategory not found" }, 404);
    }

    if (joined === "public/get-courses" && method === "POST") {
      return json(await getCoursesAll(searchParams));
    }

    if (joined === "courses/get-courses" && method === "POST") {
      return json(await getCoursesAll(searchParams));
    }

    if (pathSegments[0] === "public" && pathSegments[1] === "get-courses" && method === "POST") {
      const courseId = Number(pathSegments[2]);
      const res = await getCourseById(courseId, searchParams, dbUserId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (pathSegments[0] === "courses" && pathSegments[1] === "get-courses" && method === "POST") {
      const courseId = Number(pathSegments[2]);
      const res = await getCourseById(courseId, searchParams, dbUserId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Student endpoints
    if (joined === "users/get-dashboard" && method === "GET") {
      return json(await getDashboard());
    }

    if (joined === "users/update-profile" && method === "PUT") {
      return json(await updateProfile(body));
    }
    if (joined === "users/get-profile" && method === "GET") {
      const res = await getProfile();
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "users/get-certificates" && method === "GET") {
      const res = await getUserCertificatesCompat();
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }

    if (joined === "enrollments/get-enrollments" && method === "GET") {
      return json(await getEnrollments());
    }

    if (
      pathSegments[0] === "enrollments" &&
      pathSegments[1] === "get-enrollments" &&
      pathSegments[3] === "progress" &&
      method === "GET"
    ) {
      const courseId = Number(pathSegments[2]);
      const res = await getCourseProgress(courseId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (
      pathSegments[0] === "enrollments" &&
      pathSegments[1] === "get-enrollments" &&
      pathSegments[3] === "lessons" &&
      pathSegments[5] === "progress" &&
      (method === "GET" || method === "PUT" || method === "POST")
    ) {
      const courseId = Number(pathSegments[2]);
      const lessonId = Number(pathSegments[4]);
      const res = await updateLessonProgress(courseId, lessonId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (joined === "enrollments/enroll-free" && method === "POST") {
      const res = await enrollFree(body);
      return json(res.json ?? res, res.status ?? 200);
    }

    if (joined === "notifications/get-notifications" && method === "GET") {
      return json(await getNotifications(searchParams));
    }

    if (joined === "notifications/unread-count" && method === "GET") {
      return json(await getUnreadCount());
    }

    if (joined === "notifications/mark-all-read" && method === "PUT") {
      return json(await markAllRead());
    }

    if (pathSegments[0] === "notifications" && pathSegments[2] === "read" && method === "PUT") {
      const notificationId = Number(pathSegments[1]);
      const res = await markNotificationRead(notificationId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (pathSegments[0] === "notifications" && pathSegments.length === 2 && method === "DELETE") {
      const notificationId = Number(pathSegments[1]);
      const res = await deleteNotification(notificationId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "notifications/send" && method === "POST") {
      const res = await sendNotification(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }
    if (joined === "notifications/broadcast" && method === "POST") {
      const res = await broadcastNotification(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }
    if (joined === "notifications/settings" && method === "GET") {
      const res = await getNotificationSettings();
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "notifications/settings" && method === "PUT") {
      const res = await updateNotificationSettings(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "notifications/send/course" && method === "POST") {
      const res = await sendCourseNotification(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }

    // Admin endpoints
    if (joined === "admin/dashboard" && method === "GET") {
      const res = await getAdminDashboard();
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "admin/users" && method === "GET") {
      const res = await getAdminUsers(searchParams);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "admin/users/all" && method === "GET") {
      const res = await getAdminUsers(new URLSearchParams("per_page=1000&page=1"));
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "admin" && pathSegments[1] === "users" && pathSegments.length === 3 && method === "GET") {
      const userId = Number(pathSegments[2]);
      const res = await getAdminUser(userId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "admin" && pathSegments[1] === "users" && pathSegments.length === 3 && method === "PUT") {
      const userId = Number(pathSegments[2]);
      const res = await updateAdminUser(userId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "admin" && pathSegments[1] === "users" && pathSegments.length === 3 && method === "DELETE") {
      const userId = Number(pathSegments[2]);
      const res = await deleteAdminUser(userId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (
      pathSegments[0] === "admin" &&
      pathSegments[1] === "users" &&
      pathSegments[3] === "promote-instructor" &&
      method === "POST"
    ) {
      const userId = Number(pathSegments[2]);
      const res = await promoteInstructor(userId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (
      pathSegments[0] === "admin" &&
      pathSegments[1] === "courses" &&
      pathSegments[3] === "status" &&
      method === "PUT"
    ) {
      const courseId = Number(pathSegments[2]);
      const res = await updateCourseStatus(courseId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "admin/analytics" && method === "GET") {
      const res = await getAdminAnalytics();
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "admin/courses" && method === "GET") {
      const res = await getAdminCourses(searchParams);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "admin/payments" && method === "GET") {
      const res = await getAdminPayments(searchParams);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "admin/enrollments" && method === "GET") {
      const res = await getAdminEnrollments(searchParams);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Catalog write endpoints
    if (joined === "mastercategories/create-mastercategories" && method === "POST") {
      const res = await createMasterCategory(body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "mastercategories" && pathSegments[1] === "update-mastercategories" && method === "PUT") {
      const categoryId = Number(pathSegments[2]);
      const res = await updateMasterCategory(categoryId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "mastercategories" && pathSegments[1] === "delete-mastercategories" && method === "DELETE") {
      const categoryId = Number(pathSegments[2]);
      const res = await deleteMasterCategory(categoryId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (joined === "subcategories/create-subcategories" && method === "POST") {
      const res = await createSubcategory(body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "subcategories" && pathSegments[1] === "update-subcategories" && method === "PUT") {
      const subcategoryId = Number(pathSegments[2]);
      const res = await updateSubcategory(subcategoryId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "subcategories" && pathSegments[1] === "delete-subcategories" && method === "DELETE") {
      const subcategoryId = Number(pathSegments[2]);
      const res = await deleteSubcategory(subcategoryId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    if (joined === "courses/create-courses" && method === "POST") {
      const res = await createCourse(body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "courses" && pathSegments[1] === "update-courses" && method === "PUT") {
      const courseId = Number(pathSegments[2]);
      const res = await updateCourse(courseId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "courses" && pathSegments[1] === "delete-courses" && method === "DELETE") {
      const courseId = Number(pathSegments[2]);
      const res = await deleteCourse(courseId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (joined === "courses/my-courses" && method === "POST") {
      const res = await getMyCourses();
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (
      pathSegments[0] === "courses" &&
      pathSegments[1] === "publish-courses" &&
      pathSegments[3] === "publish" &&
      (method === "PUT" || method === "PATCH")
    ) {
      const courseId = Number(pathSegments[2]);
      const res = await publishCourse(courseId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "courses" && pathSegments.length === 3 && pathSegments[2] === "enrollments" && method === "POST") {
      const courseId = Number(pathSegments[1]);
      const res = await getCourseEnrollments(courseId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }

    // Modules
    if (pathSegments[0] === "modules" && pathSegments[1] === "create-modules" && method === "POST") {
      const courseId = Number(pathSegments[2]);
      const res = await createModule(courseId, body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (joined === "modules/get-modules" && method === "POST") {
      return json(await getModules(searchParams));
    }
    if (pathSegments[0] === "modules" && pathSegments[1] === "get-modules" && method === "POST") {
      const moduleId = Number(pathSegments[2]);
      const res = await getModuleById(moduleId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "modules" && pathSegments[1] === "update-modules" && method === "PUT") {
      const moduleId = Number(pathSegments[2]);
      const res = await updateModule(moduleId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "modules" && pathSegments[1] === "delete-modules" && method === "DELETE") {
      const moduleId = Number(pathSegments[2]);
      const res = await deleteModule(moduleId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Lessons
    if (pathSegments[0] === "lessons" && pathSegments[1] === "create-lessons" && method === "POST") {
      const moduleId = Number(pathSegments[2]);
      const res = await createLesson(moduleId, body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (joined === "lessons/get-lessons" && method === "POST") {
      return json(await getLessons(searchParams));
    }
    if (pathSegments[0] === "lessons" && pathSegments[1] === "get-lessons" && method === "POST") {
      const lessonId = Number(pathSegments[2]);
      const res = await getLessonById(lessonId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "lessons" && pathSegments[1] === "update-lessons" && method === "PUT") {
      const lessonId = Number(pathSegments[2]);
      const res = await updateLesson(lessonId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "lessons" && pathSegments[1] === "delete-lessons" && method === "DELETE") {
      const lessonId = Number(pathSegments[2]);
      const res = await deleteLesson(lessonId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Lesson resources
    if (pathSegments[0] === "lesson-resources" && pathSegments[1] === "create-lesson-resources" && method === "POST") {
      const lessonId = Number(pathSegments[2]);
      const res = await createLessonResource(lessonId, body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (joined === "lesson-resources/get-lesson-resources" && method === "POST") {
      return json(await getLessonResources(searchParams));
    }
    if (pathSegments[0] === "lesson-resources" && pathSegments[1] === "get-lesson-resources" && method === "POST") {
      const resourceId = Number(pathSegments[2]);
      const res = await getLessonResourceById(resourceId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "lesson-resources" && pathSegments[1] === "update-lesson-resources" && method === "PUT") {
      const resourceId = Number(pathSegments[2]);
      const res = await updateLessonResource(resourceId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "lesson-resources" && pathSegments[1] === "delete-lesson-resources" && method === "DELETE") {
      const resourceId = Number(pathSegments[2]);
      const res = await deleteLessonResource(resourceId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Prerequisites
    if (pathSegments[0] === "prerequisites" && pathSegments[1] === "create-prerequisites" && method === "POST") {
      const courseId = Number(pathSegments[2]);
      const res = await createPrerequisite(courseId, body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "prerequisites" && pathSegments[1] === "get-prerequisites" && method === "GET") {
      const courseId = Number(pathSegments[2]);
      return json(await getPrerequisites(courseId));
    }
    if (pathSegments[0] === "prerequisites" && pathSegments[1] === "delete-prerequisites" && method === "DELETE") {
      const courseId = Number(pathSegments[2]);
      const prereqId = Number(pathSegments[3]);
      const res = await deletePrerequisite(courseId, prereqId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    // Legacy UI compatibility: DELETE /api/v1/prerequisites/delete/:prerequisiteRowId
    if (pathSegments[0] === "prerequisites" && pathSegments[1] === "delete" && pathSegments.length === 3 && method === "DELETE") {
      const prereqRowId = Number(pathSegments[2]);
      const res = await deletePrerequisiteById(prereqRowId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "prerequisites" && pathSegments[1] === "update-prerequisites" && method === "PUT") {
      const courseId = Number(pathSegments[2]);
      const res = await updatePrerequisite(courseId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Contact forms
    if (joined === "contact/contact-forms" && method === "POST") {
      const res = await createContactForm(body);
      return "status" in res ? json(res.json, res.status) : json(res, 201);
    }
    if (joined === "contact/contact-forms" && method === "GET") {
      const res = await getContactForms();
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "contact" && pathSegments[1] === "contact-forms" && pathSegments.length === 3 && method === "GET") {
      const formId = Number(pathSegments[2]);
      const res = await getContactForm(formId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "contact" && pathSegments[1] === "contact-forms" && pathSegments.length === 3 && method === "PUT") {
      const formId = Number(pathSegments[2]);
      const res = await updateContactForm(formId, body);
      return "status" in res ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "contact" && pathSegments[1] === "contact-forms" && pathSegments.length === 3 && method === "DELETE") {
      const formId = Number(pathSegments[2]);
      const res = await deleteContactForm(formId);
      return "status" in res ? json(res.json, res.status) : json(res);
    }

    // Files compatibility endpoints
    if (joined === "files/upload" && method === "POST") {
      const res = await uploadFileCompat(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "files" && pathSegments[1] === "download" && method === "GET") {
      const resourceId = Number(pathSegments[2]);
      const res = await downloadResourceCompat(resourceId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "files/upload-course-thumbnail" && method === "POST") {
      const res = await uploadCourseThumbnailCompat(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "files/upload-profile-picture" && method === "POST") {
      const res = await uploadProfilePictureCompat(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "files" && pathSegments[1] === "lesson-resources" && method === "POST") {
      const lessonId = Number(pathSegments[2]);
      const res = await lessonResourcesByLessonCompat(lessonId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "files" && pathSegments[1] === "resources" && method === "DELETE") {
      const resourceId = Number(pathSegments[2]);
      const res = await deleteResourceCompat(resourceId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }

    // Payments domain parity (admin implementation)
    if (joined === "payments/history" && method === "GET") {
      const res = await getPaymentHistoryAdmin(searchParams);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "payments" && pathSegments.length === 2 && method === "GET") {
      const paymentId = Number(pathSegments[1]);
      const res = await getPaymentDetailsAdmin(paymentId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "payments" && pathSegments[2] === "refund" && method === "POST") {
      const paymentId = Number(pathSegments[1]);
      const res = await refundPaymentAdmin(paymentId, body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "payments/create-order" && method === "POST") {
      const res = await createOrder(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "payments/verify-payment" && method === "POST") {
      const res = await verifyPayment(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "payments/create-checkout-session" && method === "POST") {
      const res = await createCheckoutSession(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "payments" && pathSegments[1] === "success" && method === "GET") {
      const paymentId = Number(pathSegments[2]);
      const res = await paymentSuccess(paymentId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "payments" && pathSegments[1] === "cancel" && method === "GET") {
      const paymentId = Number(pathSegments[2]);
      const res = await paymentCancel(paymentId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "payments/webhook" && method === "POST") {
      const res = await stripeWebhook(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "payments/razorpay-webhook" && method === "POST") {
      const res = await razorpayWebhook(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }

    // Certificates domain parity (admin implementation)
    if (joined === "certificates/admin/all" && method === "GET") {
      const res = await getAllCertificatesAdmin(searchParams);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "certificates/admin/bulk-generate" && method === "POST") {
      const res = await bulkGenerateCertificatesAdmin(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "certificates" && pathSegments[1] === "verify" && method === "GET") {
      const certificateNumber = String(pathSegments[2] ?? "");
      const res = await verifyCertificate(certificateNumber);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "certificates" && pathSegments[1] === "course" && method === "GET") {
      const courseId = Number(pathSegments[2]);
      const res = await getCourseCertificatesAdmin(courseId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "certificates/get-certificate" && method === "GET") {
      const res = await getUserCertificates();
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "certificates" && pathSegments[1] === "generate" && method === "POST") {
      const courseId = Number(pathSegments[2]);
      const res = await generateCertificate(courseId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "certificates" && pathSegments[1] === "download" && method === "GET") {
      const certificateId = Number(pathSegments[2]);
      const res = await downloadCertificate(certificateId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "certificates" && pathSegments[1] === "regenerate" && method === "POST") {
      const certificateId = Number(pathSegments[2]);
      const res = await regenerateCertificate(certificateId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }

    // Live sessions domain parity (admin implementation)
    if (joined === "live-sessions/get-live-sessions" && method === "GET") {
      const res = await getLiveSessionsAdmin(searchParams);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "live-sessions/create-live-sessions" && method === "POST") {
      const res = await createLiveSessionAdmin(body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res, 201);
    }
    if (pathSegments[0] === "live-sessions" && pathSegments[1] === "get-live-sessions" && pathSegments.length === 3 && method === "GET") {
      const sessionId = Number(pathSegments[2]);
      const res = await getLiveSessionAdmin(sessionId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "live-sessions" && pathSegments[1] === "update-live-sessions" && method === "PUT") {
      const sessionId = Number(pathSegments[2]);
      const res = await updateLiveSessionAdmin(sessionId, body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "live-sessions" && pathSegments[1] === "delete-live-sessions" && method === "DELETE") {
      const sessionId = Number(pathSegments[2]);
      const res = await deleteLiveSessionAdmin(sessionId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (joined === "live-sessions/get-live-courses/upcoming" && method === "GET") {
      const res = await getUpcomingLiveSessionsAdmin();
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "live-sessions" && pathSegments[1] === "get-live-sessions" && pathSegments[2] === "course" && method === "GET") {
      const courseId = Number(pathSegments[3]);
      const res = await getCourseLiveSessionsAdmin(courseId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
    if (pathSegments[0] === "live-sessions" && pathSegments[1] === "join-live-sessions" && pathSegments[3] === "join" && method === "GET") {
      const sessionId = Number(pathSegments[2]);
      const res = await joinLiveSession(sessionId);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }

    // Auth compatibility endpoints (Clerk-bridged)
    if (pathSegments[0] === "auth") {
      const action = pathSegments[1] ?? "";
      const res = await authCompat(action, body);
      return isErrorResponse(res) ? json(res.json, res.status) : json(res);
    }
  } catch (err: any) {
    // Neon DB reachable but schema not pushed yet.
    if (err?.code === "P2021") {
      if (joined === "public/get-mastercategories") {
        return json({
          message: "Master categories fetched successfully",
          count: 0,
          categories: [],
          mastercategories: [],
          pagination: {
            page: 1,
            per_page: 10,
            total_pages: 1,
            total_items: 0,
            has_next: false,
            has_prev: false,
          },
        });
      }
      if (joined === "public/get-subcategories") {
        return json({ subcategories: [], pagination: { page: 1, per_page: 10, total_pages: 1, total_items: 0, has_next: false, has_prev: false } });
      }
      if (joined === "public/get-courses") {
        return json({ courses: [], pagination: { page: 1, per_page: 10, total_pages: 1, total_items: 0, has_next: false, has_prev: false } });
      }
    }

    if (err?.message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: err?.message ?? "Internal server error" }, 500);
  }

  // Unimplemented endpoints: keep contract-shaped empty response to avoid hard crashes.
  if (method === "POST") return json({});
  return json({});
}

export async function GET(req: Request, { params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  return dispatch(req, pathSegments, "GET", null);
}

export async function POST(req: Request, { params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  const body = await getJsonOrMultipartBody(req, "POST", pathSegments);
  return dispatch(req, pathSegments, "POST", body);
}

export async function PUT(req: Request, { params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  const body = await getJsonOrMultipartBody(req, "PUT", pathSegments);
  return dispatch(req, pathSegments, "PUT", body);
}

export async function PATCH(req: Request, { params }: { params: Promise<RouteParams> }) {
  const body = await req.json().catch(() => null);
  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  return dispatch(req, pathSegments, "PATCH", body);
}

export async function DELETE(req: Request, { params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  return dispatch(req, pathSegments, "DELETE", null);
}

