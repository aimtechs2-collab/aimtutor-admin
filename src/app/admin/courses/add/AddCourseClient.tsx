"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/admin-api-client";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Loader,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  DollarSign,
  Clock,
  Users,
  Eye,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import CourseForm from "./CourseForm";
import ViewCourseModal, { type CourseViewShape } from "./ViewCourseModal";
import { thumbnailUrl } from "@/lib/staticUrl";

const ANIMATIONS_CSS = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .animate-fadeIn {
    opacity: 0;
    animation: fadeInUp 0.3s ease-out forwards;
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const ANIMATION_DELAY = 10;
const TOAST_DURATION = 4000;
const CACHE_KEY = "courses_cache";
const CACHE_DURATION = 5 * 60 * 1000;

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-800",
  default: "bg-blue-100 text-blue-800",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-100 text-green-800",
  Intermediate: "bg-blue-100 text-blue-800",
  Advanced: "bg-orange-100 text-orange-800",
  Expert: "bg-red-100 text-red-800",
  default: "bg-gray-100 text-gray-800",
};

const getStatusColor = (status: string | undefined) =>
  STATUS_COLORS[status?.toLowerCase() ?? ""] || STATUS_COLORS.default;
const getDifficultyColor = (level: string | undefined) =>
  DIFFICULTY_COLORS[level ?? ""] || DIFFICULTY_COLORS.default;

function useInfiniteScroll(callback: () => void, hasMore: boolean, loading: boolean) {
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        callback();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback, hasMore, loading]);
}

function getCachedData(page = 1) {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_page_${page}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    }
  } catch (e) {
    console.error("Error reading cache:", e);
  }
  return null;
}

function setCachedData(page: number, data: unknown) {
  try {
    localStorage.setItem(`${CACHE_KEY}_page_${page}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.error("Error setting cache:", e);
  }
}

function clearAllCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY)) localStorage.removeItem(key);
    });
  } catch (e) {
    console.error("Error clearing cache:", e);
  }
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: string;
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
    const t = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, TOAST_DURATION);
    return () => clearTimeout(t);
  }, [onClose]);
  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";
  const Icon = type === "success" ? CheckCircle : type === "error" ? XCircle : AlertCircle;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 left-4 sm:left-auto max-w-sm ${bgColor} text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-all duration-300`}
      style={{
        transform: isVisible ? "translateX(0)" : "translateX(400px)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <Icon size={20} aria-hidden="true" />
      <span className="text-sm sm:text-base flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80" aria-label="Close notification" type="button">
        <X size={18} />
      </button>
    </div>
  );
}

const CourseSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 animate-pulse">
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-lg" />
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-100 rounded w-16" />
          <div className="h-6 bg-gray-100 rounded w-20" />
        </div>
      </div>
    </div>
  </div>
);

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      setTimeout(() => setIsVisible(true), ANIMATION_DELAY);
    } else setIsVisible(false);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, loading]);
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node) && !loading) onClose();
  };
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-200"
      style={{ backgroundColor: isVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)" }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white p-4 sm:p-6 rounded-xl shadow-xl w-full max-w-md transition-all duration-200"
        style={{
          transform: isVisible ? "scale(1)" : "scale(0.95)",
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full">
            <AlertCircle className="text-red-600" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`bg-red-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

type CourseRow = CourseViewShape & { id: number; title: string };

export default function AddCourseClient() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [masterCategories, setMasterCategories] = useState<{ id: number; name: string }[]>([]);
  const [subCategories, setSubCategories] = useState<{ id: number; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseViewShape | null>(null);
  const [viewingCourse, setViewingCourse] = useState<CourseViewShape | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allCoursesRef = useRef<CourseRow[]>([]);
  const perPageRef = useRef(10);

  const deduplicateCourses = (list: CourseRow[]) => {
    const seen = new Map<number, boolean>();
    return list.filter((course) => {
      if (!course.id) return true;
      if (seen.has(course.id)) return false;
      seen.set(course.id, true);
      return true;
    });
  };

  const filteredCourses = useMemo(() => {
    let list = deduplicateCourses(courses);
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter((course) => {
      const text = [
        course.title,
        course.short_description,
        course.description,
        course.difficulty_level,
        course.status,
        course.instructor_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [courses, searchTerm]);

  const fetchCourses = useCallback(
    async (page = 1, append = false, forceRefresh = false) => {
      try {
        if (!forceRefresh && !append) {
          const cachedData = getCachedData(page);
          if (cachedData) {
            const cd = cachedData as any;
            if (page === 1) {
              setCourses(cd.courses || []);
              allCoursesRef.current = cd.courses || [];
            } else {
              const newCourses = append
                ? [...allCoursesRef.current, ...(cd.courses || [])]
                : cd.courses || [];
              setCourses(newCourses);
              allCoursesRef.current = newCourses;
            }
            setPagination(cd.pagination);
            setUsingCache(true);
            setLoading(false);
            setLoadingMore(false);
            return;
          }
        }
        if (page === 1 && !append) setLoading(true);
        else setLoadingMore(true);
        setError(null);
        setUsingCache(false);
        const res = await api.post<any>(
          `/api/v1/courses/get-courses?page=${page}&per_page=${perPageRef.current}`,
        );
        const newCourses = (res.data.courses || []) as CourseRow[];
        const paginationData = res.data.pagination || {};
        if (append) {
          const existingIds = new Set(allCoursesRef.current.map((c) => c.id));
          const uniqueNew = newCourses.filter((c) => !existingIds.has(c.id));
          const combined = [...allCoursesRef.current, ...uniqueNew];
          setCourses(combined);
          allCoursesRef.current = combined;
        } else {
          setCourses(newCourses);
          allCoursesRef.current = newCourses;
        }
        const pag = {
          page: paginationData.page || page,
          perPage: paginationData.per_page || 10,
          totalItems: paginationData.total_items || 0,
          totalPages: paginationData.total_pages || 0,
          hasNext: paginationData.has_next || false,
          hasPrev: paginationData.has_prev || false,
        };
        perPageRef.current = pag.perPage;
        setPagination(pag);
        if (!forceRefresh) {
          setCachedData(page, {
            courses: newCourses,
            pagination: pag,
          });
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses");
        setToast({ type: "error", message: "Failed to load courses" });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const loadMoreCourses = useCallback(() => {
    if (!loadingMore && pagination.hasNext && !searchTerm) {
      void fetchCourses(pagination.page + 1, true);
    }
  }, [loadingMore, pagination.hasNext, pagination.page, searchTerm, fetchCourses]);

  useInfiniteScroll(loadMoreCourses, pagination.hasNext && !searchTerm, loadingMore);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages && page !== pagination.page) {
      allCoursesRef.current = [];
      void fetchCourses(page, false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const nextPage = () => {
    if (pagination.hasNext) goToPage(pagination.page + 1);
  };
  const prevPage = () => {
    if (pagination.hasPrev) goToPage(pagination.page - 1);
  };

  const fetchMasterCategories = useCallback(async () => {
    try {
      const res = await api.post<any>("/api/v1/public/get-mastercategories?per_page=all");
      const payload = res.data ?? {};
      setMasterCategories(payload.categories || payload.mastercategories || []);
    } catch (err) {
      console.error("Failed to fetch master categories:", err);
    }
  }, []);

  const fetchSubCategories = useCallback(async (masterCategoryId: string) => {
    try {
      const res = await api.post<any>(`/api/v1/mastercategories/get-mastercategories/${masterCategoryId}`);
      const subs = res.data?.subcategories;
      setSubCategories(Array.isArray(subs) ? subs : []);
    } catch (err) {
      console.error("Failed to fetch subcategories:", err);
    }
  }, []);

  useEffect(() => {
    void fetchCourses(1, false);
    void fetchMasterCategories();
  }, [fetchCourses, fetchMasterCategories]);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => setModalVisible(true), ANIMATION_DELAY);
      document.body.style.overflow = "hidden";
    } else {
      setModalVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const handleFormSuccess = (data: Record<string, unknown>, action: string) => {
    clearAllCache();
    void fetchCourses(1, false);
    setShowForm(false);
    setEditingCourse(null);
    setSubCategories([]);
    setToast({
      type: "success",
      message: `Course "${data.title}" ${action} successfully!`,
    });
  };

  const handleEdit = (course: CourseViewShape) => {
    setEditingCourse(course);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/api/v1/courses/delete-courses/${deletingCourse.id}`);
      clearAllCache();
      setToast({
        type: "success",
        message: `Course "${deletingCourse.title}" deleted successfully!`,
      });
      void fetchCourses(pagination.page, false);
    } catch (err) {
      console.error("Delete error:", err);
      setToast({ type: "error", message: "Failed to delete course" });
    } finally {
      setDeleteLoading(false);
      setDeletingCourse(null);
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    let start = Math.max(1, pagination.page - halfVisible);
    let end = Math.min(pagination.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <>
      <style>{ANIMATIONS_CSS}</style>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
                type="button"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">All Courses</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center gap-2">
                  {pagination.totalItems > 0 ? (
                    <>
                      <span>{pagination.totalItems} total courses</span>
                      <span className="text-gray-400">•</span>
                      <span>
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                    </>
                  ) : (
                    "Manage all your courses"
                  )}
                  {usingCache && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Cached</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    clearAllCache();
                    allCoursesRef.current = [];
                    void fetchCourses(1, false, true);
                  }}
                  className="p-2 sm:p-3 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Refresh data"
                  title="Refresh data"
                  type="button"
                >
                  <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => {
                    setEditingCourse(null);
                    setShowForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  type="button"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Add Course
                </button>
              </div>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search courses by title, description, difficulty, or instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
              <AlertCircle className="mx-auto text-red-500 mb-3" size={36} />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => void fetchCourses(1, false, true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                type="button"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(pagination.perPage || 10)].map((_, i) => (
                <CourseSkeleton key={i} />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
              <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? "No courses found" : "No courses yet"}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
                {searchTerm ? "Try different keywords" : "Create your first course"}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-700"
                  type="button"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                  type="button"
                >
                  <Plus size={18} />
                  Create First Course
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4">
                {filteredCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all animate-fadeIn"
                    style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {course.thumbnail ? (
                          <>
                            <img
                              src={thumbnailUrl(course.thumbnail) ?? undefined}
                              alt={course.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                const sib = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                if (sib) sib.style.display = "flex";
                              }}
                            />
                            <div className="w-full h-full hidden items-center justify-center text-gray-400">
                              <ImageIcon size={32} />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold cursor-pointer hover:text-blue-500 text-gray-800 truncate">
                              {course.title}
                            </h3>
                            {course.short_description && (
                              <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
                                {course.short_description}
                              </p>
                            )}
                            {course.instructor_name && (
                              <p className="text-xs text-gray-500 mt-1">
                                Instructor: {course.instructor_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}
                            >
                              {course.status}
                            </span>
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty_level)}`}
                            >
                              {course.difficulty_level}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mt-3">
                          <span className="flex items-center gap-1">
                            <DollarSign size={14} />
                            {course.price ?? 0} {course.currency || "USD"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {course.duration_hours ?? 0}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            Max: {course.max_students ?? 0}
                          </span>
                          {course.enrollment_count !== undefined && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Users size={14} />
                              Enrolled: {course.enrollment_count}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => setViewingCourse(course)}
                            className="flex items-center cursor-pointer gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            type="button"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(course)}
                            className="flex items-center cursor-pointer gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            type="button"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingCourse(course as CourseRow)}
                            className="flex items-center cursor-pointer gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            type="button"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                          <button
                            onClick={() => router.push("/admin/prerequisites")}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                            type="button"
                          >
                            <BookOpen size={14} />
                            Add Pre-Requisites
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader className="animate-spin" size={20} />
                    <span>Loading more courses...</span>
                  </div>
                </div>
              )}
              {!searchTerm && pagination.totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.perPage + 1} -{" "}
                    {Math.min(pagination.page * pagination.perPage, pagination.totalItems)} of{" "}
                    {pagination.totalItems} courses
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevPage}
                      disabled={!pagination.hasPrev}
                      className={`p-2 rounded-lg transition-colors ${
                        pagination.hasPrev ? "hover:bg-gray-100 text-gray-700" : "text-gray-300 cursor-not-allowed"
                      }`}
                      type="button"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex gap-1">
                      {pagination.page > 3 && (
                        <>
                          <button
                            onClick={() => goToPage(1)}
                            className="px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                            type="button"
                          >
                            1
                          </button>
                          {pagination.page > 4 && <span className="px-2">...</span>}
                        </>
                      )}
                      {getPageNumbers().map((p) => (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                            p === pagination.page ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                          }`}
                          type="button"
                        >
                          {p}
                        </button>
                      ))}
                      {pagination.page < pagination.totalPages - 2 && (
                        <>
                          {pagination.page < pagination.totalPages - 3 && <span className="px-2">...</span>}
                          <button
                            onClick={() => goToPage(pagination.totalPages)}
                            className="px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                            type="button"
                          >
                            {pagination.totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={nextPage}
                      disabled={!pagination.hasNext}
                      className={`p-2 rounded-lg transition-colors ${
                        pagination.hasNext ? "hover:bg-gray-100 text-gray-700" : "text-gray-300 cursor-not-allowed"
                      }`}
                      type="button"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
              {!searchTerm && pagination.hasNext && (
                <div className="text-center mt-4 text-sm text-gray-500">
                  Scroll down to load more courses automatically
                </div>
              )}
            </>
          )}

          {showForm && (
            <div
              className="fixed inset-0 flex items-center justify-center z-40 p-4 overflow-y-auto bg-black"
              style={{ backgroundColor: modalVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)" }}
            >
              <div
                className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-xl w-full max-w-3xl my-8 transition-all duration-200 max-h-[90vh] overflow-y-auto"
                style={{
                  transform: modalVisible ? "scale(1)" : "scale(0.95)",
                  opacity: modalVisible ? 1 : 0,
                }}
              >
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    {editingCourse ? "Edit Course" : "Add New Course"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingCourse(null);
                      setSubCategories([]);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-lg"
                    type="button"
                  >
                    <X size={20} />
                  </button>
                </div>
                <CourseForm
                  course={editingCourse}
                  onSuccess={handleFormSuccess}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingCourse(null);
                    setSubCategories([]);
                  }}
                  masterCategories={masterCategories}
                  subCategories={subCategories}
                  fetchSubCategories={fetchSubCategories}
                />
              </div>
            </div>
          )}

          <ViewCourseModal
            isOpen={!!viewingCourse}
            onClose={() => setViewingCourse(null)}
            course={viewingCourse}
            onEdit={handleEdit}
          />

          <ConfirmModal
            isOpen={!!deletingCourse}
            onClose={() => setDeletingCourse(null)}
            onConfirm={handleDelete}
            title="Delete Course"
            message={`Are you sure you want to delete "${deletingCourse?.title}"? This cannot be undone.`}
            loading={deleteLoading}
          />

          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}
        </div>
      </div>
    </>
  );
}
