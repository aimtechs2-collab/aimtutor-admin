"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Client } from "@microsoft/microsoft-graph-client";
import { createTeamsMeeting } from "./createTeamsMeeting";
import { ensureTeamsMsalInitialized, getTeamsMsalInstance, handleTeamsRedirect } from "./teams-msal";
import { api } from "@/lib/admin-api-client";

// API endpoints (match legacy)
const API_URL = "/api/v1/live-sessions";
const COURSES_URL = "/api/v1/courses/get-courses?per_page=all";

const getGraphClient = () => {
  const msal = getTeamsMsalInstance();
  const account = msal?.getActiveAccount();
  if (!msal || !account) throw new Error("No active account! Sign in before using Graph client.");

  return Client.init({
    authProvider: async (callback) => {
      try {
        const response = await msal.acquireTokenSilent({
          scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
          account,
        });
        callback(null, response.accessToken);
      } catch (error) {
        callback(error as any, null);
      }
    },
  });
};

type CourseRow = { id: number; title?: string | null; name?: string | null };

type LiveSessionRow = {
  id: number;
  title: string;
  description?: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string | null;
  course?: { id: number; title?: string | null };
  is_recorded?: boolean;
};

export default function ManageTeamsStrictClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [upcoming, setUpcoming] = useState<LiveSessionRow[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    duration: 30,
    is_recorded: true,
  });
  const [emails, setEmails] = useState<string[]>([""]);

  const [meetingResult, setMeetingResult] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"create" | "sessions" | "calendar">("create");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  useEffect(() => {
    // Ensure MSAL redirect is handled and auth state is correct
    handleTeamsRedirect().finally(() => {
      const msal = getTeamsMsalInstance();
      setIsAuthenticated(Boolean(msal?.getActiveAccount()));
    });
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    fetchCourses();
    fetchUpcomingSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCourse) fetchSessions(selectedCourse);
    else setSessions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  useEffect(() => {
    if (activeTab === "calendar" && isAuthenticated) fetchCalendarEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  const fetchCourses = async () => {
    try {
      const res = await api.post<any>(COURSES_URL);
      setCourses(res.data.courses || []);
    } catch (err) {
      setError("Failed to load courses");
    }
  };

  const fetchSessions = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await api.get<any>(`${API_URL}/get-live-sessions?course_id=${courseId}`);
      setSessions(res.data.live_sessions || []);
    } catch {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingSessions = async () => {
    try {
      const res = await api.get<any>(`${API_URL}/get-live-sessions?upcoming_only=true`);
      setUpcoming(res.data.live_sessions || res.data || []);
    } catch {
      // ignore
    }
  };

  const fetchCalendarEvents = async () => {
    if (!isAuthenticated) return;
    try {
      setEventsLoading(true);
      const graphClient = getGraphClient();

      const startDateTime = new Date().toISOString();
      const endDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await graphClient
        .api("/me/calendarView")
        .query({ startDateTime, endDateTime })
        .select("subject,start,end,attendees,organizer,onlineMeeting,id")
        .orderby("start/dateTime")
        .top(50)
        .get();

      setCalendarEvents(response.value);
    } catch {
      setError("Failed to load calendar events");
    } finally {
      setEventsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleEmailChange = (index: number, value: string) => {
    const updatedEmails = [...emails];
    updatedEmails[index] = value;
    setEmails(updatedEmails);
  };

  const addEmailField = () => setEmails([...emails, ""]);
  const removeEmailField = (index: number) => setEmails(emails.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourse) return setError("Please select a course");
    if (!formData.title.trim()) return setError("Title is required");
    if (!formData.startDate || !formData.startTime) return setError("Date and time are required");

    const scheduledDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    if (scheduledDateTime <= new Date()) return setError("Scheduled time must be in the future");

    setSubmitting(true);
    setError(null);
    setMeetingResult(null);

    try {
      const startDateTime = scheduledDateTime.toISOString();
      const endDateTime = new Date(scheduledDateTime.getTime() + formData.duration * 60000).toISOString();
      const validEmails = emails.filter((email) => email.trim() !== "");

      let meetingData = { meeting_url: "", meeting_id: "", meeting_password: "" };

      if (isAuthenticated) {
        try {
          const { meeting } = await createTeamsMeeting({
            subject: formData.title,
            startTime: startDateTime,
            endTime: endDateTime,
            recordAutomatically: formData.is_recorded,
            attendees: validEmails,
          });

          meetingData = {
            meeting_url: meeting.joinUrl,
            meeting_id: meeting.joinMeetingIdSettings?.joinMeetingId || "",
            meeting_password: meeting.joinMeetingIdSettings?.passcode || "",
          };

          setMeetingResult({
            link: meeting.joinUrl,
            id: meeting.joinMeetingIdSettings?.joinMeetingId || "",
            passcode: meeting.joinMeetingIdSettings?.passcode || "",
          });
        } catch {
          setError("Failed to create Teams meeting. Session will be saved without Teams link.");
        }
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        course_id: Number(selectedCourse),
        scheduled_at: startDateTime,
        duration_minutes: Number(formData.duration),
        meeting_url: meetingData.meeting_url,
        meeting_id: meetingData.meeting_id,
        meeting_password: meetingData.meeting_password,
        is_recorded: formData.is_recorded,
        attendees: validEmails,
      };

      await api.post(`${API_URL}/create-live-sessions`, payload);

      setFormData({
        title: "",
        description: "",
        startDate: "",
        startTime: "",
        duration: 30,
        is_recorded: true,
      });
      setEmails([""]);

      setSuccess(isAuthenticated && meetingData.meeting_url ? "Teams meeting created and session saved successfully!" : "Session saved successfully!");

      await Promise.all([fetchSessions(selectedCourse), fetchUpcomingSessions(), isAuthenticated ? fetchCalendarEvents() : Promise.resolve()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sessionId: number, sessionTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${sessionTitle}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`${API_URL}/delete-live-sessions/${sessionId}`);
      setSuccess("Session deleted successfully!");
      await Promise.all([fetchSessions(selectedCourse), fetchUpcomingSessions()]);
    } catch {
      setError("Failed to delete session");
    }
  };

  const handleLogin = async () => {
    try {
      const msal = getTeamsMsalInstance();
      if (!msal) throw new Error("MSAL not available");
      await ensureTeamsMsalInitialized();
      await msal.loginRedirect({
        scopes: ["User.Read", "Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : null;
      setError(msg ? `Failed to sign in with Microsoft: ${msg}` : "Failed to sign in with Microsoft");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const msal = getTeamsMsalInstance();
      if (!msal) throw new Error("MSAL not available");
      await ensureTeamsMsalInitialized();
      await msal.logoutRedirect({
        account: msal.getActiveAccount() ?? undefined,
        postLogoutRedirectUri: window.location.origin + "/admin",
      });
    } catch (err) {
      setLoggingOut(false);
      const msg = err instanceof Error ? err.message : null;
      setError(msg ? `Failed to sign out: ${msg}` : "Failed to sign out");
    }
  };

  const handleViewAttendance = async (eventId: string) => {
    try {
      const graphClient = getGraphClient();
      const eventDetails = await graphClient.api(`/me/events/${eventId}`).get();

      const details = (eventDetails.attendees || []).map((attendee: any) => ({
        name: attendee.emailAddress.name,
        email: attendee.emailAddress.address,
        response: attendee.status.response,
      }));

      setAttendanceData({
        totalInvited: details.length,
        accepted: details.filter((a: any) => a.response === "accepted").length,
        declined: details.filter((a: any) => a.response === "declined").length,
        tentative: details.filter((a: any) => a.response === "tentative").length,
        noResponse: details.filter((a: any) => a.response === "none").length,
        details,
      });
    } catch {
      setError("Failed to load attendance data");
    }
  };

  const copyToClipboard = () => {
    if (!meetingResult?.link) return;
    const details = `
Meeting Link: ${meetingResult.link}
Meeting ID: ${meetingResult.id || "N/A"}
Passcode: ${meetingResult.passcode || "N/A"}
    `.trim();

    navigator.clipboard
      .writeText(details)
      .then(() => setSuccess("Meeting details copied to clipboard!"))
      .catch(() => setError("Failed to copy"));
  };

  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Live Sessions Management</h1>
              <p className="text-sm text-gray-600 mt-1">Schedule and manage your live teaching sessions</p>
            </div>

            {/* Teams Authentication Status */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Teams Connected
                  </span>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition-colors text-sm disabled:opacity-70"
                    type="button"
                  >
                    {loggingOut ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="hidden sm:inline">Signing Out...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span className="hidden sm:inline">Sign Out</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
                  type="button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
                    <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z" />
                  </svg>
                  <span>Connect Microsoft Teams</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700" type="button">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700" type="button">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Course Selection */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">📚 Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900"
          >
            <option value="">-- Choose a Course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px">
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "create"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                type="button"
              >
                ➕ Create Session
              </button>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "sessions"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                type="button"
              >
                📅 Course Sessions
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "calendar"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  type="button"
                >
                  📆 Teams Calendar
                </button>
              )}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Create Session Tab */}
            {activeTab === "create" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {selectedCourse ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {!isAuthenticated && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-yellow-800">Teams not connected</p>
                              <p className="text-sm text-yellow-700 mt-1">
                                Connect Microsoft Teams to automatically create meeting links and send calendar invites.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Session Title *</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="e.g., Introduction to React Hooks"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          required
                          disabled={submitting}
                          maxLength={200}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Brief description of the session..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100"
                          disabled={submitting}
                          maxLength={1000}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            min={minDate}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            required
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                          <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            required
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (mins) *</label>
                          <input
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={(e) => setFormData((p) => ({ ...p, duration: Number(e.target.value) }))}
                            min={1}
                            max={480}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            required
                            disabled={submitting}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Attendees (Email)</label>
                        <div className="space-y-2">
                          {emails.map((email, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="email"
                                placeholder="attendee@example.com"
                                value={email}
                                onChange={(e) => handleEmailChange(index, e.target.value)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                disabled={submitting}
                              />
                              {emails.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeEmailField(index)}
                                  className="bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                                  disabled={submitting}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={addEmailField}
                          className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                          disabled={submitting}
                        >
                          <span className="mr-1 text-lg">+</span> Add Another Email
                        </button>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_recorded"
                          checked={formData.is_recorded}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          id="is_recorded"
                          disabled={submitting}
                        />
                        <label htmlFor="is_recorded" className="ml-2 text-sm text-gray-700 cursor-pointer">
                          📹 Record this session automatically
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Creating Session...
                          </>
                        ) : (
                          <>{isAuthenticated ? "Create Teams Meeting & Save" : "Create Session"}</>
                        )}
                      </button>

                      {meetingResult && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-semibold text-green-800 mb-3">✓ Teams Meeting Created!</p>
                          <div className="space-y-2">
                            <a
                              href={meetingResult.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all text-sm block"
                            >
                              {meetingResult.link}
                            </a>
                            {meetingResult.id && (
                              <p className="text-sm">
                                <span className="font-medium">Meeting ID:</span> {meetingResult.id}
                              </p>
                            )}
                            {meetingResult.passcode && (
                              <p className="text-sm">
                                <span className="font-medium">Passcode:</span> {meetingResult.passcode}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={copyToClipboard}
                              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                            >
                              Copy Details
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <p className="mt-2 text-gray-500">Please select a course to create a session</p>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900">🔔 Upcoming</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{upcoming.length}</span>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {upcoming.length > 0 ? (
                        upcoming.slice(0, 5).map((u) => (
                          <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                            <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{u.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">{new Date(u.scheduled_at).toLocaleString()}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1">{u.course?.title || "Unknown Course"}</p>
                            {u.meeting_url && (
                              <a
                                href={u.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                Join
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 text-sm py-4">No upcoming sessions</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sessions" && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                  <h3 className="text-lg font-bold text-gray-900">📅 Course Sessions</h3>
                  {selectedCourse && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {sessions.length} {sessions.length === 1 ? "Session" : "Sessions"}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  </div>
                ) : !selectedCourse ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500">Please select a course to view sessions</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500">No sessions for this course yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="border border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h4>
                            {s.description && <p className="text-gray-600 text-sm mb-3">{s.description}</p>}
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {new Date(s.scheduled_at).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {s.duration_minutes} mins
                              </span>
                              {s.is_recorded && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                  </svg>
                                  Recording
                                </span>
                              )}
                            </div>
                            {s.meeting_url && (
                              <a
                                href={s.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                Join Meeting
                              </a>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(s.id, s.title)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm flex items-center gap-2"
                            disabled={submitting}
                            type="button"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "calendar" && isAuthenticated && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                  <h3 className="text-lg font-bold text-gray-900">📆 Teams Calendar Events</h3>
                  <button
                    onClick={fetchCalendarEvents}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                {eventsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No upcoming events found</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendees</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {calendarEvents.map((event: any) => (
                            <tr key={event.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="text-sm font-medium text-gray-900">{event.subject}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {new Date(event.start.dateTime).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(event.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                  {new Date(event.end.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{event.attendees?.length || 0} attendees</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-3">
                                  {event.onlineMeeting?.joinUrl && (
                                    <a
                                      href={event.onlineMeeting.joinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      Join
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleViewAttendance(event.id)}
                                    className="text-green-600 hover:text-green-800 font-medium"
                                    type="button"
                                  >
                                    Attendance
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden space-y-4">
                      {calendarEvents.map((event: any) => (
                        <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="font-medium text-gray-900 mb-2">{event.subject}</h4>
                          <div className="space-y-1 text-sm text-gray-500 mb-3">
                            <p>
                              <span className="font-medium">Date:</span> {new Date(event.start.dateTime).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="font-medium">Time:</span>{" "}
                              {new Date(event.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                              {new Date(event.end.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p>
                              <span className="font-medium">Attendees:</span> {event.attendees?.length || 0}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {event.onlineMeeting?.joinUrl && (
                              <a
                                href={event.onlineMeeting.joinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
                              >
                                Join Meeting
                              </a>
                            )}
                            <button
                              onClick={() => handleViewAttendance(event.id)}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200"
                              type="button"
                            >
                              Attendance
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {attendanceData && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                      <h3 className="text-lg font-semibold mb-4">Attendance Summary</h3>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-600">Total Invited</div>
                          <div className="text-xl font-bold">{attendanceData.totalInvited}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-600">Accepted</div>
                          <div className="text-xl font-bold text-green-600">{attendanceData.accepted}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-600">Tentative</div>
                          <div className="text-xl font-bold text-yellow-600">{attendanceData.tentative}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-600">Declined</div>
                          <div className="text-xl font-bold text-red-600">{attendanceData.declined}</div>
                        </div>
                      </div>

                      <h4 className="font-medium mb-2">Attendee Details</h4>
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                        {attendanceData.details.map((attendee: any, index: number) => (
                          <div key={index} className="p-3">
                            <p className="font-medium text-sm">{attendee.name}</p>
                            <p className="text-xs text-gray-500">{attendee.email}</p>
                            <span
                              className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                                attendee.response === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : attendee.response === "declined"
                                    ? "bg-red-100 text-red-800"
                                    : attendee.response === "tentative"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {attendee.response === "none"
                                ? "No Response"
                                : attendee.response.charAt(0).toUpperCase() + attendee.response.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setAttendanceData(null)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium"
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

