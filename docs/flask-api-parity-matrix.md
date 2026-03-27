# Flask to Next.js API Parity Matrix

This checklist tracks migration from `backend` Flask routes to `admin-nextjs` API.

Status legend:
- `DONE`: Implemented in `admin-nextjs`
- `PARTIAL`: Some handlers exist, not full parity
- `TODO`: Not implemented yet

## Auth (`/api/v1/auth`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| POST | `/register` | DONE | Clerk compatibility response |
| POST | `/verify-otp` | DONE | Clerk compatibility response |
| POST | `/resend-otp` | DONE | Clerk compatibility response |
| POST | `/login` | DONE | Clerk compatibility response |
| POST | `/refresh` | DONE | Clerk compatibility response |
| POST | `/logout` | DONE | Clerk compatibility response |
| PUT | `/change-password` | DONE | Clerk compatibility response |
| GET | `/me` | DONE | Clerk-backed current user |
| POST | `/google` | DONE | Clerk compatibility response |
| POST | `/send-token` | DONE | Clerk compatibility response |
| POST | `/reset-password` | DONE | Clerk compatibility response |
| POST | `/set-password` | DONE | Clerk compatibility response |

## Users (`/api/v1/users`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/get-profile` | DONE | |
| PUT | `/update-profile` | DONE | Implemented in catch-all route |
| GET | `/get-certificates` | DONE | |
| GET | `/get-dashboard` | DONE | Implemented in catch-all route |

## Master Categories (`/api/v1/mastercategories`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| POST | `/create-mastercategories` | DONE | Implemented in catch-all |
| POST | `/get-mastercategories` | PARTIAL | Read path available |
| POST | `/get-mastercategories/:id` | DONE | Alias handled in catch-all |
| PUT | `/update-mastercategories/:id` | DONE | Implemented in catch-all |
| DELETE | `/delete-mastercategories/:id` | DONE | Implemented in catch-all |

## Subcategories (`/api/v1/subcategories`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| POST | `/create-subcategories` | DONE | Implemented in catch-all |
| POST | `/get-subcategories` | DONE | Implemented in catch-all |
| POST | `/get-subcategories/:id` | DONE | Implemented in catch-all |
| PUT | `/update-subcategories/:id` | DONE | Implemented in catch-all |
| DELETE | `/delete-subcategories/:id` | DONE | Implemented in catch-all |

## Courses (`/api/v1/courses`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| POST | `/get-courses` | DONE | Implemented in catch-all |
| POST | `/get-courses/:id` | DONE | Implemented in catch-all |
| POST | `/create-courses` | DONE | Implemented in catch-all |
| PUT | `/update-courses/:id` | DONE | Implemented in catch-all |
| DELETE | `/delete-courses/:id` | DONE | Implemented in catch-all |
| POST | `/my-courses` | DONE | |
| PATCH | `/publish-courses/:course_id/publish` | DONE | |
| POST | `/:course_id/enrollments` | DONE | |

## Modules (`/api/v1/modules`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/create-modules/:course_id` | DONE |
| POST | `/get-modules` | DONE |
| POST | `/get-modules/:module_id` | DONE |
| PUT | `/update-modules/:module_id` | DONE |
| DELETE | `/delete-modules/:module_id` | DONE |

## Lessons (`/api/v1/lessons`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/create-lessons/:module_id` | DONE |
| POST | `/get-lessons` | DONE |
| POST | `/get-lessons/:lesson_id` | DONE |
| PUT | `/update-lessons/:lesson_id` | DONE |
| DELETE | `/delete-lessons/:lesson_id` | DONE |

## Lesson Resources (`/api/v1/lesson-resources`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/create-lesson-resources/:lesson_id` | DONE |
| POST | `/get-lesson-resources` | DONE |
| POST | `/get-lesson-resources/:resource_id` | DONE |
| PUT | `/update-lesson-resources/:resource_id` | DONE |
| DELETE | `/delete-lesson-resources/:resource_id` | DONE |

## Public (`/api/v1/public`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| POST | `/get-mastercategories` | DONE | |
| POST | `/get-mastercategories/:id` | DONE | |
| POST | `/get-subcategories` | DONE | |
| POST | `/get-subcategories/:id` | DONE | |
| POST | `/get-courses` | DONE | |
| POST | `/get-courses/:id` | DONE | |

## Prerequisites (`/api/v1/prerequisites`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/create-prerequisites/:course_id` | DONE |
| GET | `/get-prerequisites/:course_id` | DONE |
| DELETE | `/delete-prerequisites/:course_id/:prereq_id` | DONE |
| PUT | `/update-prerequisites/:course_id` | DONE |

## Enrollments (`/api/v1/enrollments`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/get-enrollments` | DONE | |
| POST | `/create-enrollments/:course_id` | PARTIAL | `enroll-free` exists, full create missing |
| GET | `/get-enrollments/:course_id/progress` | DONE | |
| GET | `/get-enrollments/:course_id/lessons/:lesson_id/progress` | DONE | PUT/POST updater also exists |

## Admin (`/api/v1/admin`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| GET | `/dashboard` | DONE |
| GET | `/users` | DONE |
| GET | `/users/:user_id` | DONE |
| PUT | `/users/:user_id` | DONE |
| DELETE | `/users/:user_id` | DONE |
| GET | `/courses` | DONE |
| PUT | `/courses/:course_id/status` | DONE |
| GET | `/payments` | DONE |
| GET | `/enrollments` | DONE |
| GET | `/analytics` | DONE |
| POST | `/users/:user_id/promote-instructor` | DONE |
| GET | `/users/all` | DONE |

## Payments (`/api/v1/payments`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/create-order` | DONE |
| POST | `/verify-payment` | DONE |
| POST | `/razorpay-webhook` | DONE |
| POST | `/create-checkout-session` | DONE |
| GET | `/success/:payment_id` | DONE |
| GET | `/cancel/:payment_id` | DONE |
| POST | `/webhook` | DONE |
| GET | `/history` | DONE |
| GET | `/:payment_id` | DONE |
| POST | `/:payment_id/refund` | DONE |

## Files (`/api/v1/files`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/upload` | DONE |
| GET | `/download/:resource_id` | DONE |
| POST | `/upload-course-thumbnail` | DONE |
| POST | `/upload-profile-picture` | DONE |
| POST | `/lesson-resources/:lesson_id` | DONE |
| DELETE | `/resources/:resource_id` | DONE |

## Notifications (`/api/v1/notifications`)

| Method | Legacy Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/get-notifications` | DONE | |
| PUT | `/:notification_id/read` | DONE | |
| PUT | `/mark-all-read` | DONE | |
| DELETE | `/:notification_id` | DONE | |
| POST | `/send` | DONE | |
| POST | `/broadcast` | DONE | |
| GET | `/unread-count` | DONE | |
| GET | `/settings` | DONE | |
| PUT | `/settings` | DONE | |
| POST | `/send/course` | DONE | |

## Certificates (`/api/v1/certificates`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| GET | `/get-certificate` | DONE |
| POST | `/generate/:course_id` | DONE |
| GET | `/download/:certificate_id` | DONE |
| GET | `/verify/:certificate_number` | DONE |
| POST | `/regenerate/:certificate_id` | DONE |
| GET | `/admin/all` | DONE |
| POST | `/admin/bulk-generate` | DONE |
| GET | `/course/:course_id` | DONE |

## Live Sessions (`/api/v1/live-sessions`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| GET | `/get-live-sessions` | DONE |
| POST | `/create-live-sessions` | DONE |
| GET | `/get-live-sessions/:session_id` | DONE |
| PUT | `/update-live-sessions/:session_id` | DONE |
| DELETE | `/delete-live-sessions/:session_id` | DONE |
| GET | `/get-live-courses/upcoming` | DONE |
| GET | `/get-live-sessions/course/:course_id` | DONE |
| GET | `/join-live-sessions/:session_id/join` | DONE |

## Contact (`/api/v1/contact`)

| Method | Legacy Endpoint | Status |
|---|---|---|
| POST | `/contact-forms` | DONE |
| GET | `/contact-forms` | DONE |
| GET | `/contact-forms/:form_id` | DONE |
| PUT | `/contact-forms/:form_id` | DONE |
| DELETE | `/contact-forms/:form_id` | DONE |

## Added in Next.js (new)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/webhooks/clerk` | Sync Clerk users into PostgreSQL `users` table |
