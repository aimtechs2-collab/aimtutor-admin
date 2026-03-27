"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  DollarSign,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Edit2,
  TrendingUp,
} from "lucide-react";

const API_BASE_URL =
  typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_STATIC_URL ?? "") : "";

const ANIMATION_DELAY = 10;

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

function getImageUrl(thumbnailPath: string | null | undefined): string | null {
  if (!thumbnailPath) return null;
  try {
    if (thumbnailPath.startsWith("http://") || thumbnailPath.startsWith("https://")) {
      const url = new URL(thumbnailPath);
      if (!["http:", "https:"].includes(url.protocol)) return null;
      return url.href;
    }
    if (!API_BASE_URL && typeof window !== "undefined") {
      const path = thumbnailPath.startsWith("/") ? thumbnailPath : `/${thumbnailPath}`;
      return `${window.location.origin}${path}`;
    }
    if (!API_BASE_URL) return null;
    const path = thumbnailPath.startsWith("/") ? thumbnailPath.slice(1) : thumbnailPath;
    const fullUrl = new URL(path, API_BASE_URL);
    if (!["http:", "https:"].includes(fullUrl.protocol)) return null;
    return fullUrl.href;
  } catch {
    return null;
  }
}

const getStatusColor = (status: string | undefined) =>
  STATUS_COLORS[status?.toLowerCase() ?? ""] || STATUS_COLORS.default;

const getDifficultyColor = (level: string | undefined) =>
  DIFFICULTY_COLORS[level ?? ""] || DIFFICULTY_COLORS.default;

export type CourseViewShape = {
  id?: number;
  title?: string;
  instructor_name?: string;
  short_description?: string;
  description?: string;
  status?: string;
  difficulty_level?: string;
  price?: number;
  currency?: string;
  duration_hours?: number;
  max_students?: number;
  thumbnail?: string | null;
  prerequisites?: string | null;
  learning_outcomes?: string | null;
  created_at?: string;
  updated_at?: string;
  enrolled_students?: number;
  completion_rate?: number;
  average_rating?: number;
  tags?: string[];
  enrollment_count?: number;
};

export default function ViewCourseModal({
  isOpen,
  onClose,
  course,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: CourseViewShape | null;
  onEdit?: (c: CourseViewShape) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setImageError(false);
  }, [course]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (!modalRef.current || e.key !== "Tab") return;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("keydown", handleTabKey);
      document.body.style.overflow = "hidden";
      timerId = setTimeout(() => setIsVisible(true), ANIMATION_DELAY);
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      setIsVisible(false);
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleTabKey);
      clearTimeout(timerId);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
  };

  const handleEditClick = () => {
    if (onEdit && course) onEdit(course);
    onClose();
  };

  if (!isOpen || !course) return null;

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-200 overflow-y-auto"
      style={{
        backgroundColor: isVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-details-title"
      aria-describedby="course-details-description"
    >
      <div
        ref={modalRef}
        className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-xl w-full max-w-2xl my-4 max-h-[85vh] overflow-y-auto transition-all duration-200"
        style={{
          transform: isVisible ? "scale(1)" : "scale(0.95)",
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="course-details-title" className="text-lg sm:text-xl font-bold text-gray-800">
            Course Details
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close details"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {course.thumbnail && (
            <div className="w-full h-32 sm:h-48 bg-gray-100 rounded-lg overflow-hidden">
              {imageError ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon size={48} className="text-gray-300" aria-hidden="true" />
                </div>
              ) : (
                <img
                  src={getImageUrl(course.thumbnail) ?? ""}
                  alt={`${course.title || "Course"} thumbnail`}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          )}

          <div id="course-details-description">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {course.title || "Untitled Course"}
              </h3>
              <span
                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}
              >
                {course.status || "Unknown"}
              </span>
              <span
                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty_level)}`}
              >
                {course.difficulty_level || "Unknown"}
              </span>
            </div>
            {course.short_description && (
              <p className="text-sm text-gray-600">{course.short_description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 text-blue-600 mb-1">
                <DollarSign size={16} aria-hidden="true" />
                <span className="text-xs font-medium">Price</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900">
                {course.price ?? 0} {course.currency || "USD"}
              </p>
            </div>
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 text-green-600 mb-1">
                <Clock size={16} aria-hidden="true" />
                <span className="text-xs font-medium">Duration</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900">{course.duration_hours ?? 0}h</p>
            </div>
            <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 text-purple-600 mb-1">
                <Users size={16} aria-hidden="true" />
                <span className="text-xs font-medium">Max Students</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900">{course.max_students ?? 0}</p>
            </div>
            <div className="bg-orange-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 text-orange-600 mb-1">
                <BookOpen size={16} aria-hidden="true" />
                <span className="text-xs font-medium">ID</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900">{course.id ?? "N/A"}</p>
            </div>
          </div>

          {course.description && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2 flex items-center gap-2">
                <BookOpen size={16} aria-hidden="true" className="text-gray-600" />
                <span>Full Description</span>
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {course.description}
              </p>
            </div>
          )}

          {course.prerequisites && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle size={16} aria-hidden="true" className="text-yellow-600" />
                <span>Prerequisites</span>
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {course.prerequisites}
              </p>
            </div>
          )}

          {course.learning_outcomes && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle size={16} aria-hidden="true" className="text-green-600" />
                <span>Learning Outcomes</span>
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {course.learning_outcomes}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {course.created_at && (
              <div className="bg-indigo-50 p-2 sm:p-3 rounded-lg border border-indigo-200">
                <h5 className="text-xs font-medium text-indigo-700 mb-1">Created Date</h5>
                <p className="text-sm text-gray-800">
                  {new Date(course.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {course.updated_at && (
              <div className="bg-pink-50 p-2 sm:p-3 rounded-lg border border-pink-200">
                <h5 className="text-xs font-medium text-pink-700 mb-1">Last Updated</h5>
                <p className="text-sm text-gray-800">
                  {new Date(course.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {(course.enrolled_students !== undefined ||
            course.completion_rate !== undefined ||
            course.average_rating !== undefined) && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp size={16} aria-hidden="true" className="text-blue-600" />
                <span>Course Statistics</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {course.enrolled_students !== undefined && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{course.enrolled_students}</p>
                    <p className="text-xs text-gray-600 mt-1">Enrolled Students</p>
                  </div>
                )}
                {course.completion_rate !== undefined && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{course.completion_rate}%</p>
                    <p className="text-xs text-gray-600 mt-1">Completion Rate</p>
                  </div>
                )}
                {course.average_rating !== undefined && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-600">⭐ {course.average_rating}</p>
                    <p className="text-xs text-gray-600 mt-1">Average Rating</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {course.tags && course.tags.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {course.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            type="button"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              type="button"
            >
              <Edit2 size={14} />
              Edit Course
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
