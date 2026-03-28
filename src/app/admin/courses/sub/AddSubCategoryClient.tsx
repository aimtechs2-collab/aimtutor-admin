"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Save,
  XCircle,
  ChevronDown,
} from "lucide-react";

type ApiResponse<T> = { data: T };

async function apiRequest<T>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> {
  const hasBody = body !== undefined;
  const res = await fetch(url, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const err: any = new Error(data?.message ?? data?.error ?? "Request failed");
    // Match the legacy shape: err.response?.data?.message
    err.response = { data };
    throw err;
  }

  return { data };
}

const api = {
  post: <T = any>(url: string, body?: unknown) => apiRequest<T>("POST", url, body),
  put: <T = any>(url: string, body?: unknown) => apiRequest<T>("PUT", url, body),
  delete: <T = any>(url: string) => apiRequest<T>("DELETE", url),
};

// Toast Notification Component
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";
  const Icon = type === "success" ? CheckCircle : type === "error" ? XCircle : AlertCircle;

  return (
    <div
      className={`fixed top-4 right-4 left-4 sm:left-auto max-w-sm ${bgColor} text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-all duration-300`}
      style={{
        transform: isVisible ? "translateX(0)" : "translateX(400px)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <Icon size={20} />
      <span className="text-sm sm:text-base flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80" type="button">
        <X size={18} />
      </button>
    </div>
  );
};

// Loading Skeleton Component
const SubCategorySkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-gray-200 rounded" />
        <div className="h-8 w-8 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

// Confirmation Modal Component
const ConfirmModal = ({
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
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-200"
      style={{
        backgroundColor: isVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-6 rounded-xl shadow-xl w-full max-w-md transition-all duration-200"
        style={{
          transform: isVisible ? "scale(1)" : "scale(0.95)",
          opacity: isVisible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full">
            <AlertCircle className="text-red-600 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`bg-red-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add/Edit Subcategory Form Component
const SubCategoryForm = ({
  subcategory,
  masterCategoryId,
  onSuccess,
  onCancel,
}: {
  subcategory: any | null;
  masterCategoryId: string;
  onSuccess: (data: any, action: "created" | "updated") => void | Promise<void>;
  onCancel: () => void;
}) => {
  const [subCategoryName, setSubCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!subcategory;

  useEffect(() => {
    if (subcategory) {
      setSubCategoryName(subcategory.name || "");
    } else {
      setSubCategoryName("");
      setErrors({});
    }
  }, [subcategory]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!subCategoryName.trim()) {
      newErrors.name = "Subcategory name is required";
    } else if (subCategoryName.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        master_category_id: masterCategoryId,
        name: subCategoryName.trim(),
      };

      if (isEditMode) {
        const res = await api.put<any>(`/api/v1/subcategories/update-subcategories/${subcategory.id}`, payload);
        await Promise.resolve(onSuccess(res.data.subcategory, "updated"));
      } else {
        const res = await api.post<any>("/api/v1/subcategories/create-subcategories", payload);
        await Promise.resolve(onSuccess(res.data.subcategory, "created"));
      }
    } catch (err: any) {
      setErrors({
        submit: err.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} subcategory`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div>
        <label className="block font-medium text-gray-700 mb-2 text-sm sm:text-base">
          Subcategory Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={subCategoryName}
          onChange={(e) => {
            setSubCategoryName(e.target.value);
            setErrors((prev) => ({ ...prev, name: "" }));
          }}
          placeholder="Enter subcategory name"
          className={`w-full border ${errors.name ? "border-red-500" : "border-gray-300"} rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base`}
          disabled={loading}
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.name}
          </p>
        )}
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {errors.submit}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={16} />
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              <Save size={16} />
              {isEditMode ? "Update" : "Create"} Subcategory
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// Main SubCategories Component (legacy UI)
export default function AddSubCategoryClient() {
  const router = useRouter();

  const [masterCategories, setMasterCategories] = useState<any[]>([]);
  const [selectedMasterCategory, setSelectedMasterCategory] = useState<string>("");
  const [subCategories, setSubCategories] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<any | null>(null);
  const [deletingSubCategory, setDeletingSubCategory] = useState<any | null>(null);

  const [masterLoading, setMasterLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch all master categories on mount
  useEffect(() => {
    fetchMasterCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefer subcategories embedded in the master list (one source of truth). Fallback: per-id API.
  useEffect(() => {
    if (!selectedMasterCategory) {
      setSubCategories([]);
      return;
    }
    const master = masterCategories.find((c) => String(c.id) === String(selectedMasterCategory));
    if (master && Array.isArray(master.subcategories)) {
      setSubCategories(master.subcategories);
      return;
    }
    if (masterCategories.length > 0) {
      fetchSubCategories(selectedMasterCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMasterCategory, masterCategories]);

  // Modal animation
  useEffect(() => {
    if (showForm) {
      setTimeout(() => setModalVisible(true), 10);
    } else {
      setModalVisible(false);
    }
  }, [showForm]);

  // Escape key handler for form modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForm) {
        setShowForm(false);
        setEditingSubCategory(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showForm]);

  const fetchMasterCategories = useCallback(async () => {
    try {
      setMasterLoading(true);
      const res = await api.post<any>(
        "/api/v1/public/get-mastercategories?per_page=all&subcategories=1",
      );
      const payload = res.data ?? {};
      setMasterCategories(payload.categories || payload.mastercategories || []);
    } catch (err) {
      console.error("Failed to fetch master categories:", err);
      setToast({
        type: "error",
        message: "Failed to load master categories. Please try again.",
      });
    } finally {
      setMasterLoading(false);
    }
  }, []);

  const fetchSubCategories = async (masterCategoryId: string) => {
    try {
      setSubLoading(true);
      const res = await api.post<any>(`/api/v1/mastercategories/get-mastercategories/${masterCategoryId}`);
      const subs = res.data?.subcategories;
      setSubCategories(Array.isArray(subs) ? subs : []);
    } catch (err) {
      console.error("Failed to fetch subcategories:", err);
      setToast({
        type: "error",
        message: "Failed to load subcategories. Please try again.",
      });
      setSubCategories([]);
    } finally {
      setSubLoading(false);
    }
  };

  const handleFormSuccess = useCallback(
    async (data: any, action: "created" | "updated") => {
      if (action === "created" && data?.id != null && data?.name != null) {
        setSubCategories((prev) =>
          prev.some((s) => String(s.id) === String(data.id))
            ? prev
            : [...prev, { id: data.id, name: data.name }],
        );
      } else if (action === "updated" && data?.id != null) {
        setSubCategories((prev) =>
          prev.map((s) =>
            String(s.id) === String(data.id) ? { ...s, name: data.name ?? s.name } : s,
          ),
        );
      }
      await fetchMasterCategories();
      setShowForm(false);
      setEditingSubCategory(null);
      setToast({
        type: "success",
        message: `Subcategory "${data.name}" ${action} successfully!`,
      });
    },
    [fetchMasterCategories],
  );

  const handleEdit = useCallback((subcategory: any) => {
    setEditingSubCategory(subcategory);
    setShowForm(true);
  }, []);

  const handleDelete = async () => {
    if (!deletingSubCategory) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/api/v1/subcategories/delete-subcategories/${deletingSubCategory.id}`);
      setToast({
        type: "success",
        message: `Subcategory "${deletingSubCategory.name}" deleted successfully!`,
      });
      await fetchMasterCategories();
      setDeletingSubCategory(null);
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to delete subcategory",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

  const getSelectedMasterCategoryName = () => {
    const master = masterCategories.find((cat) => cat.id == selectedMasterCategory);
    return master ? master.name : "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
            <button
              onClick={() => router.push("/admin")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Manage Subcategories</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Select a master category to view and manage its subcategories
              </p>
            </div>
          </div>

          {/* Master Category Dropdown & Add Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Master Category Dropdown */}
            <div className="flex-1">
              <label className="block font-medium text-gray-700 mb-2 text-sm sm:text-base">
                Master Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedMasterCategory}
                  onChange={(e) => setSelectedMasterCategory(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base bg-white"
                  disabled={masterLoading}
                >
                  <option value="">{masterLoading ? "Loading categories..." : "Select Master Category"}</option>
                  {masterCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                      {Array.isArray(cat.subcategories)
                        ? ` (${cat.subcategories.length} subcategories)`
                        : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={20}
                />
              </div>
            </div>

            {/* Add Subcategory Button */}
            {selectedMasterCategory && (
              <div className="sm:pt-7">
                <button
                  onClick={() => {
                    setEditingSubCategory(null);
                    setShowForm(true);
                  }}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm sm:text-base whitespace-nowrap"
                  type="button"
                >
                  <Plus size={18} />
                  Add Subcategory
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subcategories List */}
        {selectedMasterCategory && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Subcategories</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Master Category: <span className="font-medium text-blue-600">{getSelectedMasterCategoryName()}</span>
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {subCategories.length} {subCategories.length === 1 ? "subcategory" : "subcategories"}
              </span>
            </div>

            {subLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SubCategorySkeleton key={i} />
                ))}
              </div>
            ) : subCategories.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No subcategories yet</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
                  Get started by creating your first subcategory for "{getSelectedMasterCategoryName()}"
                </p>
                <button
                  onClick={() => {
                    setEditingSubCategory(null);
                    setShowForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm sm:text-base"
                  type="button"
                >
                  <Plus size={18} />
                  Create First Subcategory
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {subCategories.map((sub, index) => (
                  <div
                    key={sub.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200"
                    style={{
                      opacity: 0,
                      transform: "translateY(10px)",
                      animation: `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`,
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 w-full">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{sub.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs sm:text-sm font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            {getSelectedMasterCategoryName()}
                          </span>
                          <span className="text-gray-400 text-xs sm:text-sm">ID: {sub.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <button
                          onClick={() => handleEdit(sub)}
                          className="flex items-center gap-1.5 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                          title="Edit Subcategory"
                          type="button"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingSubCategory(sub)}
                          className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                          title="Delete Subcategory"
                          type="button"
                        >
                          <Trash2 size={16} />
                          <span className="text-sm font-medium">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State - No Master Category Selected */}
        {!selectedMasterCategory && !masterLoading && (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Select a Master Category</h3>
              <p className="text-sm sm:text-base text-gray-500">
                Choose a master category from the dropdown above to view and manage its subcategories
              </p>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div
            className="fixed inset-0 flex items-center justify-center z-40 p-4 transition-all duration-200"
            style={{
              backgroundColor: modalVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
            }}
            onClick={() => {
              setShowForm(false);
              setEditingSubCategory(null);
            }}
          >
            <div
              className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-xl w-full max-w-lg transition-all duration-200 max-h-[90vh] overflow-y-auto"
              style={{
                transform: modalVisible ? "scale(1)" : "scale(0.95)",
                opacity: modalVisible ? 1 : 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    {editingSubCategory ? "Edit Subcategory" : "Add New Subcategory"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Master Category:{" "}
                    <span className="font-medium text-blue-600">{getSelectedMasterCategoryName()}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingSubCategory(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded"
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <SubCategoryForm
                subcategory={editingSubCategory}
                masterCategoryId={selectedMasterCategory}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingSubCategory(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deletingSubCategory}
          onClose={() => setDeletingSubCategory(null)}
          onConfirm={handleDelete}
          title="Delete Subcategory"
          message={`Are you sure you want to delete "${deletingSubCategory?.name}"? This action cannot be undone.`}
          loading={deleteLoading}
        />

        {/* Toast Notification */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
      </div>

      <style>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

