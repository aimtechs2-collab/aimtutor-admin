"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Folder,
  FolderOpen,
  IndianRupee,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/admin-api-client";

type EnrollmentApiCourse = {
  id: number;
  title: string;
  difficulty_level?: string | null;
  duration_hours?: number | null;
  price?: number | null;
  currency?: string | null;
};

type EnrollmentApiUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
};

type EnrollmentApiRow = {
  id: number;
  user: EnrollmentApiUser;
  course: EnrollmentApiCourse;
  enrolled_at: string;
  progress_percentage: number;
  is_active: boolean;
};

type EnrollmentsApiResponse = {
  enrollments: EnrollmentApiRow[];
};

type CourseFolder = {
  id: number;
  title: string;
  difficulty_level?: string | null;
  duration_hours?: number | null;
  price?: number | null;
  currency?: string | null;
  students: {
    id: number;
    user: EnrollmentApiUser;
    enrolled_at: string;
    progress_percentage: number;
    is_active: boolean;
  }[];
  totalRevenue: number;
};

const ManageEnrollmentsStrictClient = () => {
  // Main data state
  const [enrollmentsData, setEnrollmentsData] = useState<EnrollmentsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [selectedCourse, setSelectedCourse] = useState<CourseFolder | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid"); // 'grid' or 'list'

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  // Pagination for students
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [notificationModal, setNotificationModal] = useState<{
    open: boolean;
    course: CourseFolder | null;
    title: string;
    message: string;
    sendEmail: boolean;
  }>({
    open: false,
    course: null,
    title: "",
    message: "",
    sendEmail: true,
  });

  // Action states
  const [sendingNotification, setSendingNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expanded card for mobile
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

  useEffect(() => {
    fetchEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<EnrollmentsApiResponse>("/api/v1/admin/enrollments");
      setEnrollmentsData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to fetch enrollments");
      // eslint-disable-next-line no-console
      console.error("Error fetching enrollments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group enrollments by course to create "folders"
  const courseFolders = useMemo<CourseFolder[]>(() => {
    if (!enrollmentsData?.enrollments) return [];

    const courseMap = new Map<number, CourseFolder>();

    enrollmentsData.enrollments.forEach((enrollment) => {
      const courseId = enrollment.course.id;

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          id: courseId,
          title: enrollment.course.title,
          difficulty_level: enrollment.course.difficulty_level ?? null,
          duration_hours: enrollment.course.duration_hours ?? null,
          price: enrollment.course.price ?? null,
          currency: enrollment.course.currency || "INR",
          students: [],
          totalRevenue: 0,
        });
      }

      const courseData = courseMap.get(courseId)!;
      courseData.students.push({
        id: enrollment.id,
        user: enrollment.user,
        enrolled_at: enrollment.enrolled_at,
        progress_percentage: enrollment.progress_percentage,
        is_active: enrollment.is_active,
      });
      courseData.totalRevenue += Number(enrollment.course.price ?? 0);
    });

    return Array.from(courseMap.values()).sort((a, b) => b.students.length - a.students.length);
  }, [enrollmentsData]);

  // Filter courses by search
  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courseFolders;
    const term = searchTerm.toLowerCase();
    return courseFolders.filter((course) => course.title.toLowerCase().includes(term));
  }, [courseFolders, searchTerm]);

  // Get students for selected course with filtering
  const filteredStudents = useMemo(() => {
    if (!selectedCourse) return [];

    let students = selectedCourse.students;

    if (studentSearchTerm) {
      const term = studentSearchTerm.toLowerCase();
      students = students.filter(
        (student) =>
          student.user.first_name.toLowerCase().includes(term) ||
          student.user.last_name.toLowerCase().includes(term) ||
          student.user.email.toLowerCase().includes(term) ||
          (student.user.phone?.toLowerCase().includes(term) ?? false),
      );
    }

    return students.sort((a, b) => +new Date(b.enrolled_at) - +new Date(a.enrolled_at));
  }, [selectedCourse, studentSearchTerm]);

  // Pagination for students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Format helpers
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeAgo = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  const formatPrice = (price?: number | null, currency = "INR") => {
    if (price === 0) return "Free";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(price ?? 0));
  };

  // Handle course folder click
  const handleFolderClick = (course: CourseFolder) => {
    setSelectedCourse(course);
    setStudentSearchTerm("");
    setCurrentPage(1);
    setExpandedStudent(null);
  };

  // Handle back to folders
  const handleBackToFolders = () => {
    setSelectedCourse(null);
    setStudentSearchTerm("");
    setCurrentPage(1);
  };

  // Open notification modal
  const openNotificationModal = (course: CourseFolder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotificationModal({
      open: true,
      course,
      title: "",
      message: "",
      sendEmail: true,
    });
  };

  // Handle send notification
  const handleSendNotification = async () => {
    if (!notificationModal.title.trim() || !notificationModal.message.trim()) {
      setError("Please fill in both title and message");
      return;
    }

    setSendingNotification(true);
    try {
      await api.post("/api/v1/notifications/send/course", {
        course_id: notificationModal.course?.id,
        title: notificationModal.title.trim(),
        message: notificationModal.message.trim(),
        send_email: notificationModal.sendEmail.toString(),
      });

      setSuccessMessage(`Notification sent to ${notificationModal.course?.students.length ?? 0} students!`);
      setNotificationModal({ open: false, course: null, title: "", message: "", sendEmail: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to send notification");
    } finally {
      setSendingNotification(false);
    }
  };

  // Export students to CSV
  const exportStudentsToCSV = () => {
    if (!selectedCourse) return;

    const headers = ["Name", "Email", "Phone", "Enrolled Date", "Status"];
    const rows = filteredStudents.map((student) => [
      `"${student.user.first_name} ${student.user.last_name}"`,
      student.user.email,
      student.user.phone || "N/A",
      formatDate(student.enrolled_at),
      student.is_active ? "Active" : "Inactive",
    ]);

    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCourse.title.replace(/[^a-zA-Z0-9]/g, "_")}_students_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !enrollmentsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchEnrollments}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
            <Check className="w-5 h-5" />
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-2" type="button">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} type="button">
                <X className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </div>
        )}

        {/* Folder View */}
        {!selectedCourse ? (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Folders</h1>
                <p className="text-gray-600 mt-1">
                  {courseFolders.length} course{courseFolders.length !== 1 ? "s" : ""} with enrolled students
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchEnrollments}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                  type="button"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
                    type="button"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
                    type="button"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path
                        fillRule="evenodd"
                        d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Course Folders Grid/List */}
            {filteredCourses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg">No courses found</p>
                <p className="text-gray-400 mt-1">Try adjusting your search</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCourses.map((course) => (
                  <CourseFolderCard
                    key={course.id}
                    course={course}
                    onClick={() => handleFolderClick(course)}
                    onNotify={(e) => openNotificationModal(course, e)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {filteredCourses.map((course) => (
                    <CourseFolderListItem
                      key={course.id}
                      course={course}
                      onClick={() => handleFolderClick(course)}
                      onNotify={(e) => openNotificationModal(course, e)}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Course Detail View - Students List */
          <>
            {/* Header with Back Button */}
            <div className="flex flex-col gap-4">
              <button
                onClick={handleBackToFolders}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors self-start"
                type="button"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Courses</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedCourse.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{selectedCourse.difficulty_level}</span>
                      <span>•</span>
                      <span>{selectedCourse.duration_hours}h</span>
                      <span>•</span>
                      <span className="font-medium text-blue-600">
                        {formatPrice(selectedCourse.price ?? 0, selectedCourse.currency || "INR")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={(e) => openNotificationModal(selectedCourse, e)}
                    className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    type="button"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notify All</span>
                  </button>
                  <button
                    onClick={exportStudentsToCSV}
                    disabled={filteredStudents.length === 0}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                    type="button"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Students"
                value={selectedCourse.students.length}
                icon={<Users className="w-5 h-5" />}
                color="blue"
              />
              <StatCard
                title="Total Revenue"
                value={formatPrice(selectedCourse.totalRevenue, selectedCourse.currency || "INR")}
                icon={<IndianRupee className="w-5 h-5" />}
                color="green"
              />
              <StatCard
                title="Course Price"
                value={formatPrice(selectedCourse.price ?? 0, selectedCourse.currency || "INR")}
                icon={<IndianRupee className="w-5 h-5" />}
                color="purple"
              />
              <StatCard
                title="Duration"
                value={`${selectedCourse.duration_hours ?? 0}h`}
                icon={<Calendar className="w-5 h-5" />}
                color="orange"
              />
            </div>

            {/* Student Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, email, or phone..."
                  value={studentSearchTerm}
                  onChange={(e) => {
                    setStudentSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {paginatedStudents.length} of {filteredStudents.length} students
              </p>
            </div>

            {/* Students Table - Desktop */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Enrolled Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">No students found</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {student.user.first_name?.[0]}
                                {student.user.last_name?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {student.user.first_name} {student.user.last_name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">{student.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                              {student.user.phone || <span className="text-gray-400">N/A</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                              <div>
                                <p className="text-sm text-gray-900">{formatDate(student.enrolled_at)}</p>
                                <p className="text-xs text-gray-500">{formatTimeAgo(student.enrolled_at)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                student.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {student.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Students Cards - Mobile/Tablet */}
            <div className="lg:hidden space-y-4">
              {paginatedStudents.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No students found</p>
                </div>
              ) : (
                paginatedStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    formatDate={formatDate}
                    formatTimeAgo={formatTimeAgo}
                    isExpanded={expandedStudent === student.id}
                    onToggle={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        )}

        {/* Send Notification Modal */}
        {notificationModal.open && (
          <Modal
            onClose={() => setNotificationModal({ open: false, course: null, title: "", message: "", sendEmail: true })}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Send Notification</h3>
                  <p className="text-sm text-gray-500">
                    Notify all {notificationModal.course?.students.length} students in {notificationModal.course?.title}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notification Title *</label>
                  <input
                    type="text"
                    value={notificationModal.title}
                    onChange={(e) => setNotificationModal((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter notification title"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    value={notificationModal.message}
                    onChange={(e) => setNotificationModal((prev) => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Enter your message to students..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={notificationModal.sendEmail}
                    onChange={(e) => setNotificationModal((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Also send as email
                  </label>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => setNotificationModal({ open: false, course: null, title: "", message: "", sendEmail: true })}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendNotification}
                    disabled={sendingNotification || !notificationModal.title.trim() || !notificationModal.message.trim()}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                    type="button"
                  >
                    {sendingNotification ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Notification
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

// ========== Sub Components ==========

// Course Folder Card (Grid View)
const CourseFolderCard = ({
  course,
  onClick,
  onNotify,
  formatPrice,
}: {
  course: CourseFolder;
  onClick: () => void;
  onNotify: (e: React.MouseEvent) => void;
  formatPrice: (price?: number | null, currency?: string) => string;
}) => (
  <div
    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group relative"
    onClick={onClick}
  >
    {/* Notify Button */}
    <button
      onClick={onNotify}
      className="absolute top-3 right-3 p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
      title="Send notification to all students"
      type="button"
    >
      <Bell className="w-4 h-4" />
    </button>

    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        <FolderOpen className="w-8 h-8 text-white" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[48px]">{course.title}</h3>
      <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
        <Users className="w-4 h-4" />
        <span>
          {course.students.length} student{course.students.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">{course.difficulty_level}</span>
        <span
          className={`px-2 py-1 rounded font-medium ${
            (course.price ?? 0) === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
          }`}
        >
          {formatPrice(course.price ?? 0, course.currency || "INR")}
        </span>
      </div>
    </div>
  </div>
);

// Course Folder List Item (List View)
const CourseFolderListItem = ({
  course,
  onClick,
  onNotify,
  formatPrice,
}: {
  course: CourseFolder;
  onClick: () => void;
  onNotify: (e: React.MouseEvent) => void;
  formatPrice: (price?: number | null, currency?: string) => string;
}) => (
  <div
    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
    onClick={onClick}
  >
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
        <Folder className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {course.students.length}
          </span>
          <span>•</span>
          <span>{course.difficulty_level}</span>
          <span>•</span>
          <span>{course.duration_hours}h</span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          (course.price ?? 0) === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        }`}
      >
        {formatPrice(course.price ?? 0, course.currency || "INR")}
      </span>

      <button
        onClick={onNotify}
        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        title="Send notification to all students"
        type="button"
      >
        <Bell className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Stat Card
const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
}) => {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shrink-0`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// Student Card (Mobile)
const StudentCard = ({
  student,
  formatDate,
  formatTimeAgo,
  isExpanded,
  onToggle,
}: {
  student: CourseFolder["students"][number];
  formatDate: (dateString?: string | null) => string;
  formatTimeAgo: (dateString?: string | null) => string;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left" type="button">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {student.user.first_name?.[0]}
          {student.user.last_name?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">
            {student.user.first_name} {student.user.last_name}
          </p>
          <p className="text-sm text-gray-500 truncate">{student.user.email}</p>
        </div>
      </div>
      <ChevronDown
        className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
      />
    </button>

    {isExpanded && (
      <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Phone className="w-4 h-4 text-gray-400" />
          {student.user.phone || <span className="text-gray-400">N/A</span>}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{formatDate(student.enrolled_at)}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">{formatTimeAgo(student.enrolled_at)}</span>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              student.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {student.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    )}
  </div>
);

// Modal Component
const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-auto z-10 transform transition-all">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  </div>
);

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <p className="text-sm text-gray-600">
      Page {currentPage} of {totalPages}
    </p>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        type="button"
      >
        <ChevronLeft className="w-4 h-4" />
        <ChevronLeft className="w-4 h-4 -ml-3" />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        type="button"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        {[...Array(Math.min(5, totalPages))].map((_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium text-sm transition-colors ${
                currentPage === pageNum ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
              type="button"
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        type="button"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        type="button"
      >
        <ChevronRight className="w-4 h-4" />
        <ChevronRight className="w-4 h-4 -ml-3" />
      </button>
    </div>
  </div>
);

export default ManageEnrollmentsStrictClient;

