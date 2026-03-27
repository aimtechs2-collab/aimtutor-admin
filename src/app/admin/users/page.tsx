"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/users?per_page=50&page=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load users");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function promote(id: number) {
    const res = await fetch(`/api/v1/admin/users/${id}/promote-instructor`, { method: "POST" });
    if (res.ok) await loadUsers();
  }

  async function deactivate(id: number) {
    const res = await fetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) await loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users</h2>
        <button
          type="button"
          onClick={loadUsers}
          className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-zinc-600">Manage users, role promotion, and deactivation.</p>

      {loading ? <p className="mt-4 text-sm text-zinc-500">Loading users...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-left">Email</th>
              <th className="border px-3 py-2 text-left">Role</th>
              <th className="border px-3 py-2 text-left">Status</th>
              <th className="border px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border px-3 py-2">{`${u.first_name} ${u.last_name}`.trim()}</td>
                <td className="border px-3 py-2">{u.email}</td>
                <td className="border px-3 py-2">{u.role}</td>
                <td className="border px-3 py-2">{u.is_active ? "Active" : "Inactive"}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => promote(u.id)}
                      className="rounded border px-2 py-1 hover:bg-zinc-50"
                    >
                      Promote
                    </button>
                    <button
                      type="button"
                      onClick={() => deactivate(u.id)}
                      className="rounded border px-2 py-1 text-red-700 hover:bg-red-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 ? (
              <tr>
                <td className="border px-3 py-4 text-center text-zinc-500" colSpan={5}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
