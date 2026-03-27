"use client";

import React, { useEffect, useRef, useState } from "react";
import { Upload, Save, Loader, X } from "lucide-react";
import { api } from "@/lib/admin-api-client";
import type { CourseViewShape } from "./ViewCourseModal";

const API_BASE_URL =
  typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_STATIC_URL ?? "") : "";

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

type MasterCat = { id: number; name: string };
type SubCat = { id: number; name: string };

export default function CourseForm({
  course,
  onSuccess,
  onCancel,
  masterCategories,
  subCategories,
  fetchSubCategories,
}: {
  course: CourseViewShape | null;
  onSuccess: (data: Record<string, unknown>, action: string) => void;
  onCancel: () => void;
  masterCategories: MasterCat[];
  subCategories: SubCat[];
  fetchSubCategories: (masterCategoryId: string) => void | Promise<void>;
}) {
  const [formData, setFormData] = useState({
    title: course?.title || "",
    short_description: course?.short_description || "",
    description: course?.description || "",
    price: course?.price ?? "",
    currency: course?.currency || "USD",
    duration_hours: course?.duration_hours ?? "",
    max_students: course?.max_students ?? "",
    difficulty_level: course?.difficulty_level || "Beginner",
    status: course?.status || "draft",
    prerequisites: course?.prerequisites || "",
    learning_outcomes: course?.learning_outcomes || "",
    master_category_id: "",
    subcategory_id: "",
    thumbnail: null as File | null,
  });

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    course?.thumbnail ? getImageUrl(course.thumbnail) : null,
  );
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formData.master_category_id && !course) {
      void fetchSubCategories(formData.master_category_id);
    }
  }, [formData.master_category_id, course, fetchSubCategories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size should be less than 5MB");
        return;
      }
      setFormData((prev) => ({ ...prev, thumbnail: file }));
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        const v = formData[key as keyof typeof formData];
        if (v !== null && v !== "") {
          if (key === "thumbnail" && v instanceof File) {
            submitData.append(key, v);
          } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            submitData.append(key, String(v));
          }
        }
      });

      if (course?.id) {
        await api.put(`/api/v1/courses/update-courses/${course.id}`, submitData);
        onSuccess(formData as unknown as Record<string, unknown>, "updated");
      } else {
        await api.post("/api/v1/courses/create-courses", submitData);
        onSuccess(formData as unknown as Record<string, unknown>, "created");
      }
    } catch (error: unknown) {
      console.error("Form submission error:", error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!course && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Master Category *</label>
            <select
              name="master_category_id"
              value={formData.master_category_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Master Category</option>
              {masterCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sub Category *</label>
            <select
              name="subcategory_id"
              value={formData.subcategory_id}
              onChange={handleChange}
              required
              disabled={!formData.master_category_id}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Sub Category</option>
              {subCategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
        <input
          type="text"
          name="short_description"
          value={formData.short_description}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
          <input
            type="number"
            name="duration_hours"
            value={formData.duration_hours}
            onChange={handleChange}
            min={0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Students</label>
          <input
            type="number"
            name="max_students"
            value={formData.max_students}
            onChange={handleChange}
            min={0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
          <select
            name="difficulty_level"
            value={formData.difficulty_level}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Course Thumbnail</label>
        <div className="flex items-center gap-4">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload size={18} />
            Choose Image
          </button>
          {thumbnailPreview && (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
              <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setThumbnailPreview(null);
                  setFormData((prev) => ({ ...prev, thumbnail: null }));
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Supported: JPG, PNG, GIF</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites</label>
        <textarea
          name="prerequisites"
          value={formData.prerequisites}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Learning Outcomes</label>
        <textarea
          name="learning_outcomes"
          value={formData.learning_outcomes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={18} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>{course ? "Update" : "Create"} Course</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
