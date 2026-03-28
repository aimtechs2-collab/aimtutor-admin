"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/admin-api-client";
import { uploadVideoToCloudinary, type CloudinarySignPayload } from "@/lib/cloudinary-upload";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  Save,
  Play,
  Clock,
  BookOpen,
  Paperclip,
  AlertCircle,
  Loader,
  FolderOpen,
  Upload,
  ChevronDown,
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

function mapLesson(l: any) {
  const resources = (l.resources || []).map((r: any) => ({
    id: r.id,
    lesson_id: r.lessonId ?? r.lesson_id,
    title: r.title,
    file_path: r.filePath ?? r.file_path,
    file_type: r.fileType ?? r.file_type,
    file_size: r.fileSize ?? r.file_size,
  }));
  return {
    id: l.id,
    module_id: l.moduleId ?? l.module_id,
    title: l.title,
    content: l.content,
    video_url: l.videoUrl ?? l.video_url,
    duration_minutes: l.durationMinutes ?? l.duration_minutes,
    order: l.sortOrder ?? l.order,
    is_preview: l.isPreview ?? l.is_preview,
    resources,
  };
}

export default function LessonManagementClient() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseSearchTerm, setCourseSearchTerm] = useState("");
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [courseFocusedIndex, setCourseFocusedIndex] = useState(-1);
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [moduleSearchTerm, setModuleSearchTerm] = useState("");
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const [moduleFocusedIndex, setModuleFocusedIndex] = useState(-1);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    lessonId: null as number | null,
    lessonName: "",
  });
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content: "",
    video_file: null as File | null,
    duration_minutes: "" as string | number,
    is_preview: false,
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const courseSearchRef = useRef<HTMLInputElement>(null);
  const moduleSearchRef = useRef<HTMLInputElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
          setToast({ type: "error", message: "Failed to load courses" });
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
    try {
      const res = await api.post<any>(`/api/v1/courses/get-courses/${courseId}?lessons=false`);
      const modulesData = res.data?.course?.modules || res.data?.modules || [];
      const sorted = [...modulesData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      if (isMountedRef.current) setModules(sorted);
    } catch (err) {
      if (isMountedRef.current) {
        console.error(err);
        setToast({ type: "error", message: "Failed to load modules" });
        setModules([]);
      }
    } finally {
      if (isMountedRef.current) setModulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      void fetchModules(selectedCourseId);
      setSelectedModuleId(null);
      setModuleSearchTerm("");
      setLessons([]);
    } else {
      setModules([]);
      setSelectedModuleId(null);
      setModuleSearchTerm("");
      setLessons([]);
    }
  }, [selectedCourseId, fetchModules]);

  const fetchLessons = useCallback(async (_courseId: number, moduleId: number) => {
    if (!moduleId || !isMountedRef.current) return;
    setLessonsLoading(true);
    setLessonsError(null);
    try {
      const res = await api.post<any>(`/api/v1/lessons/get-lessons?module_id=${moduleId}`);
      const raw = res.data?.lessons || [];
      const sorted = [...raw].sort((a: any, b: any) => (a.sortOrder ?? a.order ?? 0) - (b.sortOrder ?? b.order ?? 0));
      if (isMountedRef.current) setLessons(sorted.map(mapLesson));
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Failed to load lessons";
        setLessonsError(errorMsg);
        setToast({ type: "error", message: errorMsg });
        setLessons([]);
      }
    } finally {
      if (isMountedRef.current) setLessonsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId && selectedModuleId) {
      void fetchLessons(selectedCourseId, selectedModuleId);
    } else {
      setLessons([]);
    }
  }, [selectedCourseId, selectedModuleId, fetchLessons]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ id: c.id, label: c.title || "Untitled Course" })),
    [courses],
  );
  const moduleOptions = useMemo(
    () => modules.map((m) => ({ id: m.id, label: m.title || "Untitled Module" })),
    [modules],
  );
  const filteredCourseOptions = useMemo(() => {
    if (!courseSearchTerm) return courseOptions;
    const q = courseSearchTerm.toLowerCase();
    return courseOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [courseOptions, courseSearchTerm]);
  const filteredModuleOptions = useMemo(() => {
    if (!moduleSearchTerm) return moduleOptions;
    const q = moduleSearchTerm.toLowerCase();
    return moduleOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [moduleOptions, moduleSearchTerm]);

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId),
    [modules, selectedModuleId],
  );
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId],
  );

  useEffect(() => {
    if (selectedCourseId) {
      const course = courseOptions.find((c) => c.id === selectedCourseId);
      if (course) setCourseSearchTerm(course.label);
    }
  }, [selectedCourseId, courseOptions]);

  useEffect(() => {
    if (selectedModuleId) {
      const mod = moduleOptions.find((m) => m.id === selectedModuleId);
      if (mod) setModuleSearchTerm(mod.label);
    }
  }, [selectedModuleId, moduleOptions]);

  const handleCourseKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!courseDropdownOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setCourseDropdownOpen(true);
          setCourseFocusedIndex(0);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setCourseFocusedIndex((prev) => (prev <= 0 ? filteredCourseOptions.length - 1 : prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setCourseFocusedIndex((prev) => (prev === filteredCourseOptions.length - 1 ? 0 : prev + 1));
          break;
        case "Enter":
          e.preventDefault();
          if (courseFocusedIndex >= 0 && courseFocusedIndex < filteredCourseOptions.length) {
            const sel = filteredCourseOptions[courseFocusedIndex];
            setSelectedCourseId(sel.id);
            setCourseSearchTerm(sel.label);
            setCourseDropdownOpen(false);
            setCourseFocusedIndex(-1);
          }
          break;
        case "Escape":
          e.preventDefault();
          setCourseDropdownOpen(false);
          setCourseFocusedIndex(-1);
          break;
        default:
          break;
      }
    },
    [courseDropdownOpen, filteredCourseOptions, courseFocusedIndex],
  );

  const handleModuleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!moduleDropdownOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setModuleDropdownOpen(true);
          setModuleFocusedIndex(0);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setModuleFocusedIndex((prev) => (prev <= 0 ? filteredModuleOptions.length - 1 : prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setModuleFocusedIndex((prev) => (prev === filteredModuleOptions.length - 1 ? 0 : prev + 1));
          break;
        case "Enter":
          e.preventDefault();
          if (moduleFocusedIndex >= 0 && moduleFocusedIndex < filteredModuleOptions.length) {
            const sel = filteredModuleOptions[moduleFocusedIndex];
            setSelectedModuleId(sel.id);
            setModuleSearchTerm(sel.label);
            setModuleDropdownOpen(false);
            setModuleFocusedIndex(-1);
          }
          break;
        case "Escape":
          e.preventDefault();
          setModuleDropdownOpen(false);
          setModuleFocusedIndex(-1);
          break;
        default:
          break;
      }
    },
    [moduleDropdownOpen, filteredModuleOptions, moduleFocusedIndex],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setCourseDropdownOpen(false);
        setCourseFocusedIndex(-1);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target as Node)) {
        setModuleDropdownOpen(false);
        setModuleFocusedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openLessonModal = useCallback(
    (lesson: any = null) => {
      if (!selectedCourseId || !selectedModuleId) {
        setToast({ type: "error", message: "Please select a course and module first" });
        return;
      }
      modalTriggerRef.current = document.activeElement as HTMLElement;
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson?.title || "",
        content: lesson?.content || "",
        video_file: null,
        duration_minutes: lesson?.duration_minutes || "",
        is_preview: lesson?.is_preview || false,
      });
      setShowLessonModal(true);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    },
    [selectedCourseId, selectedModuleId],
  );

  const closeLessonModal = useCallback(() => {
    setShowLessonModal(false);
    setEditingLesson(null);
    setLessonForm({
      title: "",
      content: "",
      video_file: null,
      duration_minutes: "",
      is_preview: false,
    });
    if (videoInputRef.current) videoInputRef.current.value = "";
    setTimeout(() => modalTriggerRef.current?.focus(), 100);
  }, []);

  const handleLessonChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const files = (e.target as HTMLInputElement).files;
    const checked = (e.target as HTMLInputElement).checked;
    setLessonForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" && files?.[0] ? files[0] : value,
    }));
  }, []);

  const requestCloudinarySign = useCallback(async (): Promise<CloudinarySignPayload | null> => {
    const res = await fetch("/api/admin/cloudinary/sign-upload", { method: "POST", credentials: "same-origin" });
    if (res.status === 503) return null;
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error || "Could not prepare Cloudinary upload");
    }
    return res.json() as Promise<CloudinarySignPayload>;
  }, []);

  const submitLesson = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCourseId || !selectedModuleId) {
        setToast({ type: "error", message: "Please select a course and module first" });
        return;
      }
      if (!lessonForm.title.trim()) {
        setToast({ type: "error", message: "Lesson title is required" });
        return;
      }
      setLessonSubmitting(true);
      try {
        let cloudVideoUrl: string | undefined;
        if (lessonForm.video_file) {
          const sign = await requestCloudinarySign();
          if (sign) {
            cloudVideoUrl = await uploadVideoToCloudinary(lessonForm.video_file, sign);
          }
        }

        const durationNum = lessonForm.duration_minutes ? parseInt(String(lessonForm.duration_minutes), 10) : 0;

        const jsonPayload = {
          title: lessonForm.title,
          content: lessonForm.content || "",
          duration_minutes: Number.isFinite(durationNum) ? durationNum : 0,
          is_preview: lessonForm.is_preview,
          ...(cloudVideoUrl ? { video_url: cloudVideoUrl } : {}),
        };

        if (editingLesson) {
          if (lessonForm.video_file && !cloudVideoUrl) {
            const formData = new FormData();
            formData.append("title", lessonForm.title);
            formData.append("content", lessonForm.content || "");
            formData.append("duration_minutes", String(lessonForm.duration_minutes || 0));
            formData.append("is_preview", String(lessonForm.is_preview));
            formData.append("video", lessonForm.video_file);
            await api.put(`/api/v1/lessons/update-lessons/${editingLesson.id}`, formData);
          } else {
            await api.put(`/api/v1/lessons/update-lessons/${editingLesson.id}`, jsonPayload);
          }
          await fetchLessons(selectedCourseId, selectedModuleId);
          setToast({ type: "success", message: "Lesson updated successfully" });
        } else {
          if (lessonForm.video_file && !cloudVideoUrl) {
            const formData = new FormData();
            formData.append("title", lessonForm.title);
            formData.append("content", lessonForm.content || "");
            formData.append("duration_minutes", String(lessonForm.duration_minutes || 0));
            formData.append("is_preview", String(lessonForm.is_preview));
            formData.append("video", lessonForm.video_file);
            const res = await api.post<any>(`/api/v1/lessons/create-lessons/${selectedModuleId}`, formData);
            await fetchLessons(selectedCourseId, selectedModuleId);
            setToast({ type: "success", message: res.data?.message || "Lesson created successfully" });
          } else {
            const res = await api.post<any>(`/api/v1/lessons/create-lessons/${selectedModuleId}`, jsonPayload);
            await fetchLessons(selectedCourseId, selectedModuleId);
            setToast({ type: "success", message: res.data?.message || "Lesson created successfully" });
          }
        }
        closeLessonModal();
      } catch (err: any) {
        console.error(err);
        setToast({
          type: "error",
          message:
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            `Failed to ${editingLesson ? "update" : "create"} lesson`,
        });
      } finally {
        setLessonSubmitting(false);
      }
    },
    [
      selectedCourseId,
      selectedModuleId,
      lessonForm,
      editingLesson,
      closeLessonModal,
      fetchLessons,
      requestCloudinarySign,
    ],
  );

  const confirmDeleteLesson = useCallback((lesson: any) => {
    setDeleteConfirm({ show: true, lessonId: lesson.id, lessonName: lesson.title });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ show: false, lessonId: null, lessonName: "" });
  }, []);

  const deleteLesson = useCallback(async () => {
    const { lessonId } = deleteConfirm;
    if (lessonId == null) return;
    try {
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      setDeleteConfirm({ show: false, lessonId: null, lessonName: "" });
      await api.delete(`/api/v1/lessons/delete-lessons/${lessonId}`);
      setToast({ type: "success", message: "Lesson deleted successfully" });
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to delete lesson" });
      if (selectedCourseId && selectedModuleId) void fetchLessons(selectedCourseId, selectedModuleId);
    }
  }, [deleteConfirm, selectedCourseId, selectedModuleId, fetchLessons]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLessonModal && !lessonSubmitting) closeLessonModal();
        if (deleteConfirm.show) cancelDelete();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLessonModal, lessonSubmitting, deleteConfirm.show, closeLessonModal, cancelDelete]);

  const formatDuration = useCallback((minutes: number | null | undefined) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hr${hours !== 1 ? "s" : ""}`;
    return `${hours} hr${hours !== 1 ? "s" : ""} ${remainingMinutes} min${remainingMinutes !== 1 ? "s" : ""}`;
  }, []);

  const LessonCard = useCallback(
    ({ lesson, index }: { lesson: any; index: number }) => {
      const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
      const hasResources = resources.length > 0;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <Play size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">{lesson.title}</h4>
                    {lesson.content && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{lesson.content}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                      #{index + 1}
                    </span>
                    {lesson.duration_minutes ? (
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(lesson.duration_minutes)}
                      </span>
                    ) : null}
                    {lesson.is_preview && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                        Preview
                      </span>
                    )}
                    {hasResources && (
                      <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium flex items-center gap-1">
                        <Paperclip size={12} />
                        {resources.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => openLessonModal(lesson)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                aria-label={`Edit ${lesson.title}`}
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteLesson(lesson)}
                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                aria-label={`Delete ${lesson.title}`}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    },
    [formatDuration, openLessonModal, confirmDeleteLesson],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 lg:py-6">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Back to Admin"
                  aria-label="Back to Admin Dashboard"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Lesson Management</h1>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-12">Create and manage lessons for your modules</p>
            </div>
            <button
              type="button"
              onClick={() => openLessonModal()}
              disabled={!selectedCourseId || !selectedModuleId}
              className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Add new lesson"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Lesson</span>
            </button>
          </div>
          <div className="pb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1" ref={courseDropdownRef}>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Course</label>
              <div className="relative">
                <input
                  ref={courseSearchRef}
                  type="text"
                  value={courseSearchTerm || ""}
                  onChange={(e) => {
                    setCourseSearchTerm(e.target.value);
                    setCourseDropdownOpen(true);
                    setCourseFocusedIndex(0);
                  }}
                  onKeyDown={handleCourseKeyDown}
                  placeholder={coursesLoading ? "Loading courses..." : "Search or select a course"}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={coursesLoading}
                  onFocus={() => setCourseDropdownOpen(true)}
                  aria-label="Select course"
                  aria-expanded={courseDropdownOpen}
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
                {courseDropdownOpen && !coursesLoading && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto" role="listbox">
                    {filteredCourseOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {courseOptions.length === 0 ? "No courses available" : "No matches found"}
                      </div>
                    ) : (
                      filteredCourseOptions.map((opt, index) => (
                        <div
                          key={opt.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                            selectedCourseId === opt.id
                              ? "bg-blue-50 text-blue-600"
                              : courseFocusedIndex === index
                                ? "bg-gray-100"
                                : ""
                          }`}
                          onClick={() => {
                            setSelectedCourseId(opt.id);
                            setCourseSearchTerm(opt.label);
                            setCourseDropdownOpen(false);
                            setCourseFocusedIndex(-1);
                          }}
                          role="option"
                          aria-selected={selectedCourseId === opt.id}
                        >
                          {opt.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="relative flex-1" ref={moduleDropdownRef}>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Module</label>
              <div className="relative">
                <input
                  ref={moduleSearchRef}
                  type="text"
                  value={moduleSearchTerm || ""}
                  onChange={(e) => {
                    setModuleSearchTerm(e.target.value);
                    setModuleDropdownOpen(true);
                    setModuleFocusedIndex(0);
                  }}
                  onKeyDown={handleModuleKeyDown}
                  placeholder={
                    !selectedCourseId
                      ? "Select a course first"
                      : modulesLoading
                        ? "Loading modules..."
                        : "Search or select a module"
                  }
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={!selectedCourseId || modulesLoading}
                  onFocus={() => setModuleDropdownOpen(true)}
                  aria-label="Select module"
                  aria-expanded={moduleDropdownOpen}
                  role="combobox"
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {modulesLoading ? (
                    <Loader size={16} className="text-gray-400 animate-spin" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
                {moduleDropdownOpen && !modulesLoading && selectedCourseId && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto" role="listbox">
                    {filteredModuleOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {moduleOptions.length === 0 ? "No modules available" : "No matches found"}
                      </div>
                    ) : (
                      filteredModuleOptions.map((opt, index) => (
                        <div
                          key={opt.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                            selectedModuleId === opt.id
                              ? "bg-blue-50 text-blue-600"
                              : moduleFocusedIndex === index
                                ? "bg-gray-100"
                                : ""
                          }`}
                          onClick={() => {
                            setSelectedModuleId(opt.id);
                            setModuleSearchTerm(opt.label);
                            setModuleDropdownOpen(false);
                            setModuleFocusedIndex(-1);
                          }}
                          role="option"
                          aria-selected={selectedModuleId === opt.id}
                        >
                          {opt.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {!selectedCourseId ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a course to get started</h3>
            <p className="text-gray-600">Choose a course from the dropdown above to view its modules</p>
          </div>
        ) : !selectedModuleId ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a module to manage lessons</h3>
            <p className="text-gray-600">Choose a module from the dropdown to view and manage its lessons</p>
          </div>
        ) : (
          <>
            {selectedModule && (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <BookOpen size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{selectedModule.title}</h2>
                    {selectedModule.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedModule.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      <span className="text-sm text-gray-600">
                        Course: <span className="font-medium">{selectedCourse?.title}</span>
                      </span>
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                      </span>
                      {selectedModule.is_preview && (
                        <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Preview
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Lessons</h3>
                <span className="text-sm text-gray-500" role="status" aria-live="polite">
                  {lessonsLoading ? "Loading..." : `${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
            {lessonsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 w-3/4 rounded mb-2" />
                        <div className="h-4 bg-gray-200 w-1/2 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : lessonsError ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800">Error loading lessons</h3>
                    <p className="mt-1">{lessonsError}</p>
                    <button
                      type="button"
                      onClick={() =>
                        selectedCourseId && selectedModuleId && void fetchLessons(selectedCourseId, selectedModuleId)
                      }
                      className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
                <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first lesson for this module</p>
                <button
                  type="button"
                  onClick={() => openLessonModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  <Plus size={16} />
                  Create First Lesson
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <LessonCard key={lesson.id} lesson={lesson} index={index} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showLessonModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-modal-title"
        >
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 id="lesson-modal-title" className="text-lg font-semibold text-gray-900">
                  {editingLesson ? "Edit Lesson" : "Add New Lesson"}
                </h3>
                <p className="text-sm text-gray-600 mt-1 truncate max-w-[220px] sm:max-w-md">
                  Module: <span className="font-medium">{selectedModule?.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeLessonModal}
                disabled={lessonSubmitting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitLesson} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Title <span className="text-red-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  id="lesson-title"
                  name="title"
                  value={lessonForm.title}
                  onChange={handleLessonChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Enter lesson title"
                  required
                  disabled={lessonSubmitting}
                />
              </div>
              <div>
                <label htmlFor="lesson-content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id="lesson-content"
                  name="content"
                  value={lessonForm.content}
                  onChange={handleLessonChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-200"
                  placeholder="Enter lesson content, description, or notes (optional)"
                  disabled={lessonSubmitting}
                />
              </div>
              <div>
                <label htmlFor="video_file" className="block text-sm font-medium text-gray-700 mb-2">
                  Video File
                  {editingLesson && (
                    <span className="text-gray-500 text-xs ml-2">(Upload new video to replace existing one)</span>
                  )}
                </label>
                {editingLesson && editingLesson.video_url && !lessonForm.video_file && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Play size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900">Current Video</p>
                        <p className="text-xs text-blue-700 truncate mt-0.5">
                          {String(editingLesson.video_url).split("/").pop()}
                        </p>
                        {editingLesson.duration_minutes ? (
                          <p className="text-xs text-blue-600 mt-1">
                            Duration: {formatDuration(editingLesson.duration_minutes)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 relative">
                  {lessonForm.video_file ? (
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Play size={24} className="text-green-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1 break-all">{lessonForm.video_file.name}</p>
                      <p className="text-xs text-gray-500">{(lessonForm.video_file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      {editingLesson && (
                        <p className="text-xs text-orange-600 mt-2">This will replace the current video</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setLessonForm((prev) => ({ ...prev, video_file: null }));
                          if (videoInputRef.current) videoInputRef.current.value = "";
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                        disabled={lessonSubmitting}
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="video_file" className="block p-4 text-center cursor-pointer">
                      <div className="flex items-center justify-center mb-2">
                        <Upload size={24} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {editingLesson
                          ? "Upload a new video to replace current one or leave empty to keep it"
                          : "Drag and drop a video file or"}{" "}
                        <span className="text-blue-600 font-medium">browse</span>
                      </p>
                      <p className="text-xs text-gray-500">Supported formats: MP4, MOV, WEBM, AVI (Max: 500MB)</p>
                      <p className="text-xs text-gray-500 mt-1">
                        With <span className="font-medium">CLOUDINARY_URL</span> set, video goes straight to Cloudinary
                        (no slow server hop); stored URL uses automatic quality/format optimization.
                      </p>
                      <input
                        id="video_file"
                        ref={videoInputRef}
                        name="video_file"
                        type="file"
                        accept="video/*"
                        onChange={handleLessonChange}
                        className="hidden"
                        disabled={lessonSubmitting}
                      />
                    </label>
                  )}
                </div>
                {!editingLesson && (
                  <p className="text-xs text-gray-500 mt-1">Optional: You can upload a video now or add it later</p>
                )}
              </div>
              <div>
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  value={lessonForm.duration_minutes}
                  onChange={handleLessonChange}
                  type="number"
                  min={1}
                  max={999}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="30"
                  disabled={lessonSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">How long this lesson takes to complete</p>
              </div>
              <div className="flex items-center">
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="is_preview"
                    name="is_preview"
                    checked={lessonForm.is_preview}
                    onChange={handleLessonChange}
                    disabled={lessonSubmitting}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Mark this lesson as preview content</span>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeLessonModal}
                  disabled={lessonSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={lessonSubmitting || !lessonForm.title.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {lessonSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      <span>{editingLesson ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editingLesson ? "Update Lesson" : "Create Lesson"}</span>
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
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                  <AlertCircle size={24} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 mb-2">
                    Delete Lesson
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Are you sure you want to delete <strong>&quot;{deleteConfirm.lessonName}&quot;</strong>?
                  </p>
                  <p className="text-sm text-red-600">This action cannot be undone and will delete all associated resources.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void deleteLesson()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200"
                >
                  Delete Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
