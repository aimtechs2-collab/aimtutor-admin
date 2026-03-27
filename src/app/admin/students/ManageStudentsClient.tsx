"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type StudentRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
};

export default function ManageStudentsClient() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: "1", per_page: "50", role: "student" });
    if (q.trim()) params.set("q", q.trim());
    return params.toString();
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/users?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load students");
      setStudents((data.users ?? []) as StudentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Debounce search for a smoother UI
  useEffect(() => {
    const t = window.setTimeout(() => load(), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const filtered = useMemo(() => {
    if (status === "all") return students;
    if (status === "active") return students.filter((s) => s.is_active);
    return students.filter((s) => !s.is_active);
  }, [students, status]);

  return (
    <div>
      <h2 className="text-2xl font-semibold">Manage Students</h2>
      <p className="mt-2 text-zinc-600">Search, filter, and review student accounts.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by learner email/name"
          className="w-full max-w-md rounded border px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded border px-3 py-2 text-sm hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-zinc-500">Loading students...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="border px-3 py-2 text-left">ID</th>
              <th className="border px-3 py-2 text-left">Learner</th>
              <th className="border px-3 py-2 text-left">Email</th>
              <th className="border px-3 py-2 text-left">Phone</th>
              <th className="border px-3 py-2 text-left">Joined</th>
              <th className="border px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="border px-3 py-2">{s.id}</td>
                <td className="border px-3 py-2">
                  {`${s.first_name} ${s.last_name}`.trim()}
                </td>
                <td className="border px-3 py-2">{s.email}</td>
                <td className="border px-3 py-2">{s.phone ?? "-"}</td>
                <td className="border px-3 py-2">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="border px-3 py-2">{s.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}

            {!loading && filtered.length === 0 ? (
              <tr>
                <td className="border px-3 py-4 text-center text-zinc-500" colSpan={6}>
                  No students found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

