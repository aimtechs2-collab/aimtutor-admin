"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/admin-api-client";
import {
  Plus,
  X,
  Save,
  ChevronDown,
  BookOpen,
  Edit2,
  Trash2,
  Search,
  Loader,
  FolderOpen,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { CheckCircle, XCircle } from "lucide-react";

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
    const t = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  const Icon = type === "success" ? CheckCircle : XCircle;
  return (
    <div
      className={`fixed top-4 right-4 left-4 sm:left-auto max-w-sm ${bgColor} text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[60] transition-all duration-300`}
      style={{
        transform: isVisible ? "translateX(0)" : "translateX(400px)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <Icon size={20} />
      <span className="text-sm sm:text-base flex-1">{message}</span>
      <button type="button" onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  );
}

export default function ModulesManagerClient() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [moduleSubmitting, setModuleSubmitting] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, moduleId: null as number | null, moduleName: "" });
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", is_preview: false });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const res = await api.post<any>("/api/v1/courses/get-courses?per_page=all");
        if (!cancelled) setCourses(res.data?.courses || []);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setToast({ type: "error", message: "Failed to load courses. Please refresh and try again." });
        }
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    };
    void fetchCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchModules = useCallback(async (courseId: number) => {
    if (!courseId || !isMountedRef.current) return;
    setModulesLoading(true);
    setModulesError(null);
    try {
      const res = await api.post<any>(`/api/v1/courses/get-courses/${courseId}?lessons=true`);
      const modulesData = res.data?.course?.modules || res.data?.modules || [];
      const sorted = [...modulesData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      if (isMountedRef.current) setModules(sorted);
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Failed to load modules";
        setModulesError(errorMsg);
        setToast({ type: "error", message: errorMsg });
        setModules([]);
      }
    } finally {
      if (isMountedRef.current) setModulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) void fetchModules(selectedCourseId);
    else setModules([]);
  }, [selectedCourseId, fetchModules]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ id: c.id, label: c.title || "Untitled Course" })),
    [courses],
  );
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return courseOptions;
    const lower = searchTerm.toLowerCase();
    return courseOptions.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [courseOptions, searchTerm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dropdownOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setDropdownOpen(true);
          setFocusedOptionIndex(0);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setFocusedOptionIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedOptionIndex((prev) => (prev === filteredOptions.length - 1 ? 0 : prev + 1));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedOptionIndex >= 0 && focusedOptionIndex < filteredOptions.length) {
            const opt = filteredOptions[focusedOptionIndex];
            setSelectedCourseId(Number(opt.id));
            setSearchTerm(opt.label);
            setDropdownOpen(false);
            setFocusedOptionIndex(-1);
            setShowMobileSearch(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setDropdownOpen(false);
          setFocusedOptionIndex(-1);
          break;
        default:
          break;
      }
    },
    [dropdownOpen, filteredOptions, focusedOptionIndex],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setFocusedOptionIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      const course = courseOptions.find((c) => Number(c.id) === Number(selectedCourseId));
      if (course) setSearchTerm(course.label);
    }
  }, [selectedCourseId, courseOptions]);

  const openModuleModal = useCallback(
    (module: any = null) => {
      if (!selectedCourseId && !module) {
        setToast({ type: "error", message: "Please select a course first" });
        return;
      }
      modalTriggerRef.current = document.activeElement as HTMLElement;
      setEditingModule(module);
      setModuleForm({
        title: module?.title || "",
        description: module?.description || "",
        is_preview: module?.is_preview || false,
      });
      setShowModuleModal(true);
    },
    [selectedCourseId],
  );

  const closeModuleModal = useCallback(() => {
    setShowModuleModal(false);
    setEditingModule(null);
    setModuleForm({ title: "", description: "", is_preview: false });
    setTimeout(() => modalTriggerRef.current?.focus(), 100);
  }, []);

  const handleModuleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setModuleForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const submitModule = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCourseId) {
        setToast({ type: "error", message: "Please select a course first" });
        return;
      }
      if (!moduleForm.title.trim()) {
        setToast({ type: "error", message: "Module title is required" });
        return;
      }
      setModuleSubmitting(true);
      try {
        const payload = {
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || undefined,
          is_preview: moduleForm.is_preview,
        };
        if (editingModule) {
          await api.put(`/api/v1/modules/update-modules/${editingModule.id}`, payload);
          setModules((prev) =>
            prev.map((m) => (m.id === editingModule.id ? { ...m, ...payload } : m)),
          );
          setToast({ type: "success", message: "Module updated successfully" });
        } else {
          const res = await api.post<any>(`/api/v1/modules/create-modules/${selectedCourseId}`, payload);
          const newModule = res.data?.module || res.data;
          if (newModule) {
            setModules((prev) => [...prev, newModule].sort((a, b) => (a.order || 0) - (b.order || 0)));
            setToast({ type: "success", message: res.data?.message || "Module created successfully" });
          }
        }
        closeModuleModal();
      } catch (err: any) {
        console.error(err);
        setToast({
          type: "error",
          message: err.response?.data?.error || `Failed to ${editingModule ? "update" : "create"} module`,
        });
      } finally {
        setModuleSubmitting(false);
      }
    },
    [selectedCourseId, moduleForm, editingModule, closeModuleModal],
  );

  const confirmDeleteModule = useCallback((module: any) => {
    setDeleteConfirm({ show: true, moduleId: module.id, moduleName: module.title });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ show: false, moduleId: null, moduleName: "" });
  }, []);

  const deleteModule = useCallback(async () => {
    const { moduleId } = deleteConfirm;
    if (moduleId == null) return;
    try {
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      setDeleteConfirm({ show: false, moduleId: null, moduleName: "" });
      await api.delete(`/api/v1/modules/delete-modules/${moduleId}`);
      setToast({ type: "success", message: "Module deleted successfully" });
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to delete module" });
      if (selectedCourseId) void fetchModules(selectedCourseId);
    }
  }, [deleteConfirm, selectedCourseId, fetchModules]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showModuleModal && !moduleSubmitting) closeModuleModal();
        if (deleteConfirm.show) cancelDelete();
        if (showMobileSearch) setShowMobileSearch(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showModuleModal, moduleSubmitting, deleteConfirm.show, closeModuleModal, cancelDelete, showMobileSearch]);

  const selectedCourseName = useMemo(() => {
    if (!selectedCourseId) return null;
    const course = courseOptions.find((c) => Number(c.id) === Number(selectedCourseId));
    return course?.label || null;
  }, [selectedCourseId, courseOptions]);

  const ModuleCard = useCallback(
    ({ module }: { module: any }) => {
      const lessons = Array.isArray(module.lessons) ? module.lessons : [];
      const lessonCount = lessons.length;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <BookOpen size={16} className="text-blue-600 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate sm:whitespace-normal">
                      {module.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                      {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                    </p>
                    {module.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mt-1 sm:mt-2 hidden xs:block">
                        {module.description}
                      </p>
                    )}
                    {module.is_preview && (
                      <span className="inline-flex items-center mt-1.5 sm:mt-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs font-medium rounded-full">
                        Preview
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openModuleModal(module)}
                  className="p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation"
                  title="Edit Module"
                  aria-label={`Edit ${module.title}`}
                >
                  <Edit2 size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeleteModule(module)}
                  className="p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                  title="Delete Module"
                  aria-label={`Delete ${module.title}`}
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
            {module.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mt-2 xs:hidden">{module.description}</p>
            )}
          </div>
        </div>
      );
    },
    [openModuleModal, confirmDeleteModule],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 py-3 sm:py-4 lg:py-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 touch-manipulation"
                title="Back to Admin"
                aria-label="Back to Admin Dashboard"
              >
                <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Module Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
                  Create and manage modules for your courses
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="relative" ref={dropdownRef}>
                <div className="relative w-64 lg:w-72">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm || ""}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setDropdownOpen(true);
                      setFocusedOptionIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={coursesLoading ? "Loading courses..." : "Search or select a course"}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    disabled={coursesLoading}
                    onFocus={() => setDropdownOpen(true)}
                    aria-label="Select course"
                    aria-expanded={dropdownOpen}
                    role="combobox"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {coursesLoading ? (
                      <Loader size={16} className="text-gray-400 animate-spin" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                  {dropdownOpen && !coursesLoading && (
                    <div
                      id="course-listbox"
                      className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      role="listbox"
                    >
                      {filteredOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          {courseOptions.length === 0 ? "No courses available" : "No matches found"}
                        </div>
                      ) : (
                        filteredOptions.map((opt, index) => (
                          <div
                            key={opt.id}
                            id={`option-${opt.id}`}
                            className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 text-sm ${
                              selectedCourseId === Number(opt.id)
                                ? "bg-blue-50 text-blue-600"
                                : focusedOptionIndex === index
                                  ? "bg-gray-100"
                                  : ""
                            }`}
                            onClick={() => {
                              setSelectedCourseId(Number(opt.id));
                              setSearchTerm(opt.label);
                              setDropdownOpen(false);
                              setFocusedOptionIndex(-1);
                            }}
                            role="option"
                            aria-selected={selectedCourseId === Number(opt.id)}
                          >
                            {opt.label}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openModuleModal()}
                disabled={!selectedCourseId || coursesLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                aria-label="Add new module"
              >
                <Plus size={16} />
                <span>Add Module</span>
              </button>
            </div>
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMobileSearch(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
                aria-label="Search courses"
              >
                <Search size={20} className="text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => openModuleModal()}
                disabled={!selectedCourseId || coursesLoading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation"
                aria-label="Add new module"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          {selectedCourseName && (
            <div className="md:hidden pb-3 -mt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Course:</span>
                <span className="font-medium text-gray-900 truncate">{selectedCourseName}</span>
                <button
                  type="button"
                  onClick={() => setShowMobileSearch(true)}
                  className="text-blue-600 text-xs font-medium ml-auto flex-shrink-0"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMobileSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white h-full flex flex-col">
            <div className="flex items-center gap-3 p-3 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
                aria-label="Close search"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 relative" ref={dropdownRef}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm || ""}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setDropdownOpen(true);
                    setFocusedOptionIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={coursesLoading ? "Loading..." : "Search courses..."}
                  className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={coursesLoading}
                  autoComplete="off"
                  aria-label="Select course"
                />
                {coursesLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <Loader size={16} className="text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {coursesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader size={24} className="text-blue-600 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  {courseOptions.length === 0 ? "No courses available" : "No matches found"}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`w-full px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                        selectedCourseId === Number(opt.id) ? "bg-blue-50 text-blue-600" : "text-gray-900"
                      }`}
                      onClick={() => {
                        setSelectedCourseId(Number(opt.id));
                        setSearchTerm(opt.label);
                        setDropdownOpen(false);
                        setFocusedOptionIndex(-1);
                        setShowMobileSearch(false);
                      }}
                    >
                      <span className="text-base">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {!selectedCourseId ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200 shadow-sm px-4">
            <BookOpen size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300 sm:w-12 sm:h-12" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Select a course to get started</h3>
            <p className="text-sm text-gray-600 mb-4 sm:mb-0">Choose a course to manage its modules</p>
            <button
              type="button"
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <Search size={16} />
              <span>Select Course</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Modules</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1" role="status" aria-live="polite">
                  {modulesLoading
                    ? "Loading modules..."
                    : `${modules.length} module${modules.length !== 1 ? "s" : ""} found`}
                </p>
              </div>
            </div>
            {modulesLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <div className="animate-pulse">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : modulesError ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 sm:p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle size={18} className="mr-2 sm:mr-3 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-red-800 text-sm sm:text-base">Error loading modules</h3>
                    <p className="mt-1 text-xs sm:text-sm break-words">{modulesError}</p>
                    <button
                      type="button"
                      onClick={() => selectedCourseId && void fetchModules(selectedCourseId)}
                      className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-red-800 hover:text-red-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200 shadow-sm px-4">
                <FolderOpen size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300 sm:w-12 sm:h-12" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No modules yet</h3>
                <p className="text-sm text-gray-600 mb-4 sm:mb-6">Get started by creating your first module</p>
                <button
                  type="button"
                  onClick={() => openModuleModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  <Plus size={16} />
                  Create First Module
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {modules.map((m) => (
                  <ModuleCard key={m.id} module={m} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModuleModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !moduleSubmitting) closeModuleModal();
          }}
        >
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-auto">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 id="module-modal-title" className="text-base sm:text-lg font-semibold text-gray-900">
                {editingModule ? "Edit Module" : "Add New Module"}
              </h3>
              <button
                type="button"
                onClick={() => !moduleSubmitting && closeModuleModal()}
                disabled={moduleSubmitting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 touch-manipulation"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitModule} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="module-title" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Module Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="module-title"
                  name="title"
                  value={moduleForm.title}
                  onChange={handleModuleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Enter module title"
                  required
                  disabled={moduleSubmitting}
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="module-description"
                  className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                >
                  Description
                </label>
                <textarea
                  id="module-description"
                  name="description"
                  value={moduleForm.description}
                  onChange={handleModuleChange}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-200"
                  placeholder="Enter module description (optional)"
                  disabled={moduleSubmitting}
                />
              </div>
              <div className="flex items-center">
                <label className="inline-flex items-center gap-2.5 sm:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_preview"
                    checked={moduleForm.is_preview}
                    onChange={handleModuleChange}
                    disabled={moduleSubmitting}
                    className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Mark as preview content</span>
                </label>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => closeModuleModal()}
                  disabled={moduleSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={moduleSubmitting || !moduleForm.title.trim()}
                  className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {moduleSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      <span>{editingModule ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editingModule ? "Update Module" : "Create Module"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelDelete();
          }}
        >
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-red-100 rounded-full flex-shrink-0">
                  <AlertCircle size={20} className="text-red-600 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="delete-modal-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
                    Delete Module
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Are you sure you want to delete <strong className="break-words">&quot;{deleteConfirm.moduleName}&quot;</strong>?
                  </p>
                  <p className="text-xs sm:text-sm text-red-600">
                    This action cannot be undone and will delete all associated lessons.
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void deleteModule()}
                  className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200"
                >
                  Delete Module
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
