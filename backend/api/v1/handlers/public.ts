/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@backend/lib/prisma";
import type { Course, Prisma } from "@prisma/client";
import { toCourseBaseDict, toLessonDict } from "./utils";
import { withCache, CACHE_TTL } from "@/lib/redis";

type PaginationMeta = {
  page: number;
  per_page: number | "all";
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_prev: boolean;
};

function buildPaginationMeta({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}): PaginationMeta {
  const totalPages = total <= 0 ? 1 : Math.ceil(total / perPage);
  return {
    page,
    per_page: perPage,
    total_pages: totalPages,
    total_items: total,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}

function courseToCourseForCategory(c: Course) {
  // Matches the allowed_keys filtering in Flask get_master_categories_only.
  return {
    id: c.id,
    title: c.title,
    short_description: c.shortDescription,
    duration_hours: c.durationHours,
    price: Number(c.price),
    thumbnail: c.thumbnail,
  };
}

export async function _getMastercategoriesOnly(searchParams: URLSearchParams) {
  const includeSubcategories = searchParams.get("subcategories");
  const includeCourses = searchParams.get("courses");
  const shouldIncludeSubcategories = includeSubcategories !== null;
  const page = Number(searchParams.get("page") ?? 1);
  const perPageRaw = searchParams.get("per_page") ?? "10";

  const isCoursesRequested = (includeCourses ?? "").toLowerCase() === "true";

  if (perPageRaw === "all") {
    const categories = await prisma.masterCategory.findMany({
      include: includeSubcategories
        ? {
            subcategories: {
              include: isCoursesRequested
                ? {
                    courses: {
                      select: {
                        id: true,
                        title: true,
                        shortDescription: true,
                        durationHours: true,
                        price: true,
                        thumbnail: true,
                      },
                    },
                  }
                : {},
            },
          }
        : undefined,
      orderBy: { id: "asc" },
    });

    const categoriesData = categories.map((cat: any) => {
      if (!shouldIncludeSubcategories) {
        return { id: cat.id, name: cat.name };
      }
      const subcategories = (cat as any).subcategories ?? [];

      return {
        id: cat.id,
        name: cat.name,
        subcategories: subcategories.map((sub: any) => {
          if (!isCoursesRequested) return { id: sub.id, name: sub.name };
          return {
            id: sub.id,
            name: sub.name,
            courses: sub.courses.map(courseToCourseForCategory),
          };
        }),
      };
    });

    return {
      message: "Master categories fetched successfully",
      count: categoriesData.length,
      categories: categoriesData,
      pagination: {
        page: 1,
        per_page: "all",
        total_pages: 1,
        total_items: categoriesData.length,
        has_next: false,
        has_prev: false,
      },
    };
  }

  const perPage = Number(perPageRaw);
  const total = await prisma.masterCategory.count();
  const categories = await prisma.masterCategory.findMany({
    skip: (page - 1) * perPage,
    take: perPage,
    include: includeSubcategories
      ? {
          subcategories: {
            include: isCoursesRequested
              ? {
                  courses: {
                    select: {
                      id: true,
                      title: true,
                      shortDescription: true,
                      durationHours: true,
                      price: true,
                      thumbnail: true,
                    },
                  },
                }
              : {},
          },
        }
      : undefined,
    orderBy: { id: "asc" },
  });

  const categoriesData = categories.map((cat: any) => {
    if (!shouldIncludeSubcategories) {
      return { id: cat.id, name: cat.name };
    }
    const subcategories = (cat as any).subcategories ?? [];

    return {
      id: cat.id,
      name: cat.name,
      subcategories: subcategories.map((sub: any) => {
        if (!isCoursesRequested) return { id: sub.id, name: sub.name };
        return {
          id: sub.id,
          name: sub.name,
          courses: sub.courses.map(courseToCourseForCategory),
        };
      }),
    };
  });

  return {
    message: "Master categories fetched successfully",
    count: categoriesData.length,
    categories: categoriesData,
    pagination: buildPaginationMeta({ page, perPage, total }),
  };
}

export async function getMastercategoriesOnly(searchParams: URLSearchParams) {
  const sub = searchParams.get("subcategories") || "";
  const crs = searchParams.get("courses") || "";
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "10";
  const key = `public:mastercategories_only:sub=${sub}&crs=${crs}&p=${page}&pp=${perPage}`;
  return withCache(key, CACHE_TTL.SHORT, () => _getMastercategoriesOnly(searchParams));
}

export async function _getMastercategoryById(categoryId: number, coursesQuery: string | null) {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { status: 400, json: { error: "Invalid category id" } } as const;
  }

  const includeCourses = (coursesQuery ?? "").toLowerCase() === "true";

  const category = await prisma.masterCategory.findUnique({
    where: { id: categoryId },
    include: {
      subcategories: includeCourses
        ? {
            include: {
              courses: {
                // Keep relation shape simple to avoid adapter edge cases on nested includes.
                include: {
                  instructor: true,
                },
              },
            },
          }
        : true,
    },
  });

  if (!category) {
    return { status: 404, json: { error: "Master category not found" } } as const;
  }

  // Note: We currently return minimal course dicts. You can extend to module/lesson parity later.
  const subcategories = category.subcategories.map((sub: any) => {
    if (!includeCourses) {
      return { id: sub.id, name: sub.name };
    }
    const courses = (sub as any).courses ?? [];
    return {
      id: sub.id,
      name: sub.name,
      courses: courses.map((c: any) => {
        const enrollmentCount = 0;
        return {
          ...toCourseBaseDict(
            c as Course & { instructor?: any },
            enrollmentCount,
          ),
        };
      }),
    };
  });

  return {
    id: category.id,
    name: category.name,
    subcategories,
  };
}

export async function getMastercategoryById(categoryId: number, coursesQuery: string | null) {
  const crs = (coursesQuery || "").toLowerCase() === "true" ? "true" : "false";
  const key = `public:mastercategory:${categoryId}:crs=${crs}`;
  return withCache(key, CACHE_TTL.SHORT, () => _getMastercategoryById(categoryId, coursesQuery));
}

export async function _getAllSubcategories(searchParams: URLSearchParams) {
  const coursesParam = searchParams.get("courses");
  const includeCourses = coursesParam !== null;
  const page = Number(searchParams.get("page") ?? 1);
  const perPageRaw = searchParams.get("per_page") ?? "10";

  if (perPageRaw === "all") {
    const subs = await prisma.subCategory.findMany({
      include: includeCourses ? { courses: { include: { instructor: true } } } : undefined,
      orderBy: { id: "asc" },
    });
    return {
      subcategories: subs.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        ...(includeCourses
          ? {
              courses: (((sub as any).courses as any[]) ?? []).map((c: any) => ({
                ...toCourseBaseDict(
                  c as Course & { instructor?: any },
                  // enrollment count computed lazily later if needed
                  0,
                ),
              })),
            }
          : {}),
      })),
      pagination: {
        page: 1,
        per_page: "all",
        total_pages: 1,
        total_items: subs.length,
        has_next: false,
        has_prev: false,
      },
    };
  }

  const perPage = Number(perPageRaw);
  const total = await prisma.subCategory.count();
  const subs = await prisma.subCategory.findMany({
    skip: (page - 1) * perPage,
    take: perPage,
    include: includeCourses ? { courses: { include: { instructor: true } } } : undefined,
    orderBy: { id: "asc" },
  });

  return {
    subcategories: subs.map((sub: any) => ({
      id: sub.id,
      name: sub.name,
      ...(includeCourses
        ? {
            courses: ((((sub as any).courses as any[]) ?? []).map((c: any) => {
              // Cheap placeholder; extend if UI needs exact enrollment_count.
              return toCourseBaseDict(
                c as Course & { instructor?: any },
                0,
              );
            })) as ReturnType<typeof toCourseBaseDict>[],
          }
        : {}),
    })),
    pagination: buildPaginationMeta({ page, perPage, total }),
  };
}

export async function getAllSubcategories(searchParams: URLSearchParams) {
  const crs = searchParams.get("courses") !== null ? "true" : "false";
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "10";
  const key = `public:subcategories:crs=${crs}&p=${page}&pp=${perPage}`;
  return withCache(key, CACHE_TTL.SHORT, () => _getAllSubcategories(searchParams));
}

export async function _getSubcategoryById(subcategoryId: number) {
  const sub = await prisma.subCategory.findUnique({
    where: { id: subcategoryId },
    include: { 
      courses: { 
        include: { 
          instructor: true, 
          _count: { select: { enrollments: true } } 
        } 
      } 
    },
  });

  if (!sub) return null;

  return {
    id: sub.id,
    name: sub.name,
    courses: sub.courses.map((c: any) =>
      toCourseBaseDict(c as Course & { instructor?: any }, c._count?.enrollments || 0),
    ),
  };
}

export async function getSubcategoryById(subcategoryId: number) {
  const key = `public:subcategory:${subcategoryId}`;
  return withCache(key, CACHE_TTL.SHORT, () => _getSubcategoryById(subcategoryId));
}

export async function _getCoursesAll(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? 1);
  const perPageRaw = searchParams.get("per_page") ?? "10";
  const search = (searchParams.get("search") ?? "").trim();

  const where: Prisma.CourseWhereInput | undefined =
    search.length > 0
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { shortDescription: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

  if (perPageRaw === "all") {
    const total = await prisma.course.count({ where });
    const courses = await prisma.course.findMany({
      where,
      include: { instructor: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      courses: courses.map((c: any) =>
        toCourseBaseDict(c as Course & { instructor?: any }, c._count?.enrollments || 0),
      ),
      pagination: {
        page: 1,
        per_page: "all",
        total_pages: 1,
        total_items: total,
        has_next: false,
        has_prev: false,
      },
    };
  }

  const perPage = Number(perPageRaw);
  const total = await prisma.course.count({ where });
  const courses = await prisma.course.findMany({
    where,
    skip: (page - 1) * perPage,
    take: perPage,
    include: { instructor: true, _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    courses: courses.map((c: any) =>
      toCourseBaseDict(c as Course & { instructor?: any }, c._count?.enrollments || 0),
    ),
    pagination: buildPaginationMeta({ page, perPage, total }),
  };
}

export async function getCoursesAll(searchParams: URLSearchParams) {
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "10";
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const key = `public:courses:p=${page}&pp=${perPage}&q=${encodeURIComponent(search)}`;
  return withCache(key, CACHE_TTL.SHORT, () => _getCoursesAll(searchParams));
}

export async function _getCourseById(courseId: number, searchParams: URLSearchParams, dbUserId: number | null) {
  const includeLessons = (searchParams.get("lessons") ?? "false").toLowerCase() === "true";
  const includeResources = (searchParams.get("resources") ?? "false").toLowerCase() === "true";
  const limitedResources = (searchParams.get("limited_resources") ?? "false").toLowerCase() === "true";
  const shouldFetchResources = includeResources || limitedResources;

  const isEnrolled =
    dbUserId === null
      ? false
      : await prisma.enrollment.findFirst({
          where: { userId: dbUserId, courseId, isActive: true },
        }).then((x) => !!x);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: true,
      _count: { select: { enrollments: true } },
      modules: {
        orderBy: { sortOrder: "asc" },
        include: includeLessons
          ? {
              lessons: {
                orderBy: { sortOrder: "asc" },
                include: {
                  resources: shouldFetchResources,
                },
              },
            }
          : undefined,
      },
    },
  });

  if (!course) return { status: 404, json: { error: "Course not found" } } as const;

  const base = toCourseBaseDict(course as Course & { instructor?: any }, (course as any)._count?.enrollments || 0);
  const modules: any[] = [];

  for (const m of course.modules) {
    const mod: any = {
      id: m.id,
      course_id: m.courseId,
      title: m.title,
      description: m.description,
      order: m.sortOrder,
      is_preview: m.isPreview,
      created_at: m.createdAt.toISOString(),
    };

    if (includeLessons) {
      const lessons = ((m as any).lessons as any[]) ?? [];
      mod.lessons = lessons.map((l: any) => {
        return toLessonDict(l as any, shouldFetchResources);
      });
    }

    modules.push(mod);
  }

  const courseData: any = {
    ...base,
    modules,
    is_enrolled: isEnrolled,
  };

  if (limitedResources && courseData.modules?.length) {
    const firstModule = courseData.modules[0];
    const firstLesson = firstModule?.lessons?.[0];
    const firstResource = firstLesson?.resources?.[0];
    if (firstResource) {
      courseData.first_lesson_resource = firstResource;
    }

    // Remove resources list from lessons; keep only the extracted first resource at root.
    for (const mod of courseData.modules) {
      if (!mod.lessons) continue;
      for (const lesson of mod.lessons) {
        if (!isEnrolled) delete lesson.video_url;
        delete lesson.resources;
      }
    }
  } else {
    // When not in limited mode, just remove video_url for non-enrolled students.
    if (!isEnrolled) {
      for (const mod of courseData.modules) {
        if (!mod.lessons) continue;
        for (const lesson of mod.lessons) {
          delete lesson.video_url;
        }
      }
    }
  }

  const prereqLinks = await prisma.coursePrerequisite.findMany({
    where: { courseId },
    include: {
      prerequisiteCourse: {
        select: {
          id: true,
          title: true,
          shortDescription: true,
          thumbnail: true,
          difficultyLevel: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  courseData.prerequisites_courses = prereqLinks.map((row: any) => ({
    id: row.prerequisiteCourse.id,
    title: row.prerequisiteCourse.title,
    short_description: row.prerequisiteCourse.shortDescription ?? undefined,
    thumbnail: row.prerequisiteCourse.thumbnail ?? undefined,
    difficulty_level: row.prerequisiteCourse.difficultyLevel ?? undefined,
  }));

  return { course: courseData };
}

export async function getCourseById(courseId: number, searchParams: URLSearchParams, dbUserId: number | null) {
  if (dbUserId !== null) {
    return _getCourseById(courseId, searchParams, dbUserId);
  }
  const les = (searchParams.get("lessons") || "").toLowerCase() === "true" ? "true" : "false";
  const lim = (searchParams.get("limited_resources") || "").toLowerCase() === "true" ? "true" : "false";
  const res = (searchParams.get("resources") || "").toLowerCase() === "true" ? "true" : "false";
  // v2: includes prerequisites_courses from course_prerequisite_courses junction
  const key = `public:course:v2:${courseId}:les=${les}&lim=${lim}&res=${res}`;
  return withCache(key, CACHE_TTL.SHORT, () => _getCourseById(courseId, searchParams, dbUserId));
}
