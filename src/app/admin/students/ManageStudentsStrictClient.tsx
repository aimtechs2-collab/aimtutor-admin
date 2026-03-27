"use client";

import React, { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Search,
  Bell,
  Send,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Users,
  Clock,
  MoreVertical,
  User,
  Filter,
} from "lucide-react";
import { api } from "@/lib/admin-api-client";

type StudentRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  email_verified?: boolean | null;
  created_at?: string | null;
  bio?: string | null;
};

type ToastState = { type: "success" | "error"; message: string } | null;

type NotificationForm = {
  title: string;
  message: string;
  type: string;
  send_email: boolean;
};

type NotificationErrors = Record<string, string>;

function ManageStudentsStrictClient() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<any>(null);

  // Notification modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    title: "",
    message: "",
    type: "reminder",
    send_email: false,
  });
  const [notificationErrors, setNotificationErrors] = useState<NotificationErrors>({});
  const [isSending, setIsSending] = useState(false);

  // Toast state
  const [toast, setToast] = useState<ToastState>(null);

  // Fetch students
  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{
        users: StudentRow[];
        pagination?: any;
      }>("/api/v1/admin/users?role=student");

      setStudents(response.data.users || []);
      setPagination(response.data.pagination || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  // Filter students by search
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const email = (student.email || "").toLowerCase();
    const phone = (student.phone || "").toLowerCase();
    const term = searchTerm.toLowerCase();

    return fullName.includes(term) || email.includes(term) || phone.includes(term);
  });

  // Open notification modal for a student
  const openNotificationModal = (student: StudentRow) => {
    setSelectedStudent(student);
    setNotificationForm({
      title: "",
      message: "",
      type: "reminder",
      send_email: false,
    });
    setNotificationErrors({});
    setShowNotificationModal(true);
  };

  // Close notification modal
  const closeNotificationModal = () => {
    setShowNotificationModal(false);
    setSelectedStudent(null);
    setNotificationForm({
      title: "",
      message: "",
      type: "reminder",
      send_email: false,
    });
    setNotificationErrors({});
  };

  // Handle notification form change
  const handleNotificationChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setNotificationForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (notificationErrors[name]) {
      setNotificationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Send notification to student
  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: NotificationErrors = {};
    if (!notificationForm.title.trim()) errors.title = "Title is required";
    if (!notificationForm.message.trim()) errors.message = "Message is required";

    if (Object.keys(errors).length > 0) {
      setNotificationErrors(errors);
      return;
    }

    if (!selectedStudent) return;

    setIsSending(true);

    try {
      await api.post("/api/v1/notifications/send", {
        title: notificationForm.title.trim(),
        message: notificationForm.message.trim(),
        user_ids: [selectedStudent.id],
        type: notificationForm.type,
        send_email: notificationForm.send_email,
      });

      setToast({
        type: "success",
        message: `Notification sent to ${selectedStudent.first_name} ${selectedStudent.last_name}!`,
      });

      closeNotificationModal();
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.response?.data?.message || "Failed to send notification",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get initials
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-lg shadow p-6 max-w-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchStudents}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">Student Management</h1>
            <p className="text-gray-500 text-sm mt-1 break-words">
              Manage and communicate with{" "}
              {pagination?.total || students.length} registered student
              {(pagination?.total || students.length) !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={fetchStudents}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Refresh"
            type="button"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        {/* Search */}
        <div className="mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{pagination?.total || students.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-green-600">{students.filter((s) => s.is_active).length}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-indigo-600">{filteredStudents.length}</p>
              <p className="text-xs text-gray-500">Found</p>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No students found</p>
            {searchTerm && (
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                getInitials={getInitials}
                formatDate={formatDate}
                onSendNotification={() => openNotificationModal(student)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notification Modal */}
      {showNotificationModal && selectedStudent && (
        <NotificationModal
          student={selectedStudent}
          formData={notificationForm}
          formErrors={notificationErrors}
          isSending={isSending}
          onChange={handleNotificationChange}
          onSubmit={sendNotification}
          onClose={closeNotificationModal}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ========== Student Card Component ==========
function StudentCard({
  student,
  getInitials,
  formatDate,
  onSendNotification,
}: {
  student: StudentRow;
  getInitials: (firstName?: string, lastName?: string) => string;
  formatDate: (dateString?: string | null) => string;
  onSendNotification: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {getInitials(student.first_name, student.last_name)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {student.first_name} {student.last_name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    student.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {student.is_active ? "Active" : "Inactive"}
                </span>
                {student.email_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onSendNotification();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Send Notification
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Student Info */}
        <div className="space-y-2 overflow-hidden">
          {/* Email */}
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">{student.email}</span>
          </div>

          {/* Phone */}
          {student.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-600 truncate">{student.phone}</span>
            </div>
          )}

          {/* Join Date */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">
              Joined {formatDate(student.created_at)}
            </span>
          </div>

          {/* Bio */}
          {student.bio && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 line-clamp-2">{student.bio}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onSendNotification}
          className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-xs font-medium"
          type="button"
        >
          <Bell className="w-3.5 h-3.5" />
          Send Notification
        </button>
      </div>
    </div>
  );
}

// ========== Notification Modal ==========
const NOTIFICATION_TYPES = [{ value: "reminder", label: "Reminder", icon: Clock, color: "blue" }];

const TYPE_STYLES: Record<
  string,
  { border: string; bg: string; text: string; textDark: string }
> = {
  reminder: { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-600", textDark: "text-blue-700" },
  alert: { border: "border-red-500", bg: "bg-red-50", text: "text-red-600", textDark: "text-red-700" },
  info: { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-600", textDark: "text-purple-700" },
  success: { border: "border-green-500", bg: "bg-green-50", text: "text-green-600", textDark: "text-green-700" },
};

function NotificationModal({
  student,
  formData,
  formErrors,
  isSending,
  onChange,
  onSubmit,
  onClose,
}: {
  student: StudentRow;
  formData: NotificationForm;
  formErrors: NotificationErrors;
  isSending: boolean;
  onChange: (e: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {student.first_name?.[0]}
              {student.last_name?.[0]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Send Notification</h3>
              <p className="text-xs text-gray-500">
                To: {student.first_name} {student.last_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={onChange}
              placeholder="e.g., Course Reminder"
              maxLength={100}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                formErrors.title
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
              }`}
            />
            {formErrors.title && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.title}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={onChange}
              rows={4}
              placeholder="Enter your message..."
              maxLength={500}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                formErrors.message
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
              }`}
            />
            <div className="flex justify-between mt-1">
              {formErrors.message ? (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.message}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400">{formData.message.length}/500</p>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
            <div className="grid grid-cols-4 gap-2">
              {NOTIFICATION_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                const styles = TYPE_STYLES[type.value];

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onChange({ target: { name: "type", value: type.value } })}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isSelected ? `${styles.border} ${styles.bg}` : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mx-auto mb-1 ${isSelected ? styles.text : "text-gray-400"}`}
                    />
                    <p className={`text-xs font-medium ${isSelected ? styles.textDark : "text-gray-600"}`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Send Email</p>
                <p className="text-xs text-gray-500">Also notify via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="send_email"
                checked={formData.send_email}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-50"
            >
              {isSending ? (
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
        </form>
      </div>
    </div>
  );
}

// ========== Toast Component ==========
function Toast({ toast, onClose }: { toast: Exclude<ToastState, null>; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg flex items-start gap-3 ${
        toast.type === "error" ? "bg-red-500" : "bg-green-500"
      } text-white animate-fade-in`}
    >
      {toast.type === "error" ? (
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
      )}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} className="hover:opacity-80 transition-opacity shrink-0" type="button">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ManageStudentsStrictClient;

