"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/admin-api-client";
import {
  Upload,
  FileText,
  Paperclip,
  ArrowLeft,
  X,
  Loader,
  FolderOpen,
  AlertCircle,
  Trash2,
  Download,
  Plus,
  ChevronDown,
  BookOpen,
  Play,
  Edit2,
  Save,
} from "lucide-react";
import { CheckCircle, XCircle } from "lucide-react";

function staticBase(): string {
  if (typeof window === "undefined") return "";
  return process.env.NEXT_PUBLIC_STATIC_URL || window.location.origin;
}

function normalizeResource(r: any) {
  const filePath = r.filePath ?? r.file_path ?? "";
  return {
    id: r.id,
    lesson_id: r.lessonId ?? r.lesson_id,
    title: r.title,
    file_path: filePath,
    file_type: r.fileType ?? r.file_type,
    file_size: r.fileSize ?? r.file_size,
    filename: filePath.split("/").pop() || r.title,
  };
}

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

export default function ResourceManagementClient() {
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
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [lessonSearchTerm, setLessonSearchTerm] = useState("");
  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);
  const [lessonFocusedIndex, setLessonFocusedIndex] = useState(-1);
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceSubmitting, setResourceSubmitting] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    resourceId: null as number | null,
    resourceName: "",
  });
  const [resourceForm, setResourceForm] = useState({ title: "", file: null as File | null });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const courseSearchRef = useRef<HTMLInputElement>(null);
  const moduleSearchRef = useRef<HTMLInputElement>(null);
  const lessonSearchRef = useRef<HTMLInputElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const lessonDropdownRef = useRef<HTMLDivElement>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const res = await api.post<any>(`/api/v1/courses/get-courses/${courseId}?lessons=true`);
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
      setSelectedLessonId(null);
      setLessonSearchTerm("");
      setResources([]);
    } else {
      setModules([]);
      setSelectedModuleId(null);
      setModuleSearchTerm("");
      setLessons([]);
      setSelectedLessonId(null);
      setLessonSearchTerm("");
      setResources([]);
    }
  }, [selectedCourseId, fetchModules]);

  const fetchLessons = useCallback(async (courseId: number, moduleId: number) => {
    if (!courseId || !moduleId || !isMountedRef.current) return;
    setLessonsLoading(true);
    try {
      const res = await api.post<any>(`/api/v1/lessons/get-lessons?module_id=${moduleId}`);
      const lessonsData = res.data?.lessons || [];
      const sorted = [...lessonsData].sort(
        (a: any, b: any) => (a.sortOrder ?? a.order ?? 0) - (b.sortOrder ?? b.order ?? 0),
      );
      if (isMountedRef.current)
        setLessons(
          sorted.map((l: any) => ({
            id: l.id,
            title: l.title,
            order: l.sortOrder ?? l.order,
          })),
        );
    } catch (err) {
      if (isMountedRef.current) {
        console.error(err);
        setToast({ type: "error", message: "Failed to load lessons" });
        setLessons([]);
      }
    } finally {
      if (isMountedRef.current) setLessonsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId && selectedModuleId) {
      void fetchLessons(selectedCourseId, selectedModuleId);
      setSelectedLessonId(null);
      setLessonSearchTerm("");
      setResources([]);
    } else {
      setLessons([]);
      setSelectedLessonId(null);
      setLessonSearchTerm("");
      setResources([]);
    }
  }, [selectedCourseId, selectedModuleId, fetchLessons]);

  const fetchResources = useCallback(async (lessonId: number) => {
    if (!lessonId || !isMountedRef.current) return;
    setResourcesLoading(true);
    setResourcesError(null);
    try {
      const res = await api.post<any>(`/api/v1/lesson-resources/get-lesson-resources?lesson_id=${lessonId}`);
      const list = (res.data?.resources || []).map(normalizeResource);
      if (isMountedRef.current) setResources(list);
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Failed to load resources";
        setResourcesError(errorMsg);
        setToast({ type: "error", message: errorMsg });
        setResources([]);
      }
    } finally {
      if (isMountedRef.current) setResourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLessonId) void fetchResources(selectedLessonId);
    else setResources([]);
  }, [selectedLessonId, fetchResources]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ id: c.id, label: c.title || "Untitled Course" })),
    [courses],
  );
  const moduleOptions = useMemo(
    () => modules.map((m) => ({ id: m.id, label: m.title || "Untitled Module" })),
    [modules],
  );
  const lessonOptions = useMemo(
    () => lessons.map((l) => ({ id: l.id, label: l.title || "Untitled Lesson" })),
    [lessons],
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
  const filteredLessonOptions = useMemo(() => {
    if (!lessonSearchTerm) return lessonOptions;
    const q = lessonSearchTerm.toLowerCase();
    return lessonOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [lessonOptions, lessonSearchTerm]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId],
  );
  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId),
    [modules, selectedModuleId],
  );
  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId),
    [lessons, selectedLessonId],
  );

  useEffect(() => {
    if (selectedCourseId) {
      const c = courseOptions.find((x) => x.id === selectedCourseId);
      if (c) setCourseSearchTerm(c.label);
    }
  }, [selectedCourseId, courseOptions]);
  useEffect(() => {
    if (selectedModuleId) {
      const m = moduleOptions.find((x) => x.id === selectedModuleId);
      if (m) setModuleSearchTerm(m.label);
    }
  }, [selectedModuleId, moduleOptions]);
  useEffect(() => {
    if (selectedLessonId) {
      const l = lessonOptions.find((x) => x.id === selectedLessonId);
      if (l) setLessonSearchTerm(l.label);
    }
  }, [selectedLessonId, lessonOptions]);

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

  const handleLessonKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!lessonDropdownOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setLessonDropdownOpen(true);
          setLessonFocusedIndex(0);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setLessonFocusedIndex((prev) => (prev <= 0 ? filteredLessonOptions.length - 1 : prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setLessonFocusedIndex((prev) => (prev === filteredLessonOptions.length - 1 ? 0 : prev + 1));
          break;
        case "Enter":
          e.preventDefault();
          if (lessonFocusedIndex >= 0 && lessonFocusedIndex < filteredLessonOptions.length) {
            const sel = filteredLessonOptions[lessonFocusedIndex];
            setSelectedLessonId(sel.id);
            setLessonSearchTerm(sel.label);
            setLessonDropdownOpen(false);
            setLessonFocusedIndex(-1);
          }
          break;
        case "Escape":
          e.preventDefault();
          setLessonDropdownOpen(false);
          setLessonFocusedIndex(-1);
          break;
        default:
          break;
      }
    },
    [lessonDropdownOpen, filteredLessonOptions, lessonFocusedIndex],
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
      if (lessonDropdownRef.current && !lessonDropdownRef.current.contains(event.target as Node)) {
        setLessonDropdownOpen(false);
        setLessonFocusedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openResourceModal = useCallback(
    (resource: any = null) => {
      if (!selectedCourseId || !selectedModuleId || !selectedLessonId) {
        setToast({ type: "error", message: "Please select a course, module, and lesson first" });
        return;
      }
      modalTriggerRef.current = document.activeElement as HTMLElement;
      if (resource) {
        setEditingResource(resource);
        setResourceForm({ title: resource.title || "", file: null });
      } else {
        setEditingResource(null);
        setResourceForm({ title: "", file: null });
      }
      setShowResourceModal(true);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    },
    [selectedCourseId, selectedModuleId, selectedLessonId],
  );

  const closeResourceModal = useCallback(() => {
    setShowResourceModal(false);
    setEditingResource(null);
    setResourceForm({ title: "", file: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => modalTriggerRef.current?.focus(), 100);
  }, []);

  const handleResourceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === "file" && files?.[0]) {
      const file = files[0];
      setResourceForm((prev) => ({
        ...prev,
        file,
        title: prev.title || file.name.split(".").slice(0, -1).join("."),
      }));
    } else {
      setResourceForm((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const submitResource = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCourseId || !selectedModuleId || !selectedLessonId) {
        setToast({ type: "error", message: "Please select a course, module, and lesson first" });
        return;
      }
      if (!editingResource && !resourceForm.file) {
        setToast({ type: "error", message: "Please select a file to upload" });
        return;
      }
      setResourceSubmitting(true);
      try {
        if (editingResource) {
          const formData = new FormData();
          formData.append("title", resourceForm.title || editingResource.title);
          if (resourceForm.file) formData.append("file", resourceForm.file);
          await api.put(`/api/v1/lesson-resources/update-lesson-resources/${editingResource.id}`, formData);
          setToast({ type: "success", message: "Resource updated successfully" });
          await fetchResources(selectedLessonId);
        } else {
          const formData = new FormData();
          formData.append("file", resourceForm.file!);
          formData.append("lesson_id", String(selectedLessonId));
          formData.append("title", resourceForm.title || resourceForm.file!.name);
          await api.post(`/api/v1/lesson-resources/create-lesson-resources/${selectedLessonId}`, formData);
          setToast({ type: "success", message: "Resource uploaded successfully" });
          await fetchResources(selectedLessonId);
        }
        closeResourceModal();
      } catch (err: any) {
        console.error(err);
        setToast({
          type: "error",
          message:
            err.response?.data?.message ||
            err.response?.data?.error ||
            `Failed to ${editingResource ? "update" : "upload"} resource`,
        });
      } finally {
        setResourceSubmitting(false);
      }
    },
    [
      selectedCourseId,
      selectedModuleId,
      selectedLessonId,
      resourceForm,
      editingResource,
      closeResourceModal,
      fetchResources,
    ],
  );

  const confirmDeleteResource = useCallback((resource: any) => {
    setDeleteConfirm({ show: true, resourceId: resource.id, resourceName: resource.title });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ show: false, resourceId: null, resourceName: "" });
  }, []);

  const deleteResource = useCallback(async () => {
    const { resourceId } = deleteConfirm;
    if (resourceId == null) return;
    try {
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      setDeleteConfirm({ show: false, resourceId: null, resourceName: "" });
      await api.delete(`/api/v1/lesson-resources/delete-lesson-resources/${resourceId}`);
      setToast({ type: "success", message: "Resource deleted successfully" });
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to delete resource" });
      if (selectedLessonId) void fetchResources(selectedLessonId);
    }
  }, [deleteConfirm, selectedLessonId, fetchResources]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showResourceModal && !resourceSubmitting) closeResourceModal();
        if (deleteConfirm.show) cancelDelete();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showResourceModal, resourceSubmitting, deleteConfirm.show, closeResourceModal, cancelDelete]);

  const formatFileSize = useCallback((bytes: number | null | undefined) => {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  }, []);

  const ResourceCard = useCallback(
    ({ resource }: { resource: any }) => (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate" title={resource.title}>
              {resource.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
              {resource.filename && (
                <span className="truncate max-w-[150px]" title={resource.filename}>
                  {resource.filename}
                </span>
              )}
              {resource.file_size ? (
                <span className="whitespace-nowrap">{formatFileSize(resource.file_size)}</span>
              ) : null}
              {resource.file_type ? (
                <span className="whitespace-nowrap px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                  {resource.file_type}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <a
            href={
              resource.file_path?.startsWith("http")
                ? resource.file_path
                : `${staticBase()}${resource.file_path?.startsWith("/") ? "" : "/"}${resource.file_path || ""}`
            }
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors font-medium"
            aria-label={`Download ${resource.title}`}
          >
            <Download size={14} />
            Download
          </a>
          <button
            type="button"
            onClick={() => openResourceModal(resource)}
            className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors"
            aria-label={`Edit ${resource.title}`}
            title="Edit Resource"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => confirmDeleteResource(resource)}
            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
            aria-label={`Delete ${resource.title}`}
            title="Delete Resource"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    ),
    [formatFileSize, openResourceModal, confirmDeleteResource],
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
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Resource Management</h1>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-12">Upload and manage resources for your lessons</p>
            </div>
            <button
              type="button"
              onClick={() => openResourceModal()}
              disabled={!selectedCourseId || !selectedModuleId || !selectedLessonId}
              className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Add new resource"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Resource</span>
            </button>
          </div>
          <div className="pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative" ref={courseDropdownRef}>
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
                  placeholder={coursesLoading ? "Loading..." : "Select course"}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={coursesLoading}
                  onFocus={() => setCourseDropdownOpen(true)}
                  aria-label="Select course"
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
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCourseOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {courseOptions.length === 0 ? "No courses available" : "No matches found"}
                      </div>
                    ) : (
                      filteredCourseOptions.map((opt, index) => (
                        <div
                          key={opt.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                            selectedCourseId === opt.id
                              ? "bg-blue-50 text-blue-600 font-medium"
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
                        >
                          {opt.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="relative" ref={moduleDropdownRef}>
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
                    !selectedCourseId ? "Select course first" : modulesLoading ? "Loading..." : "Select module"
                  }
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50"
                  disabled={!selectedCourseId || modulesLoading}
                  onFocus={() => setModuleDropdownOpen(true)}
                  aria-label="Select module"
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
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredModuleOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {moduleOptions.length === 0 ? "No modules available" : "No matches found"}
                      </div>
                    ) : (
                      filteredModuleOptions.map((opt, index) => (
                        <div
                          key={opt.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                            selectedModuleId === opt.id
                              ? "bg-blue-50 text-blue-600 font-medium"
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
                        >
                          {opt.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="relative" ref={lessonDropdownRef}>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Lesson</label>
              <div className="relative">
                <input
                  ref={lessonSearchRef}
                  type="text"
                  value={lessonSearchTerm || ""}
                  onChange={(e) => {
                    setLessonSearchTerm(e.target.value);
                    setLessonDropdownOpen(true);
                    setLessonFocusedIndex(0);
                  }}
                  onKeyDown={handleLessonKeyDown}
                  placeholder={
                    !selectedModuleId ? "Select module first" : lessonsLoading ? "Loading..." : "Select lesson"
                  }
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50"
                  disabled={!selectedModuleId || lessonsLoading}
                  onFocus={() => setLessonDropdownOpen(true)}
                  aria-label="Select lesson"
                  role="combobox"
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {lessonsLoading ? (
                    <Loader size={16} className="text-gray-400 animate-spin" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
                {lessonDropdownOpen && !lessonsLoading && selectedModuleId && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredLessonOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {lessonOptions.length === 0 ? "No lessons available" : "No matches found"}
                      </div>
                    ) : (
                      filteredLessonOptions.map((opt, index) => (
                        <div
                          key={opt.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                            selectedLessonId === opt.id
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : lessonFocusedIndex === index
                                ? "bg-gray-100"
                                : ""
                          }`}
                          onClick={() => {
                            setSelectedLessonId(opt.id);
                            setLessonSearchTerm(opt.label);
                            setLessonDropdownOpen(false);
                            setLessonFocusedIndex(-1);
                          }}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a module to view lessons</h3>
            <p className="text-gray-600">Choose a module from the dropdown to view its lessons</p>
          </div>
        ) : !selectedLessonId ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <Play size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a lesson to manage resources</h3>
            <p className="text-gray-600">Choose a lesson from the dropdown to upload and manage its resources</p>
          </div>
        ) : (
          <>
            {selectedLesson && (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <Paperclip size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">Resources for {selectedLesson.title}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                      <span>
                        Course: <span className="font-medium">{selectedCourse?.title}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        Module: <span className="font-medium">{selectedModule?.title}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1">
                        <Paperclip size={14} />
                        {resources.length} resource{resources.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Resources</h3>
                <span className="text-sm text-gray-500" role="status" aria-live="polite">
                  {resourcesLoading ? "Loading..." : `${resources.length} resource${resources.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
            {resourcesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : resourcesError ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800">Error loading resources</h3>
                    <p className="mt-1">{resourcesError}</p>
                    <button
                      type="button"
                      onClick={() => selectedLessonId && void fetchResources(selectedLessonId)}
                      className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
                <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resources yet</h3>
                <p className="text-gray-600 mb-6">Upload files like PDFs, documents, or code examples for this lesson</p>
                <button
                  type="button"
                  onClick={() => openResourceModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  <Upload size={16} />
                  Upload First Resource
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showResourceModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-modal-title"
        >
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 id="resource-modal-title" className="text-lg font-semibold text-gray-900">
                {editingResource ? "Edit Resource" : "Upload Resource"}
              </h3>
              <button
                type="button"
                onClick={closeResourceModal}
                disabled={resourceSubmitting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitResource} className="p-6 space-y-6">
              <div>
                <label htmlFor="resource-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Title {!editingResource && <span className="text-red-500">*</span>}
                </label>
                <input
                  ref={titleInputRef}
                  id="resource-title"
                  name="title"
                  value={resourceForm.title}
                  onChange={handleResourceChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Enter resource title"
                  disabled={resourceSubmitting}
                />
              </div>
              <div>
                <label htmlFor="resource-file" className="block text-sm font-medium text-gray-700 mb-2">
                  File {!editingResource && <span className="text-red-500">*</span>}
                  {editingResource && (
                    <span className="text-gray-500 text-xs ml-1">(leave empty to keep current file)</span>
                  )}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                  {resourceForm.file ? (
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <FileText size={24} className="text-green-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1 break-all">{resourceForm.file.name}</p>
                      <p className="text-xs text-gray-500">{(resourceForm.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={() => {
                          setResourceForm((prev) => ({ ...prev, file: null }));
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                        disabled={resourceSubmitting}
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="resource-file" className="block p-4 text-center cursor-pointer">
                      <div className="flex items-center justify-center mb-2">
                        <Upload size={24} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {editingResource
                          ? "Upload a new file or leave empty to keep current"
                          : "Drag and drop a file or"}{" "}
                        <span className="text-blue-600 font-medium">browse</span>
                      </p>
                      <p className="text-xs text-gray-500">Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, etc.</p>
                      <input
                        id="resource-file"
                        ref={fileInputRef}
                        name="file"
                        type="file"
                        onChange={handleResourceChange}
                        className="hidden"
                        disabled={resourceSubmitting}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeResourceModal}
                  disabled={resourceSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resourceSubmitting || (!editingResource && !resourceForm.file)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {resourceSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      <span>{editingResource ? "Updating..." : "Uploading..."}</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editingResource ? "Update Resource" : "Upload Resource"}</span>
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
                    Delete Resource
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Are you sure you want to delete <strong>&quot;{deleteConfirm.resourceName}&quot;</strong>?
                  </p>
                  <p className="text-sm text-red-600">This action cannot be undone.</p>
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
                  onClick={() => void deleteResource()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200"
                >
                  Delete Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
