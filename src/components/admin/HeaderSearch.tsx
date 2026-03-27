"use client";

import React, { useEffect, useRef, useState } from "react";

type HeaderSearchData = {
  users?: Array<{
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    phone?: string | null;
  }>;
  courses?: Array<{
    id: number;
    title?: string;
    name?: string;
    instructor_name?: string;
    price?: number | string;
  }>;
  enrollments?: Array<{
    id: number;
    enrolled_at?: string;
    student_name?: string;
    course_name?: string;
  }>;
  payments?: Array<{
    id: number;
    amount?: number | string;
    created_at?: string;
    status?: string;
    user_name?: string;
  }>;
};

type HeaderSearchProps = {
  data: HeaderSearchData;
  isMobile?: boolean;
};

export default function HeaderSearch({ data, isMobile }: HeaderSearchProps) {
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [searchType, setSearchType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: number;
      type: "user" | "course" | "enrollment" | "payment";
      name: string;
      email?: string;
      role?: string;
      icon: string;
      color: "blue" | "green" | "purple" | "emerald";
      instructor?: string;
      amount?: number | string;
      date?: string;
    }>
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { users = [], courses = [], enrollments = [], payments = [] } = data || {};

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const el = searchRef.current;
      if (el && !el.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSearchData = () => {
    const allData: typeof suggestions = [];

    if (searchType === "all" || searchType === "users") {
      users.forEach((user) => {
        allData.push({
          id: user.id,
          type: "user",
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          email: user.email,
          role: user.role,
          icon: "👤",
          color: "blue",
        });
      });
    }

    if (searchType === "all" || searchType === "courses") {
      courses.forEach((course: any) => {
        allData.push({
          id: course.id,
          type: "course",
          name: course.title || course.name,
          instructor: course.instructor_name,
          amount: course.price,
          icon: "📚",
          color: "green",
        });
      });
    }

    if (searchType === "all" || searchType === "enrollments") {
      enrollments.forEach((enrollment: any) => {
        allData.push({
          id: enrollment.id,
          type: "enrollment",
          name: `${enrollment.student_name} - ${enrollment.course_name}`,
          date: enrollment.enrolled_at,
          icon: "🎓",
          color: "purple",
        });
      });
    }

    if (searchType === "all" || searchType === "payments") {
      payments.forEach((payment: any) => {
        allData.push({
          id: payment.id,
          type: "payment",
          name: `Payment by ${payment.user_name ?? ""}`,
          amount: payment.amount,
          date: payment.created_at,
          icon: "💰",
          color: "emerald",
        });
      });
    }

    return allData;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedIndex(-1);

    if (term.trim()) {
      const searchData = getSearchData();
      const filtered = searchData.filter((item) => {
        const searchLower = term.toLowerCase();
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.email?.toLowerCase().includes(searchLower) ||
          item.role?.toLowerCase().includes(searchLower)
        );
      });
      setSuggestions(filtered.slice(0, 8));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          setSearchTerm("");
          setSuggestions([]);
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const getColorClasses = (color: "blue" | "green" | "purple" | "emerald") => {
    const colors: Record<string, string> = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      purple: "bg-purple-100 text-purple-600",
      emerald: "bg-emerald-100 text-emerald-600",
    };
    return colors[color] || "bg-gray-100 text-gray-600";
  };

  return (
    <div ref={searchRef} className={`relative ${!isMobile ? "hidden md:block" : ""}`}>
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          placeholder={`Search ${searchType === "all" ? "everything" : searchType}...`}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm && setIsOpen(true)}
          className={`pl-8 sm:pl-10 pr-24 py-2 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm ${
            isMobile ? "w-full" : "w-40 sm:w-48 lg:w-64"
          }`}
        />

        <select
          value={searchType}
          onChange={(e) => {
            setSearchType(e.target.value);
            setSearchTerm("");
            setSuggestions([]);
            setIsOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-transparent border-0 focus:outline-none text-gray-600 cursor-pointer"
        >
          <option value="all">All</option>
          <option value="users">Users</option>
          <option value="courses">Courses</option>
          <option value="enrollments">Enrollments</option>
          <option value="payments">Payments</option>
        </select>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => {
                setSearchTerm("");
                setSuggestions([]);
                setIsOpen(false);
                setSelectedIndex(-1);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-center gap-3 ${
                index === selectedIndex ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(
                  suggestion.color,
                )}`}
              >
                <span className="text-sm">{suggestion.icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{suggestion.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.type === "user" && suggestion.email}
                  {suggestion.type === "course" && `Instructor: ${suggestion.instructor}`}
                  {suggestion.type === "enrollment" && `Date: ${suggestion.date ? new Date(suggestion.date).toLocaleDateString() : ""}`}
                  {suggestion.type === "payment" && `Amount: ₹${suggestion.amount}`}
                </p>
              </div>

              <span className={`text-xs px-2 py-1 rounded-full capitalize ${getColorClasses(suggestion.color)}`}>
                {suggestion.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
          <p className="text-sm text-gray-500 text-center">No results found for "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

