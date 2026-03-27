"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  summary?: {
    users: number;
    courses: number;
    enrollments: number;
    notifications: number;
  };
};

type CoursesData = {
  courses?: Array<{ id: number; title: string; status: string; enrollment_count: number }>;
};

type PaymentsData = {
  payments?: Array<{ id: number }>;
};

export default function AdminLandingPage() {
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [courses, setCourses] = useState<CoursesData>({});
  const [payments, setPayments] = useState<PaymentsData>({});

  useEffect(() => {
    async function load() {
      const [d, c, p] = await Promise.all([
        fetch("/api/v1/admin/dashboard").then((r) => r.json()).catch(() => ({})),
        fetch("/api/v1/admin/courses?page=1&per_page=5").then((r) => r.json()).catch(() => ({})),
        fetch("/api/v1/admin/payments?page=1&per_page=5").then((r) => r.json()).catch(() => ({})),
      ]);
      setDashboard(d);
      setCourses(c);
      setPayments(p);
    }
    load();
  }, []);

  const cards = [
    { label: "Users", value: dashboard.summary?.users ?? 0 },
    { label: "Courses", value: dashboard.summary?.courses ?? 0 },
    { label: "Enrollments", value: dashboard.summary?.enrollments ?? 0 },
    { label: "Payments (latest page)", value: payments.payments?.length ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold">Admin Overview</h2>
      <p className="mt-2 text-zinc-600">Live dashboard cards and recent courses from admin APIs.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded border p-4">
            <p className="text-sm font-medium text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Recent Courses</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="border px-3 py-2 text-left">Course</th>
                <th className="border px-3 py-2 text-left">Status</th>
                <th className="border px-3 py-2 text-left">Enrollments</th>
              </tr>
            </thead>
            <tbody>
              {(courses.courses ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="border px-3 py-2">{c.title}</td>
                  <td className="border px-3 py-2">{c.status}</td>
                  <td className="border px-3 py-2">{c.enrollment_count}</td>
                </tr>
              ))}
              {(courses.courses ?? []).length === 0 ? (
                <tr>
                  <td className="border px-3 py-4 text-center text-zinc-500" colSpan={3}>
                    No courses found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

