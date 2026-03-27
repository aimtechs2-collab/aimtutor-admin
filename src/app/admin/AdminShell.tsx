"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronDown,
  DollarSign,
  Menu,
  Search as SearchIcon,
  TrendingUp,
  User,
  Video,
  X,
  Loader2,
} from "lucide-react";
import HeaderSearch from "@/components/admin/HeaderSearch";
import LogoutButton from "@/components/admin/LogoutButton";

type ShellProps = {
  children: React.ReactNode;
  welcomeName: string;
};

type MenuItem = {
  id: string;
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  hasDropdown?: boolean;
  subItems?: { id: string; label: string; path: string }[];
};

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: TrendingUp, path: "/admin/dashboard" },
  {
    id: "courses",
    label: "Courses",
    icon: BookOpen,
    hasDropdown: true,
    subItems: [
      { id: "add-master", label: "Add Master Category", path: "/admin/courses" },
      { id: "add-sub", label: "Add Sub Category", path: "/admin/courses/sub" },
      { id: "add-course", label: "Add Courses", path: "/admin/courses/add" },
      { id: "add-module", label: "Add Modules", path: "/admin/modules/add" },
      { id: "add-lesson", label: "Add Lessons", path: "/admin/lessons/add" },
      { id: "add-resources", label: "Add Resources", path: "/admin/resources/add" },
    ],
  },
  { id: "instructors", label: "Enrollements", icon: User, path: "/admin/enrollments" },
  { id: "students", label: "Manage Students", icon: User, path: "/admin/students" },
  { id: "payments", label: "Payments History", icon: DollarSign, path: "/admin/payments" },
  { id: "teams", label: "Teams Live Sessions", icon: Video, path: "/admin/teams" },
];

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
      <p className="mt-4 text-lg text-gray-600">Loading...</p>
    </div>
  </div>
);

export default function AdminShell({ children, welcomeName }: ShellProps) {
  const pathname = usePathname() ?? "/";

  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const [me, setMe] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const needsFullCourseList = true;

    const apiCalls: Promise<Response>[] = [
      fetch("/api/v1/auth/me"),
      fetch("/api/v1/admin/dashboard"),
    ];

    if (needsFullCourseList) {
      apiCalls.push(fetch("/api/v1/admin/courses?page=1&per_page=1000"));
    }

    Promise.all(apiCalls)
      .then(async (responses) => {
        const jsons = await Promise.all(
          responses.map((r) => r.json().catch(() => ({}))),
        );
        const meRes = jsons[0];
        const dashboardRes = jsons[1];
        const coursesRes = jsons[2];

        setMe(meRes?.user ?? null);
        setDashboardData(dashboardRes ?? {});

        if (needsFullCourseList && coursesRes) {
          setCourses(coursesRes?.courses || []);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);

      if (width < 768) {
        setSidebarExpanded(false);
        setMobileMenuOpen(false);
      } else if (width >= 1024) {
        setSidebarExpanded(true);
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && isMobile) {
        const sidebar = document.querySelector('[data-sidebar]');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen, isMobile]);

  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.hasDropdown && item.subItems) {
        const hasActiveSubItem = item.subItems.some((subItem) => pathname === subItem.path);
        if (hasActiveSubItem) {
          setOpenDropdowns((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleDropdown = (id: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((v) => !v);
  };

  const toggleDesktopSidebar = () => {
    if (!isMobile) setSidebarExpanded((v) => !v);
  };

  // Inject animations (matches legacy portal shell)
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes slideLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      
      @keyframes slideDown {
        from { opacity: 0; max-height: 0; }
        to { opacity: 1; max-height: 500px; }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
        40%, 43% { transform: translate3d(0, -8px, 0); }
        70% { transform: translate3d(0, -4px, 0); }
        90% { transform: translate3d(0, -2px, 0); }
      }
      
      .animate-slideUp { animation: slideUp 0.6s ease-out forwards; opacity: 0; }
      .animate-slideLeft { animation: slideLeft 0.5s ease-out forwards; opacity: 0; }
      .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      .animate-bounce { animation: bounce 2s infinite; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const recent = dashboardData?.recent_activity ?? {};
  const searchData = {
    users: recent?.recent_users ?? [],
    courses,
    enrollments: recent?.recent_enrollments ?? [],
    payments: recent?.recent_payments ?? [],
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {mobileMenuOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        data-sidebar
        className={`
          ${isMobile ? "fixed" : "fixed"}
          ${isMobile ? (mobileMenuOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
          ${sidebarExpanded && !isMobile ? "w-64 sm:w-72" : "w-16 sm:w-20"}
          ${isMobile ? "w-64" : ""}
          top-0 left-0 h-screen transition-all duration-300 ease-in-out
          bg-white/95 backdrop-blur-xl border-r border-white/20 shadow-xl
          ${isMobile ? "z-50" : "z-40"}
          overflow-y-auto
        `}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
              {/* Use public asset for Next.js */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aim-technologies.png" alt="Aim Technologies" className="w-full h-full object-contain" />
            </div>
            {(sidebarExpanded || (isMobile && mobileMenuOpen)) && (
              <div className="font-bold text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate flex items-center gap-2">
                <span>Admin Portal</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex flex-col space-y-1 sm:space-y-2 px-3 sm:px-6 pb-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isCollapsed = !sidebarExpanded && !isMobile;
            const isOpen = openDropdowns[item.id];

            const hasActiveSubItem =
              item.hasDropdown && item.subItems?.some((subItem) => pathname === subItem.path);
            const isActive = item.path ? pathname === item.path : false;

            return (
              <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                {item.hasDropdown ? (
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.id)}
                    className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 group animate-slideLeft w-full ${
                      (hasActiveSubItem || isOpen) && !isCollapsed
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105"
                        : "text-gray-700 hover:bg-white/60 hover:scale-105"
                    }`}
                  >
                    <div
                      className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all duration-300 flex-shrink-0 ${
                        (hasActiveSubItem || isOpen) && !isCollapsed ? "bg-white/20" : "bg-gray-100 group-hover:bg-white group-hover:scale-110"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                          (hasActiveSubItem || isOpen) && !isCollapsed
                            ? "text-white"
                            : "text-gray-600 group-hover:text-blue-600"
                        }`}
                      />
                    </div>
                    {sidebarExpanded || (isMobile && mobileMenuOpen) ? (
                      <>
                        <span className="font-medium text-sm sm:text-base truncate flex-1 text-left">
                          {item.label}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          } ${(hasActiveSubItem || isOpen) && !isCollapsed ? "text-white" : "text-gray-600"}`}
                        />
                      </>
                    ) : null}
                  </button>
                ) : (
                  <Link
                    href={item.path || "#"}
                    onClick={() => isMobile && setMobileMenuOpen(false)}
                    className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 group animate-slideLeft ${
                      isActive && !isCollapsed
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105"
                        : "text-gray-700 hover:bg-white/60 hover:scale-105"
                    }`}
                  >
                    <div
                      className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all duration-300 flex-shrink-0 ${
                        isActive && !isCollapsed ? "bg-white/20" : "bg-gray-100 group-hover:bg-white group-hover:scale-110"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                          isActive && !isCollapsed
                            ? "text-white"
                            : "text-gray-600 group-hover:text-blue-600"
                        }`}
                      />
                    </div>
                    {sidebarExpanded || (isMobile && mobileMenuOpen) ? (
                      <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                    ) : null}
                    {isActive && !isCollapsed && (
                      <div className="absolute right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </Link>
                )}

                {item.hasDropdown &&
                  item.subItems &&
                  isOpen &&
                  (sidebarExpanded || (isMobile && mobileMenuOpen)) && (
                    <div className="ml-6 mt-1 space-y-1 animate-slideDown overflow-hidden">
                      {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.path;
                        return (
                          <Link
                            key={subItem.id}
                            href={subItem.path}
                            onClick={() => isMobile && setMobileMenuOpen(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                              isSubActive
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSubActive ? "bg-blue-600" : "bg-gray-400"
                              }`}
                            />
                            <span className="text-sm">{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-300
          ${
            !isMobile
              ? sidebarExpanded
                ? "ml-64 sm:ml-72"
                : "ml-16 sm:ml-20"
              : "ml-0"
          }
        `}
      >
        <header className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 md:hidden flex-shrink-0"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleDesktopSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 hidden md:block flex-shrink-0"
              >
                <div className="w-5 h-5 flex flex-col justify-center gap-1">
                  <div
                    className={`h-0.5 bg-gray-600 rounded transition-all duration-300 ${
                      !sidebarExpanded ? "rotate-45 translate-y-1" : ""
                    }`}
                  />
                  <div
                    className={`h-0.5 bg-gray-600 rounded transition-all duration-300 ${
                      !sidebarExpanded ? "opacity-0" : ""
                    }`}
                  />
                  <div
                    className={`h-0.5 bg-gray-600 rounded transition-all duration-300 ${
                      !sidebarExpanded ? "-rotate-45 -translate-y-1" : ""
                    }`}
                  />
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
                  Welcome back, {me?.last_name || welcomeName}
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 hidden sm:block">
                  Ready to continue your learning journey?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <HeaderSearch data={searchData} />

              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 md:hidden flex-shrink-0"
              >
                <SearchIcon className="w-5 h-5 text-gray-600" />
              </button>

              {mobileSearchOpen ? (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
                  onClick={() => setMobileSearchOpen(false)}
                >
                  <div className="bg-white p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Search</h3>
                      <button
                        type="button"
                        onClick={() => setMobileSearchOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <HeaderSearch data={searchData} isMobile />
                  </div>
                </div>
              ) : null}

              <Link
                href="/admin/notifications"
                className="relative p-2 sm:p-3 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors duration-200 group flex-shrink-0"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse" />
              </Link>

              <Link
                href="/admin/profile"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 flex-shrink-0"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </Link>

              <div className="flex-shrink-0">
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-visible">{children}</main>
      </div>
    </div>
  );
}

