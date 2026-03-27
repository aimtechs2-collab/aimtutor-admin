"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/admin-api-client";

type PaymentUser = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type PaymentCourse = {
  title?: string | null;
  thumbnail?: string | null;
  instructor_name?: string | null;
  difficulty_level?: string | null;
  duration_hours?: number | null;
};

type PaymentRow = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  user?: PaymentUser | null;
  course?: PaymentCourse | null;
};

type LegacyPagination = {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
};

type ApiPagination = Partial<LegacyPagination> & {
  total_items?: number;
  total_pages?: number;
};

type PaymentsApiResponse = {
  payments?: PaymentRow[];
  pagination?: ApiPagination;
};

function toLegacyPagination(p?: ApiPagination | null): LegacyPagination {
  const page = Number(p?.page ?? 1);
  const perPage = Number(p?.per_page ?? 20);
  const totalPages = Number(p?.pages ?? p?.total_pages ?? 1);
  const total = Number(p?.total ?? p?.total_items ?? 0);
  return {
    page,
    pages: totalPages,
    per_page: perPage,
    total,
    has_next: Boolean(p?.has_next ?? page < totalPages),
    has_prev: Boolean(p?.has_prev ?? page > 1),
  };
}

export default function ManagePaymentsStrictClient() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pagination, setPagination] = useState<LegacyPagination>({
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0,
    has_next: false,
    has_prev: false,
  });
  const [filter, setFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [statistics, setStatistics] = useState({
    totalRevenue: 0,
    completedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });

  const calculateStatistics = (paymentsData: PaymentRow[]) => {
    const completed = paymentsData.filter((p) => p.status === "completed");
    const pending = paymentsData.filter((p) => p.status === "pending");
    const failed = paymentsData.filter((p) => p.status === "failed");

    const totalRevenue = completed.reduce((acc, p) => acc + (p.amount || 0), 0);

    setStatistics({
      totalRevenue,
      completedCount: completed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
    });
  };

  const fetchPayments = useCallback(
    async (page = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          per_page: "20",
        });

        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }

        if (searchTerm) {
          params.append("search", searchTerm);
        }

        const response = await api.get<PaymentsApiResponse>(`/api/v1/admin/payments?${params.toString()}`);
        const data = response.data ?? {};

        const rows = (data.payments || []) as PaymentRow[];
        setPayments(rows);
        setPagination(toLegacyPagination(data.pagination));
        calculateStatistics(rows);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("❌ Payments API Error:", err);
        setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to load payment data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, searchTerm],
  );

  useEffect(() => {
    fetchPayments(currentPage);
  }, [currentPage, fetchPayments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPayments(currentPage, true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchPayments, currentPage]);

  const filteredPayments = useMemo(() => {
    let result = [...payments];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (filter === "today") {
      result = result.filter((p) => {
        const paymentDate = new Date(p.created_at).toISOString().split("T")[0];
        return paymentDate === todayStr;
      });
    } else if (filter === "7days") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result = result.filter((p) => new Date(p.created_at) >= sevenDaysAgo);
    } else if (filter === "30days") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter((p) => new Date(p.created_at) >= thirtyDaysAgo);
    }

    result.sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "amount") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortConfig.key === "created_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [payments, filter, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
    }
  };

  const handleCopy = async (text: string, id: string | number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy:", err);
    }
  };

  const getUserName = (user?: PaymentUser | null) => {
    if (!user) return "Unknown User";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown User";
  };

  const getUserInitials = (user?: PaymentUser | null) => {
    if (!user) return "U";
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const exportToCSV = () => {
    const headers = ["ID", "User Name", "User Email", "Course Title", "Amount", "Currency", "Method", "Status", "Date"];
    const csvData = filteredPayments.map((p) => [
      p.id,
      getUserName(p.user),
      p.user?.email || "N/A",
      p.course?.title || "N/A",
      p.amount,
      p.currency,
      p.payment_method || "N/A",
      p.status,
      formatDate(p.created_at),
    ]);

    const csvContent = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join(
      "\n",
    );

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const StatusBadge = ({ status }: { status?: string | null }) => {
    const statusConfig: Record<
      string,
      { style: string; icon: React.ReactNode; label: string }
    > = {
      completed: {
        style: "bg-green-50 text-green-700 border-green-200",
        icon: <CheckCircle size={12} />,
        label: "Completed",
      },
      pending: {
        style: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: <Clock size={12} />,
        label: "Pending",
      },
      failed: {
        style: "bg-red-50 text-red-700 border-red-200",
        icon: <XCircle size={12} />,
        label: "Failed",
      },
    };

    const config = statusConfig[String(status || "pending").toLowerCase()] || statusConfig.pending;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.style}`}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-3 rounded-lg shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-3 border-b">
          <div className="h-5 bg-gray-200 rounded w-28" />
        </div>
        <div className="p-3 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );

  if (error && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[300px] p-4">
        <div className="text-center max-w-sm">
          <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="text-red-600" size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-3 text-sm">{error}</p>
          <button
            onClick={() => fetchPayments(currentPage)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            type="button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-gray-50">
      <div className="h-full overflow-y-auto">
        <div className="p-3 sm:p-4 lg:p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Payment Management</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{pagination.total} total payments</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchPayments(currentPage, true)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
                title="Refresh"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-gray-200"
                title="Export CSV"
                type="button"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            {/* Date Filter */}
            <div className="flex items-center gap-0.5 p-0.5 bg-white rounded-lg border border-gray-200">
              {(["all", "today", "7days", "30days"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setFilter(period)}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    filter === period ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  type="button"
                >
                  {period === "all" ? "All" : period === "today" ? "Today" : period === "7days" ? "7d" : "30d"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <Receipt className="text-blue-600 w-4 h-4" />
                    </div>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{pagination.total}</p>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-green-100 rounded-md">
                      <CheckCircle className="text-green-600 w-4 h-4" />
                    </div>
                    <span className="text-xs text-gray-500">Completed</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-green-600">{statistics.completedCount}</p>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-yellow-100 rounded-md">
                      <Clock className="text-yellow-600 w-4 h-4" />
                    </div>
                    <span className="text-xs text-gray-500">Pending</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-yellow-600">{statistics.pendingCount}</p>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-purple-100 rounded-md">
                      <DollarSign className="text-purple-600 w-4 h-4" />
                    </div>
                    <span className="text-xs text-gray-500">Revenue</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {formatCurrency(statistics.totalRevenue)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Payment History</h2>
                  <span className="text-xs text-gray-500">
                    {filteredPayments.length} of {pagination.total}
                  </span>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Receipt className="text-gray-400" size={24} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">No Payments Found</h3>
                    <p className="text-gray-500 text-xs">
                      {searchTerm ? `No results for "${searchTerm}"` : "No payment records available."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 text-xs">
                          <tr>
                            <th className="px-3 py-2 text-left">
                              <button
                                onClick={() => handleSort("id")}
                                className="font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1 hover:text-gray-900"
                                type="button"
                              >
                                ID <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">
                              Course
                            </th>
                            <th className="px-3 py-2 text-left">
                              <button
                                onClick={() => handleSort("amount")}
                                className="font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1 hover:text-gray-900"
                                type="button"
                              >
                                Amount <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-3 py-2 text-left">
                              <button
                                onClick={() => handleSort("created_at")}
                                className="font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1 hover:text-gray-900"
                                type="button"
                              >
                                Date <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-600 uppercase tracking-wider w-16">
                              View
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {filteredPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-gray-900">#{payment.id}</span>
                                  <button
                                    onClick={() => handleCopy(payment.id.toString(), payment.id)}
                                    className="text-gray-400 hover:text-gray-600 p-0.5"
                                    type="button"
                                  >
                                    {copiedId === payment.id ? (
                                      <CheckCircle className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-indigo-600">
                                      {getUserInitials(payment.user)}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                                      {getUserName(payment.user)}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{payment.user?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                  {payment.course?.title || "Unknown"}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-gray-900">
                                {formatCurrency(payment.amount, payment.currency)}
                              </td>
                              <td className="px-3 py-2.5">
                                {payment.payment_method ? (
                                  <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                                    <CreditCard className="w-3 h-3 text-gray-400" />
                                    {payment.payment_method}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">N/A</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-gray-600 text-xs">{formatShortDate(payment.created_at)}</td>
                              <td className="px-3 py-2.5">
                                <StatusBadge status={payment.status} />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowDetails(true);
                                  }}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                  type="button"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden divide-y divide-gray-100">
                      {filteredPayments.map((payment) => (
                        <div key={payment.id} className="p-3 hover:bg-gray-50">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-indigo-600">
                                  {getUserInitials(payment.user)}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{getUserName(payment.user)}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {payment.course?.title || "Unknown Course"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">
                                {formatCurrency(payment.amount, payment.currency)}
                              </p>
                              <StatusBadge status={payment.status} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <span>#{payment.id}</span>
                              {payment.payment_method && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {payment.payment_method}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatShortDate(payment.created_at)}</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowDetails(true);
                              }}
                              className="text-indigo-600 font-medium flex items-center gap-1"
                              type="button"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {pagination.pages > 1 && (
                  <div className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 hidden sm:block">
                      Page {pagination.page} of {pagination.pages}
                    </p>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.has_prev}
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-0.5">
                        {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                          let pageNum: number;
                          const totalPages = pagination.pages;

                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          if (pageNum < 1 || pageNum > totalPages) return null;

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                                currentPage === pageNum ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
                              }`}
                              type="button"
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.has_next}
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showDetails && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Payment Details</h3>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedPayment(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                type="button"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">ID</p>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-gray-900">#{selectedPayment.id}</p>
                      <button
                        onClick={() => handleCopy(selectedPayment.id.toString(), `modal-${selectedPayment.id}`)}
                        className="text-gray-400 hover:text-gray-600"
                        type="button"
                      >
                        {copiedId === `modal-${selectedPayment.id}` ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <StatusBadge status={selectedPayment.status} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    {selectedPayment.payment_method ? (
                      <p className="font-semibold text-gray-900 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        {selectedPayment.payment_method}
                      </p>
                    ) : (
                      <p className="text-gray-400 italic text-sm">Not specified</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-gray-900 text-sm">{formatDate(selectedPayment.created_at)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</h4>
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-indigo-600">{getUserInitials(selectedPayment.user)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{getUserName(selectedPayment.user)}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{selectedPayment.user?.email}</span>
                    </div>
                    {selectedPayment.user?.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{selectedPayment.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Course</h4>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    {selectedPayment.course?.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedPayment.course.thumbnail}
                        alt=""
                        className="w-14 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-10 bg-indigo-100 rounded flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {selectedPayment.course?.title || "Unknown Course"}
                      </p>
                      <p className="text-xs text-gray-500">by {selectedPayment.course?.instructor_name || "Unknown"}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {selectedPayment.course?.difficulty_level || "N/A"}
                        </span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {selectedPayment.course?.duration_hours || 0}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

