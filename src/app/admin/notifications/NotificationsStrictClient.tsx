"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle,
  Clock,
  Info,
  Loader,
  Mail,
  Radio,
  X,
} from "lucide-react";
import { api } from "@/lib/admin-api-client";

type ToastState = { type: "success" | "error"; message: string } | null;

type BroadcastForm = {
  title: string;
  message: string;
  type: "reminder";
  send_email: boolean;
};

type BroadcastErrors = Record<string, string>;

const NOTIFICATION_TYPES = [{ value: "reminder" as const, label: "Reminder", icon: Clock, color: "blue" as const }];

const TYPE_STYLES: Record<
  string,
  { border: string; bg: string; text: string; textDark: string }
> = {
  reminder: { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-600", textDark: "text-blue-700" },
  alert: { border: "border-red-500", bg: "bg-red-50", text: "text-red-600", textDark: "text-red-700" },
  info: { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-600", textDark: "text-purple-700" },
  success: { border: "border-green-500", bg: "bg-green-50", text: "text-green-600", textDark: "text-green-700" },
};

export default function NotificationsStrictClient() {
  const router = useRouter();

  const [broadcastFormData, setBroadcastFormData] = useState<BroadcastForm>({
    title: "",
    message: "",
    type: "reminder",
    send_email: false,
  });
  const [broadcastFormErrors, setBroadcastFormErrors] = useState<BroadcastErrors>({});
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (type: "success" | "error", message: string) => setToast({ type, message });

  const broadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: BroadcastErrors = {};
    if (!broadcastFormData.title.trim()) errors.title = "Title is required";
    if (!broadcastFormData.message.trim()) errors.message = "Message is required";
    if (Object.keys(errors).length > 0) {
      setBroadcastFormErrors(errors);
      return;
    }

    setIsBroadcasting(true);
    setBroadcastFormErrors({});
    try {
      const payload = {
        title: broadcastFormData.title,
        message: broadcastFormData.message,
        type: broadcastFormData.type,
        send_email: broadcastFormData.send_email,
      };

      await api.post("/api/v1/notifications/broadcast", payload);

      setBroadcastSuccess(true);
      showToast("success", "Notification broadcasted to all users!");

      setBroadcastFormData({ title: "", message: "", type: "reminder", send_email: false });
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error || error?.response?.data?.message || "Failed to broadcast notification";
      showToast("error", errorMsg);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleBroadcastInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setBroadcastFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (broadcastFormErrors[name]) {
      setBroadcastFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <button
            onClick={() => router.back()}
            className="mb-3 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors group"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Broadcast Notification</h1>
              <p className="text-xs text-gray-600 mt-0.5">Send notifications to all users</p>
            </div>
          </div>
        </div>

        <BroadcastNotificationForm
          formData={broadcastFormData}
          formErrors={broadcastFormErrors}
          isBroadcasting={isBroadcasting}
          broadcastSuccess={broadcastSuccess}
          handleInputChange={handleBroadcastInputChange}
          broadcastNotification={broadcastNotification}
        />
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function BroadcastNotificationForm({
  formData,
  formErrors,
  isBroadcasting,
  broadcastSuccess,
  handleInputChange,
  broadcastNotification,
}: {
  formData: BroadcastForm;
  formErrors: BroadcastErrors;
  isBroadcasting: boolean;
  broadcastSuccess: boolean;
  handleInputChange: (e: any) => void;
  broadcastNotification: (e: React.FormEvent) => void;
}) {
  const selectedStyles = useMemo(() => TYPE_STYLES[formData.type] ?? TYPE_STYLES.reminder, [formData.type]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-200">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Radio className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Broadcast to All Users</h2>
          <p className="text-xs text-gray-600">Send to all registered users</p>
        </div>
      </div>

      {broadcastSuccess && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-green-800">Success!</h4>
            <p className="text-xs text-green-700">Notification broadcasted to all users.</p>
          </div>
        </div>
      )}

      <form onSubmit={broadcastNotification} className="space-y-4">
        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800">Broadcasting</h4>
            <p className="text-xs text-blue-700">Sends to all registered users</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Live Session Reminder"
            className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
              formErrors.title ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
            }`}
          />
          {formErrors.title && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formErrors.title}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message *</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            rows={3}
            placeholder="e.g., Reminder: ML session at 3 PM"
            className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
              formErrors.message ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
            }`}
          />
          {formErrors.message && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formErrors.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Type</label>
          <div className="grid grid-cols-4 gap-2">
            {NOTIFICATION_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              const styles = TYPE_STYLES[type.value];
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange({ target: { name: "type", value: type.value } })}
                  className={`p-2.5 rounded-lg border-2 transition-all ${
                    isSelected ? `${styles.border} ${styles.bg}` : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${isSelected ? styles.text : "text-gray-400"}`} />
                  <p className={`text-xs font-semibold ${isSelected ? styles.textDark : "text-gray-600"}`}>
                    {type.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Send Email to All</p>
              <p className="text-xs text-gray-600">Also notify via email</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="send_email"
              checked={formData.send_email}
              onChange={handleInputChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600" />
          </label>
        </div>

        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800">Important</h4>
            <p className="text-xs text-yellow-700">This will send to ALL users. Review carefully.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isBroadcasting}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
        >
          {isBroadcasting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Broadcasting...
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              Broadcast to All
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Toast({ toast, onClose }: { toast: Exclude<ToastState, null>; onClose: () => void }) {
  const bgColor = toast.type === "error" ? "bg-red-500" : "bg-green-500";
  const Icon = toast.type === "error" ? AlertCircle : CheckCircle;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm ${bgColor} text-white p-3 rounded-lg shadow-2xl animate-slide-in flex items-start gap-2`}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} className="hover:opacity-80 transition-opacity" type="button">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

