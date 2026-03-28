"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Check,
  X,
  Loader,
  AlertCircle,
  CheckCircle,
  Info,
  GraduationCap,
  ArrowLeft,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/admin-api-client";

// Constants (ported from legacy)
const CACHE_KEY = "prerequisites_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const TOAST_DURATION = 4000;

// Cache management (ported)
const getCachedData = (key: string) => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    }
  } catch (error) {
    console.error("Error reading cache:", error);
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  try {
    localStorage.setItem(
      `${CACHE_KEY}_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.error("Error setting cache:", error);
  }
};

const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY)) localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

type ToastState = { message: string; type: "success" | "error" | "info" };

// Toast Component (ported)
const Toast = ({ message, type, onClose }: { message: string; type: ToastState["type"]; onClose: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-4 right-4 left-4 sm:left-auto max-w-sm ${bgColor} text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-all duration-300`}
      style={{
        transform: isVisible ? "translateX(0)" : "translateX(400px)",
        opacity: isVisible ? 1 : 0,
      }}
      role="alert"
      aria-live="assertive"
    >
      <Icon size={20} aria-hidden="true" />
      <span className="text-sm sm:text-base flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80" aria-label="Close notification" type="button">
        <X size={18} />
      </button>
    </div>
  );
};

export default function PrerequisitesManagementClient() {
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  const [existingPrerequisites, setExistingPrerequisites] = useState<any[]>([]);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<number[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);

  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingPrerequisites, setIsLoadingPrerequisites] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const showToast = (type: ToastState["type"], message: string) => {
    setToast({ type, message });
  };

  // Fetch courses with caching
  const fetchCourses = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cachedData = getCachedData("courses");
        if (cachedData) {
          setCourses(cachedData);
          setUsingCache(true);
          setIsLoadingCourses(false);
          return;
        }
      }

      setIsLoadingCourses(true);
      setUsingCache(false);

      const response = await api.post(`/api/v1/courses/get-courses?per_page=all`, undefined);
      const coursesData = (response.data as any)?.courses || (response.data as any) || [];

      setCourses(coursesData);
      setCachedData("courses", coursesData);
    } catch (e) {
      console.error("Error fetching courses:", e);
      showToast("error", "Failed to load courses");
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  // Fetch existing prerequisites (legacy UI expects nested `prerequisite_course`)
  const fetchExistingPrerequisites = useCallback(
    async (courseId: number) => {
      setIsLoadingPrerequisites(true);
      setError(null);

      try {
        const response = await api.get(`/api/v1/prerequisites/get-prerequisites/${courseId}`);
        const prereqData = (response.data as any)?.prerequisites || [];

        setExistingPrerequisites(prereqData);

        const prereqIds = prereqData.map((p: any) => p.prerequisite_course_id);
        const available = courses.filter((c) => c.id !== courseId && !prereqIds.includes(c.id));

        setAvailableCourses(available);
        setSelectedPrerequisites([]); // reset selection
      } catch (e: any) {
        console.error("Error fetching prerequisites:", e);
        setExistingPrerequisites([]);
        const available = courses.filter((c) => c.id !== courseId);
        setAvailableCourses(available);
      } finally {
        setIsLoadingPrerequisites(false);
      }
    },
    [courses],
  );

  // Initial fetch
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Fetch prerequisites when course changes
  useEffect(() => {
    if (selectedCourse) fetchExistingPrerequisites(selectedCourse.id);
    else {
      setExistingPrerequisites([]);
      setSelectedPrerequisites([]);
    }
  }, [selectedCourse, fetchExistingPrerequisites]);

  const handleTogglePrerequisite = (courseId: number) => {
    setSelectedPrerequisites((prev) => {
      if (prev.includes(courseId)) return prev.filter((id) => id !== courseId);
      return [...prev, courseId];
    });
  };

  const handleSavePrerequisites = async () => {
    if (!selectedCourse?.id || selectedPrerequisites.length === 0) return;
    try {
      setIsSaving(true);
      setError(null);

      await api.post(`/api/v1/prerequisites/create-prerequisites/${selectedCourse.id}`, {
        prerequisite_course_ids: selectedPrerequisites,
      });

      showToast("success", `Prerequisites updated for "${selectedCourse.title}"`);
      clearAllCache();
      await fetchExistingPrerequisites(selectedCourse.id);
    } catch (err: any) {
      console.error("Failed to save prerequisites:", err);
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || "Failed to save prerequisites";
      setError(msg);
      showToast("error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePrerequisite = async (prerequisiteId: number) => {
    if (!window.confirm("Are you sure you want to remove this prerequisite?")) return;

    try {
      await api.delete(`/api/v1/prerequisites/delete/${prerequisiteId}`);
      showToast("success", "Prerequisite removed successfully");
      clearAllCache();
      if (selectedCourse) await fetchExistingPrerequisites(selectedCourse.id);
    } catch (e: any) {
      console.error("Error deleting prerequisite:", e);
      showToast("error", e?.response?.data?.message || "Failed to remove prerequisite");
    }
  };

  const handleCourseSelect = (course: any) => {
    setSelectedCourse(course);
    setShowCourseDropdown(false);
    setSearchTerm("");
  };

  const handleRefreshData = () => {
    clearAllCache();
    fetchCourses(true);
    if (selectedCourse) fetchExistingPrerequisites(selectedCourse.id);
  };

  const filteredAvailableCourses = useMemo(() => {
    if (!searchTerm.trim()) return availableCourses;
    const lowercased = searchTerm.toLowerCase();
    return availableCourses.filter(
      (course) => course.title?.toLowerCase().includes(lowercased) || course.short_description?.toLowerCase().includes(lowercased),
    );
  }, [availableCourses, searchTerm]);

  return (
    <>
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
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
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                  Prerequisites Management
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage course prerequisites and dependencies
                  {usingCache && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Cached</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleRefreshData}
                className="p-2 sm:p-3 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Refresh data"
                title="Refresh data"
                type="button"
              >
                <RefreshCw size={20} className={isLoadingCourses ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Course Selection Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Course</label>
              <button
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                disabled={isLoadingCourses}
                className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all flex items-center justify-between bg-white"
                type="button"
              >
                <span className={`text-sm ${selectedCourse ? "text-gray-800" : "text-gray-500"}`}>
                  {isLoadingCourses ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading courses...
                    </span>
                  ) : selectedCourse ? (
                    selectedCourse.title
                  ) : (
                    "Select a course to manage prerequisites"
                  )}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${showCourseDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showCourseDropdown && !isLoadingCourses && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-10">
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleCourseSelect(course)}
                      className={`w-full text-left p-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                        selectedCourse?.id === course.id ? "bg-purple-50" : ""
                      }`}
                      type="button"
                    >
                      <h4 className="font-semibold text-sm text-gray-800 mb-1">{course.title}</h4>
                      {course.short_description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{course.short_description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {course.difficulty_level && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{course.difficulty_level}</span>
                        )}
                        {course.status && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              course.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {course.status}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          {!selectedCourse ? (
            <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Course Selected</h3>
              <p className="text-sm text-gray-500">Select a course from the dropdown above to manage its prerequisites</p>
            </div>
          ) : (
            <>
              {/* Existing Prerequisites Section */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Current Prerequisites</h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {existingPrerequisites.length} prerequisite{existingPrerequisites.length !== 1 ? "s" : ""} required
                    </p>
                  </div>
                </div>

                {isLoadingPrerequisites ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : existingPrerequisites.length === 0 ? (
                  <div className="text-center py-12">
                    <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-600 mb-1">No Prerequisites</h3>
                    <p className="text-sm text-gray-500">This course has no prerequisites. Add some below.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingPrerequisites.map((prereq, index) => {
                      const courseInfo = prereq.prerequisite_course || {};
                      return (
                        <div
                          key={prereq.id}
                          className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-800 mb-1">
                                {courseInfo.title || "Unknown Course"}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                {courseInfo.difficulty_level && (
                                  <span className="text-xs px-2 py-0.5 bg-white border border-purple-200 text-purple-700 rounded">
                                    {courseInfo.difficulty_level}
                                  </span>
                                )}
                                {courseInfo.status && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      courseInfo.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {courseInfo.status}
                                  </span>
                                )}
                                {courseInfo.price && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                                    <DollarSign size={12} />
                                    {courseInfo.price}
                                  </span>
                                )}
                              </div>

                              {courseInfo.instructor_name && (
                                <p className="text-xs text-gray-600">
                                  Instructor: <span className="font-medium">{courseInfo.instructor_name}</span>
                                </p>
                              )}

                              <p className="text-xs text-gray-500 mt-1">
                                Added: {new Date(prereq.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <button
                              onClick={() => deletePrerequisite(prereq.id)}
                              className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove prerequisite"
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Prerequisites Section */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Add Prerequisites</h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Select prerequisite courses ({selectedPrerequisites.length} selected)
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5 w-4 h-4" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {filteredAvailableCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto text-gray-400 mb-3 w-12 h-12" />
                    <p className="text-gray-600 text-sm">
                      {searchTerm ? "No courses found" : "No other courses available to add"}
                    </p>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm("")} className="mt-3 text-blue-600 text-sm hover:underline" type="button">
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                    {filteredAvailableCourses.map((course) => (
                      <label
                        key={course.id}
                        className={`flex items-start gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedPrerequisites.includes(course.id) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={selectedPrerequisites.includes(course.id)}
                            onChange={() => handleTogglePrerequisite(course.id)}
                            disabled={isSaving}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm sm:text-base">{course.title}</p>
                              {course.short_description && (
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{course.short_description}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              {course.difficulty_level && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{course.difficulty_level}</span>
                              )}
                              {course.status && (
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    course.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {course.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Save Button */}
                {filteredAvailableCourses.length > 0 && (
                  <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSavePrerequisites}
                      disabled={isSaving || selectedPrerequisites.length === 0}
                      className={`bg-blue-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 font-medium ${
                        isSaving || selectedPrerequisites.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      type="button"
                    >
                      {isSaving ? (
                        <>
                          <Loader className="animate-spin w-4 h-4" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Prerequisites ({selectedPrerequisites.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Click outside dropdown to close */}
        {showCourseDropdown && (
          <div className="fixed inset-0 z-0" onClick={() => setShowCourseDropdown(false)} />
        )}
      </div>
    </>
  );
}

