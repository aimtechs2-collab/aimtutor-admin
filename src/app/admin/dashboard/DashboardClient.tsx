"use client";

import { useEffect, useState } from "react";

type DashboardPayload = {
  statistics?: {
    master_categories?: number;
    subcategories?: number;
    total_courses?: number;
    published_courses?: number;
    total_users?: number;
    total_enrollments?: number;
    total_revenue?: number;
    this_month_revenue?: number;
  };
  recent_activity?: {
    recent_users?: Array<{
      id: number;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string | null;
      role?: string;
    }>;
    recent_enrollments?: Array<{
      user?: { first_name?: string; last_name?: string; email?: string };
      course?: { title?: string };
      enrollment?: { id?: number; enrolled_at?: string };
    }>;
    recent_payments?: Array<{
      id: number;
      amount?: number;
      status?: string;
      created_at?: string;
    }>;
  };
};

type StatCard = {
  title: string;
  value: string | number;
  icon: string;
  color: "indigo" | "orange" | "teal" | "blue" | "pink" | "emerald";
};

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: string;
  color: StatCard["color"];
};

type ActivityCardProps = {
  title: string;
  count: number;
  children: React.ReactNode;
};

function formatDate(dateString?: string) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount?: number) {
  return `₹${parseFloat(String(amount ?? 0)).toFixed(2)}`;
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const colorClasses: Record<StatCard["color"], { bg: string; text: string }> = {
    indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
    teal: { bg: "bg-teal-100", text: "text-teal-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    pink: { bg: "bg-pink-100", text: "text-pink-600" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  };
  const classes = colorClasses[color];
  return (
    <div className="group relative cursor-pointer transform rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg lg:rounded-xl lg:p-5 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1 truncate text-xs font-medium text-gray-600 sm:text-sm">{title}</p>
          <p className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">{value}</p>
        </div>
        <div
          className={`ml-2 flex-shrink-0 rounded-lg p-2 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110 ${classes.bg} lg:p-3 sm:p-2.5`}
        >
          <svg
            className={`h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 ${classes.text}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-0 rounded-b-lg bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out group-hover:w-full lg:rounded-b-xl" />
    </div>
  );
}

function ActivityCard({ title, count, children }: ActivityCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm lg:rounded-xl">
      <div className="border-b border-gray-100 p-3 lg:p-5 sm:p-4">
        <h3 className="text-base font-semibold text-gray-800 sm:text-lg">
          {title} - {count}
        </h3>
      </div>
      <div className="p-3 lg:p-5 sm:p-4">
        <ul className="max-h-48 space-y-2 overflow-y-auto sm:max-h-64 sm:space-y-3 lg:max-h-80">
          {children}
        </ul>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/dashboard");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error || "Failed to load dashboard");
        if (!cancelled) {
          setData(json as DashboardPayload);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const stats = data?.statistics ?? {};
  const recent = data?.recent_activity ?? {};
  const users = recent.recent_users ?? [];
  const enrollments = recent.recent_enrollments ?? [];
  const payments = recent.recent_payments ?? [];

  const statsCards: StatCard[] = [
    {
      title: "Master Categories",
      value: stats.master_categories ?? 0,
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      color: "indigo",
    },
    {
      title: "Sub Categories",
      value: stats.subcategories ?? 0,
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      color: "indigo",
    },
    {
      title: "Courses",
      value: stats.total_courses ?? 0,
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      color: "orange",
    },
    { title: "Published Courses", value: stats.published_courses ?? 0, icon: "M5 13l4 4L19 7", color: "teal" },
    {
      title: "Total Users",
      value: stats.total_users ?? 0,
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
      color: "blue",
    },
    {
      title: "Enrollments",
      value: stats.total_enrollments ?? 0,
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      color: "pink",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.total_revenue ?? 0}`,
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
      color: "emerald",
    },
    { title: "This Month", value: `₹${stats.this_month_revenue ?? 0}`, icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", color: "indigo" },
  ];

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 xl:gap-6">
          {statsCards.map((card, index) => (
            <StatsCard key={index} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          <ActivityCard title="Recent Users" count={users.length}>
            {users.length === 0 ? (
              <li className="py-8 text-center text-gray-500">
                <p className="text-sm">No recent users</p>
              </li>
            ) : (
              [...users].reverse().map((student, index) => (
                <li
                  key={student.id || index}
                  className="flex items-center space-x-3 rounded-lg p-2 transition-colors duration-200 hover:bg-gray-50"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
                    <span className="text-xs font-semibold text-indigo-600 sm:text-sm">
                      {student.first_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 sm:text-base">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="truncate text-xs text-gray-500 sm:text-sm">{student.email}</p>
                    {student.phone ? (
                      <p className="truncate text-xs text-gray-500 sm:text-sm">{student.phone}</p>
                    ) : null}
                    <p className="truncate text-xs capitalize text-gray-500 sm:text-sm">{student.role}</p>
                  </div>
                </li>
              ))
            )}
          </ActivityCard>

          <ActivityCard title="Recent Enrollments" count={enrollments.length}>
            {enrollments.length === 0 ? (
              <li className="py-8 text-center text-gray-500">
                <p className="text-sm">No recent enrollments</p>
              </li>
            ) : (
              enrollments.map((item, index) => (
                <li
                  key={item.enrollment?.id || index}
                  className="rounded-lg p-2 transition-colors duration-200 hover:bg-gray-50"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
                      <span className="text-xs sm:text-sm">📚</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 sm:text-base">
                        <span className="text-indigo-600">
                          {item.user?.first_name} {item.user?.last_name}
                        </span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="break-words">{item.course?.title}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Enrolled on: {formatDate(item.enrollment?.enrolled_at)}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ActivityCard>

          <ActivityCard title="Recent Payments" count={payments.length}>
            {payments.length === 0 ? (
              <li className="py-8 text-center text-gray-500">
                <p className="text-sm">No recent payments</p>
              </li>
            ) : (
              payments.map((payment, index) => (
                <li
                  key={payment.id || index}
                  className="rounded-lg p-2 transition-colors duration-200 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
                      <span className="text-xs font-bold text-emerald-600 sm:text-sm">₹</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-emerald-600 sm:text-lg lg:text-xl">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(payment.created_at)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ActivityCard>
        </div>
      </div>
    </section>
  );
}
