"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlusCircle,
  Edit2,
  Trash2,
  X,
  Search,
  Loader,
  FolderOpen,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

type Category = { id: number; name: string };
type ToastState = { message: string; type: "success" | "error" | "info" };

// Toast Notification Component (ported 1:1 from legacy for pixel parity)
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: ToastState["type"];
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

  const bgColor =
    type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";
  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-all duration-300`}
      style={{
        transform: isVisible ? "translateX(0)" : "translateX(400px)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <Icon size={20} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80" type="button">
        <X size={18} />
      </button>
    </div>
  );
};

// Loading Skeleton Component (ported from legacy)
const CategorySkeleton = () => (
  <div className="border border-gray-200 p-6 rounded-xl shadow-sm animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
    <div className="flex justify-between">
      <div className="h-8 bg-gray-200 rounded w-16" />
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  </div>
);

async function readJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// Add/Edit Master Category Form Component (ported from legacy)
const CategoryForm = ({
  category,
  onSuccess,
  onCancel,
}: {
  category: Category | null;
  onSuccess: (data: any, action: "created" | "updated") => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<any>(null); // preserved from legacy (not rendered)

  const isEditMode = !!category;

  useEffect(() => {
    if (category) setName(category.name || "");
    else {
      setName("");
      setError("");
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    if (name.trim().length < 3) {
      setError("Category name must be at least 3 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isEditMode) {
        const res = await fetch(`/api/v1/mastercategories/update-mastercategories/${category!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const data = await readJsonSafe(res);
        if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Update failed");
        const updated = data?.category ?? data;
        onSuccess(updated, "updated");
        setToast({
          message: `Category "${data?.category?.name}" Updated successfully!`,
          type: "success",
        });
      } else {
        const res = await fetch("/api/v1/mastercategories/create-mastercategories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const data = await readJsonSafe(res);
        if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Create failed");
        const created = data?.category ?? data;
        onSuccess(created, "created");
        setToast({
          message: `Category "${data?.category?.name}" created successfully!`,
          type: "success",
        });
      }
    } catch (err: any) {
      setError(err?.message ?? (isEditMode ? "Error updating master category" : "Error creating master category"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block mb-2 font-medium text-gray-700">
          Category Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          className={`w-full border ${error ? "border-red-500" : "border-gray-300"} px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
          placeholder="Enter master category name"
          autoFocus
          disabled={loading}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              {isEditMode ? "Update" : "Create"} Category
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// Confirmation Modal Component (ported from legacy)
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
      if (e.key === "Escape" && isOpen && !loading) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-50 transition-all duration-200"
      style={{
        backgroundColor: isVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md transition-all duration-200"
        style={{
          transform: isVisible ? "scale(1)" : "scale(0.95)",
          opacity: isVisible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 ${
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

export default function ManageCoursesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/public/get-mastercategories?per_page=all", { method: "POST" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Failed to load categories");

      const list = (data?.mastercategories ?? data?.categories ?? []) as Category[];
      setCategories(list);
      setFilteredCategories(list);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load categories. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const filtered = categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => setModalVisible(true), 10);
    } else {
      setModalVisible(false);
    }
  }, [showForm]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForm) {
        setShowForm(false);
        setEditingCategory(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showForm]);

  const handleFormSuccess = useCallback(
    (data: any, action: "created" | "updated") => {
      fetchCategories();
      setShowForm(false);
      setEditingCategory(null);
      setToast({
        message: `Category "${data?.name}" ${action} successfully!`,
        type: "success",
      });
    },
    [fetchCategories],
  );

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/v1/mastercategories/delete-mastercategories/${deletingCategory.id}`, {
        method: "DELETE",
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Failed to delete category");

      setToast({
        message: `Category "${deletingCategory.name}" deleted successfully!`,
        type: "success",
      });

      await fetchCategories();
      setDeletingCategory(null);
    } catch (err: any) {
      console.error(err);
      setToast({
        message: err?.message ?? "Failed to delete category",
        type: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  }, []);

  const handleCloseToast = useCallback(() => setToast(null), []);

  const modalCategory = useMemo(() => editingCategory, [editingCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Master Categories</h1>
              <p className="text-gray-600 mt-1">Manage your course categories</p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              type="button"
            >
              <PlusCircle size={20} />
              Add New Category
            </button>
          </div>

          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-96 pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <CategorySkeleton key={i} />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FolderOpen className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? "No categories found" : "No categories yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first master category"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                type="button"
              >
                <PlusCircle size={20} />
                Create First Category
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category, index) => (
              <div
                key={category.id}
                className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                style={{
                  opacity: 0,
                  transform: "translateY(10px)",
                  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`,
                }}
              >
                <h2 className="text-xl font-semibold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h2>
                <p className="text-gray-500 mb-6 text-sm">Master Category</p>
                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(category)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium transition-colors"
                    type="button"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm font-medium transition-colors"
                    onClick={() => setDeletingCategory(category)}
                    type="button"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div
            className="fixed inset-0 bg-black flex items-center justify-center z-40 p-4 transition-all duration-200"
            style={{
              backgroundColor: modalVisible ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
            }}
            onClick={() => {
              setShowForm(false);
              setEditingCategory(null);
            }}
          >
            <div
              className="bg-white p-8 rounded-xl shadow-xl w-full max-w-lg transition-all duration-200"
              style={{
                transform: modalVisible ? "scale(1)" : "scale(0.95)",
                opacity: modalVisible ? 1 : 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {modalCategory ? "Edit Category" : "Add New Category"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  type="button"
                >
                  <X size={24} />
                </button>
              </div>

              <CategoryForm
                category={modalCategory}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
              />
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onConfirm={handleDelete}
          title="Delete Category"
          message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
          loading={deleteLoading}
        />

        {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
      </div>

      <style>{`
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

