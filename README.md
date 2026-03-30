# 🛡️ AimTutor Admin Portal — `admin-nextjs`

**Backend API + Admin Dashboard for AimTutor.ai LMS**

---

## Overview

`admin-nextjs` is the private administration application that powers the AimTutor.ai platform. It serves two roles:

1. **REST API Server** — Versioned API (`/api/v1/*`) consumed by the public `nextjs-lms` frontend
2. **Admin Dashboard** — Full CRUD management interface for courses, students, enrollments, payments, and content

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Auth | Clerk 7 (SSO, Google OAuth) |
| Database | PostgreSQL (Neon Serverless) via Prisma 7 |
| Cache | Upstash Redis |
| File Storage | Cloudinary |
| Icons | Lucide React |
| Fonts | Geist (Google Fonts) |
| Language | TypeScript 5 |
| Hosting | Vercel |

## Project Structure

```
admin-nextjs/
├── backend/                    # Server-side API logic
│   ├── api/v1/handlers/        # API route handlers
│   │   ├── admin.ts            # Dashboard stats
│   │   ├── catalog-admin.ts    # Category CRUD
│   │   ├── content-admin.ts    # Course/module/lesson CRUD
│   │   ├── enrollments.ts      # Enrollment management
│   │   ├── public.ts           # Public catalog API (no auth)
│   │   ├── users.ts            # User management
│   │   └── notifications.ts    # Notification system
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── auth.ts             # requireDbUser() auth guard
│   │   └── dbRetry.ts          # DB retry logic
│   └── prisma/
│       └── schema.prisma       # Database schema (14 models)
├── src/
│   ├── app/
│   │   ├── api/v1/[...path]/   # Catch-all API route
│   │   ├── admin/              # Admin dashboard pages (18 modules)
│   │   ├── sign-in/            # Clerk sign-in
│   │   └── sign-up/            # Clerk sign-up
│   ├── components/             # Admin UI components
│   └── lib/                    # Client utilities (Cloudinary, Redis, etc.)
├── scripts/                    # DB seed & admin bootstrap scripts
└── next.config.ts              # Security headers, redirects
```

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database ([Neon](https://neon.tech) recommended)
- A [Clerk](https://clerk.com) account
- (Optional) [Upstash Redis](https://upstash.com) for caching
- (Optional) [Cloudinary](https://cloudinary.com) for media uploads

### 1. Install Dependencies

```bash
cd admin-nextjs
npm install
```

> This automatically runs `prisma generate` via the `postinstall` script.

### 2. Configure Environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

**Required variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `DATABASE_URL` | PostgreSQL connection string |

**Optional variables:**

| Variable | Description |
|---|---|
| `ADMIN_EMAILS` | Comma-separated emails to auto-promote to admin |
| `UPSTASH_REDIS_REST_URL` | Redis cache URL |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token |
| `CLOUDINARY_URL` | Cloudinary API URL |

### 3. Push Database Schema

```bash
npx prisma db push --schema=backend/prisma/schema.prisma
```

### 4. (Optional) Seed Admin Users

```bash
npm run db:admins
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) — the first user to sign in is auto-promoted to admin in development mode.

## Database Schema

The Prisma schema defines **14 models**:

| Model | Purpose |
|---|---|
| `User` | Users with roles (student / instructor / admin) |
| `MasterCategory` | Top-level course categories |
| `SubCategory` | Category subdivisions |
| `Course` | Course definitions with pricing, status, mode |
| `CourseModule` | Ordered modules within a course |
| `Lesson` | Lessons within modules (video, content) |
| `LessonResource` | Downloadable attachments per lesson |
| `Enrollment` | Student ↔ Course enrollment records |
| `LessonProgress` | Per-lesson completion tracking |
| `Payment` | Razorpay payment records |
| `Certificate` | Issued completion certificates |
| `LiveSession` | Scheduled live sessions (MS Teams) |
| `Notification` | User notification inbox |
| `ContactForm` | Public lead capture submissions |
| `CoursePrerequisite` | Course dependency graph (many-to-many) |

## API Endpoints

### Public (No Auth)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/public/get-mastercategories` | Course catalog tree |
| `GET` | `/api/v1/public/courses/:id` | Course detail |
| `POST` | `/api/v1/public/contact` | Lead capture form |
| `GET` | `/api/detect-location` | GeoIP detection |

### Authenticated

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/auth/me` | Current user profile |

### Admin (role=admin required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Dashboard stats |
| `GET/POST/PUT/DELETE` | `/api/v1/admin/courses` | Course CRUD |
| `POST` | `/api/v1/admin/master-categories` | Create category |
| `POST` | `/api/v1/admin/subcategories` | Create subcategory |
| `GET/POST` | `/api/v1/admin/modules` | Module management |
| `GET/POST` | `/api/v1/admin/lessons` | Lesson management |
| `POST` | `/api/v1/admin/resources` | Resource uploads |
| `GET` | `/api/v1/admin/enrollments` | Enrollment list |
| `GET` | `/api/v1/admin/students` | Student management |
| `GET` | `/api/v1/admin/payments` | Payment history |
| `POST` | `/api/v1/admin/live-sessions` | Live session scheduling |

## Security

- 🔒 All admin routes require `role === 'admin'` via `requireDbUser()`
- 🚫 `robots: { index: false }` — invisible to search engines
- 🛡️ Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- 🔐 Secrets managed via Vercel environment variables

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:admins` | Upsert admin emails from `ADMIN_EMAILS` env |

## Deployment

Deploy to Vercel with the following settings:

- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Root Directory:** `admin-nextjs`
- Set all environment variables in Vercel dashboard

## Related

- [`nextjs-lms`](../nextjs-lms/) — Public frontend & student portal
- [`HLD.md`](../HLD.md) — High Level Design document
- [`LLD.md`](../LLD.md) — Low Level Design document

---

© AimTutor.ai — All Rights Reserved
