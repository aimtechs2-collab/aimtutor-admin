"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle, Clock, Edit3, Plus, Radio, Save, Trash2, Video, XCircle } from "lucide-react";

type CourseRow = {
  id: number;
  title: string;
  instructor_name?: string;
};

type LiveSessionRow = {
  id: number;
  title: string;
  description?: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string | null;
  course: { id: number; title: string; thumbnail?: string | null };
  created_at: string;
  // Optional fields from the backend handler
  meeting_id?: string | null;
  meeting_password?: string | null;
  is_recorded?: boolean;
  recording_url?: string | null;
};

type SessionStatus = "Upcoming" | "Live" | "Completed";

function getSessionStatus(session: LiveSessionRow, nowMs: number): SessionStatus {
  const start = new Date(session.scheduled_at).getTime();
  const end = start + (session.duration_minutes ?? 0) * 60 * 1000;
  if (nowMs < start) return "Upcoming";
  if (nowMs <= end) return "Live";
  return "Completed";
}

function formatLocalDateTimeParts(isoString: string) {
  // Convert ISO -> local date/time inputs
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

export default function ManageLiveSessionsClient() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"Upcoming" | "Live" | "Completed" | "All">("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    course_id: "",
    title: "",
    description: "",
    date: "",
    time: "",
    duration_minutes: "30",
    meeting_url: "",
  });

  const nowMs = useMemo(() => Date.now(), []);

  const loadCourses = useCallback(async () => {
    // Keep it simple: grab enough courses for dropdown
    const res = await fetch(`/api/v1/admin/courses?per_page=1000`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Failed to load courses");
    setCourses((data.courses ?? []) as CourseRow[]);
  }, []);

  const loadSessions = useCallback(async () => {
    const res = await fetch(`/api/v1/live-sessions/get-live-sessions?page=1&per_page=50`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Failed to load live sessions");
    setSessions((data.live_sessions ?? []) as LiveSessionRow[]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCourses(), loadSessions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [loadCourses, loadSessions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredSessions = useMemo(() => {
    if (filter === "All") return sessions;
    // recompute with current time for correctness
    const now = Date.now();
    return sessions.filter((s) => getSessionStatus(s, now) === filter);
  }, [sessions, filter]);

  const resetForm = () => {
    setFormData({
      course_id: "",
      title: "",
      description: "",
      date: "",
      time: "",
      duration_minutes: "30",
      meeting_url: "",
    });
    setEditingId(null);
    setShowModal(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      course_id: courses[0]?.id ? String(courses[0].id) : "",
      title: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      time: "12:00",
      duration_minutes: "30",
      meeting_url: "",
    });
    setShowModal(true);
  };

  const openEdit = (s: LiveSessionRow) => {
    const parts = formatLocalDateTimeParts(s.scheduled_at);
    setEditingId(s.id);
    setFormData({
      course_id: String(s.course.id),
      title: s.title ?? "",
      description: (s.description ?? "") as string,
      date: parts.date,
      time: parts.time,
      duration_minutes: String(s.duration_minutes ?? 30),
      meeting_url: s.meeting_url ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const courseId = Number(formData.course_id);
    const durationMinutes = Number(formData.duration_minutes);
    const title = formData.title.trim();

    if (!Number.isFinite(courseId) || !title) {
      setError("Course and title are required.");
      return;
    }
    if (!formData.date || !formData.time) {
      setError("Date and time are required.");
      return;
    }

    const scheduledAt = new Date(`${formData.date}T${formData.time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError("Invalid date/time provided.");
      return;
    }

    const payload = {
      course_id: courseId,
      title,
      description: formData.description.trim() || null,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: durationMinutes,
      meeting_url: formData.meeting_url.trim() || null,
      meeting_id: "",
      meeting_password: "",
      is_recorded: false,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/v1/live-sessions/update-live-sessions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to update session");
      } else {
        const res = await fetch(`/api/v1/live-sessions/create-live-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to create session");
      }

      await loadSessions();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/live-sessions/delete-live-sessions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete session");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const StatusBadge = ({ status }: { status: SessionStatus }) => {
    const styles: Record<SessionStatus, string> = {
      Upcoming: "bg-blue-100 text-blue-700",
      Completed: "bg-gray-100 text-gray-700",
      Live: "bg-red-100 text-red-700 animate-pulse",
    };
    const icons: Record<SessionStatus, React.ReactNode> = {
      Upcoming: <Clock size={14} />,
      Completed: <CheckCircle size={14} />,
      Live: <Radio size={14} />,
    };
    return (
      <span className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="p-4 lg:p-6 border-gray-50 min-h-[60vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Manage Live Sessions</h1>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50"
          disabled={loading}
        >
          <Plus size={20} />
          Schedule New Session
        </button>
      </div>

      <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-full mb-8 w-full sm:w-auto">
        {(["Upcoming", "Live", "Completed", "All"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-full ${
              filter === t ? "bg-white text-gray-800 shadow" : "text-gray-600"
            }`}
          >
            {t === "All" ? "All" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      ) : error ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredSessions.map((session) => {
            const status = getSessionStatus(session, Date.now());
            const canJoin = status === "Live" || status === "Upcoming";
            const meetingLink = session.meeting_url ?? "";
            const joinLabel = status === "Live" ? "Join Now" : "Go to Session";

            return (
              <div key={session.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div
                  className={`h-32 sm:h-36 relative p-4 flex flex-col justify-between text-white ${
                    status === "Live"
                      ? "bg-gradient-to-br from-red-500 to-orange-500"
                      : "bg-gradient-to-br from-purple-500 to-indigo-600"
                  }`}
                >
                  <div>
                    <StatusBadge status={status} />
                    <h3 className="font-bold text-base sm:text-lg leading-tight mt-2">{session.title}</h3>
                  </div>
                  <p className="text-purple-100 text-xs sm:text-sm mt-1">{session.course?.title ?? "-"}</p>
                </div>

                <div className="p-3 sm:p-4 lg:p-5">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Calendar size={14} />
                      <span>{new Date(session.scheduled_at).toISOString().slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Clock size={14} />
                      <span>
                        {new Date(session.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                        ({session.duration_minutes} min)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={canJoin && meetingLink ? meetingLink : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!canJoin || !meetingLink}
                      onClick={(ev) => {
                        if (!canJoin || !meetingLink) ev.preventDefault();
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        canJoin && meetingLink ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <Video size={16} />
                      {joinLabel}
                    </a>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(session)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
                      >
                        <Edit3 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 size={16} /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSessions.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border p-10 text-center text-gray-600">
              No live sessions found.
            </div>
          ) : null}
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{editingId ? "Edit Session" : "Schedule New Session"}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full" type="button">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData((p) => ({ ...p, course_id: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData((p) => ({ ...p, duration_minutes: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Session Title"
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short description"
                  className="w-full px-4 py-3 border rounded-lg resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData((p) => ({ ...p, time: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting URL</label>
                <input
                  type="url"
                  value={formData.meeting_url}
                  onChange={(e) => setFormData((p) => ({ ...p, meeting_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="w-full sm:flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg">
                  <Save size={18} /> {editingId ? "Update Session" : "Schedule Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

