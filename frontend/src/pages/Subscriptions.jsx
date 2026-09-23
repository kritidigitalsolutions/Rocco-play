import { useEffect, useState, useRef } from "react";
import API, { API_BASE_URL } from "../api/axios";
import {
  Eye,
  Trash2,
  X,
  User,
  Ban,
  Plus,
  Search,
  Users,
  Wallet,
  TrendingUp,
  CalendarDays,
  Clock3,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Globe,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import "./Subscription.css";

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [gateway, setGateway] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Monitoring Stats State
  const [stats, setStats] = useState({
    totalSubscribedUsers: 0,
    totalNotSubscribedUsers: 0,
    activeSubscriptionCount: 0,
    expirySubscriptionCount: 0,
    cancelledSubscriptionCount: 0,
    totalSubscriptionsCount: 0,
  });

  const [incomeStats, setIncomeStats] = useState({
    todayIncome: 0,
    yesterdayIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    totalIncome: 0,
  });

  const [revenue, setRevenue] = useState(0);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Give Subscription modal state
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [giveForm, setGiveForm] = useState({
    user: "",
    plan: "",
    amount: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    paymentId: "",
    subscriptionId: "",
  });
  const [giveError, setGiveError] = useState("");
  const [giving, setGiving] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState("");
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const userDropdownRef = useRef(null);
  const planDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target)) {
        setShowPlanDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
    loadPlansList();
  }, []);

  // Fetch subscriptions on filter or page change
  useEffect(() => {
    fetchSubs();
  }, [page, search, status, platform, selectedPlan, gateway, sortBy, sortOrder]);

  useEffect(() => {
    if (isGiveOpen) {
      loadGiveData();
      setGiveForm({
        user: "",
        plan: "",
        amount: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        paymentId: "",
        subscriptionId: "",
      });
      setUserSearchTerm("");
      setShowUserDropdown(false);
      setPlanSearchTerm("");
      setShowPlanDropdown(false);
      setGiveError("");
    }
  }, [isGiveOpen]);

  // ── Fetch Monitoring KPIs ──
  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const [statsRes, incomeRes, revRes] = await Promise.all([
        API.get("/admin/subscription/stats").catch(() => null),
        API.get("/admin/subscription/income-stats").catch(() => null),
        API.get("/admin/subscription/revenue").catch(() => null),
      ]);

      if (statsRes?.data?.data) {
        setStats(statsRes.data.data);
      }
      if (incomeRes?.data?.data) {
        setIncomeStats(incomeRes.data.data);
      }
      if (revRes?.data?.revenue !== undefined) {
        setRevenue(revRes.data.revenue);
      }
    } catch (err) {
      console.error("Failed to load subscription stats:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Fetch Subscriptions with all Filters ──
  const fetchSubs = async () => {
    try {
      setLoadingSubs(true);
      let url = `/admin/subscription/all?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (status && status !== "all") url += `&status=${status}`;
      if (platform && platform !== "all") url += `&platform=${platform}`;
      if (selectedPlan && selectedPlan !== "all") url += `&plan=${selectedPlan}`;
      if (gateway && gateway !== "all") url += `&gateway=${gateway}`;

      const res = await API.get(url);
      setSubs(res.data.subscriptions || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotalCount(res.data.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setSubs([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoadingSubs(false);
    }
  };

  const loadPlansList = async () => {
    try {
      const res = await API.get("/admin/plan");
      setPlansList((res.data.plans || []).filter((p) => p.isActive !== false));
    } catch (err) {
      console.error("Failed to load plans list:", err);
    }
  };

  const loadGiveData = async () => {
    try {
      const [usersRes, plansRes] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/plan"),
      ]);
      setUsersList(usersRes.data.users || []);
      setPlansList((plansRes.data.plans || []).filter((p) => p.isActive !== false));
    } catch (err) {
      console.error("Failed to load users or plans:", err);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setPlatform("all");
    setSelectedPlan("all");
    setGateway("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "all" ||
    platform !== "all" ||
    selectedPlan !== "all" ||
    gateway !== "all" ||
    sortBy !== "createdAt";

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subscription permanently?")) return;
    try {
      await API.delete(`/admin/subscription/${id}`);
      if (subs.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchSubs();
      }
      fetchStats();
      alert("Subscription deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete subscription");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) return;
    try {
      await API.patch(`/admin/subscription/${id}/cancel`);
      setSubs((prev) =>
        prev.map((sub) => (sub._id === id ? { ...sub, status: "cancelled" } : sub))
      );
      fetchStats();
      alert("Subscription cancelled successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel subscription");
    }
  };

  const handlePlanChange = (planId) => {
    const selected = plansList.find((p) => p._id === planId);
    if (!selected) {
      setGiveForm((prev) => ({
        ...prev,
        plan: "",
        amount: "",
        endDate: "",
      }));
      return;
    }

    const start = new Date(giveForm.startDate || new Date());
    const end = new Date(start.getTime() + selected.duration * 24 * 60 * 60 * 1000);
    const endDateStr = end.toISOString().split("T")[0];

    setGiveForm((prev) => ({
      ...prev,
      plan: planId,
      amount: selected.price,
      endDate: endDateStr,
    }));
  };

  const handleStartDateChange = (dateVal) => {
    const selected = plansList.find((p) => p._id === giveForm.plan);
    let endDateStr = giveForm.endDate;

    if (selected && dateVal) {
      const start = new Date(dateVal);
      const end = new Date(start.getTime() + selected.duration * 24 * 60 * 60 * 1000);
      endDateStr = end.toISOString().split("T")[0];
    }

    setGiveForm((prev) => ({
      ...prev,
      startDate: dateVal,
      endDate: endDateStr,
    }));
  };

  const handleGiveSubmit = async (e) => {
    e.preventDefault();
    setGiveError("");
    setGiving(true);

    try {
      await API.post("/admin/subscription", {
        user: giveForm.user,
        plan: giveForm.plan,
        amount: Number(giveForm.amount),
        currency: "INR",
        startDate: giveForm.startDate,
        endDate: giveForm.endDate,
        paymentId: giveForm.paymentId || undefined,
        subscriptionId: giveForm.subscriptionId || undefined,
      });

      setIsGiveOpen(false);
      fetchSubs();
      fetchStats();
      alert("Subscription assigned successfully!");
    } catch (err) {
      setGiveError(err.response?.data?.message || "Failed to assign subscription");
    } finally {
      setGiving(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  // Remaining days calculation
  const getDaysRemaining = (endDateStr) => {
    if (!endDateStr) return null;
    const diff = new Date(endDateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="subscription-page">
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="pg-title" style={{ margin: 0 }}>
            <CreditCard size={28} style={{ color: "#ec4899" }} /> Subscribed Users & Monitoring
          </h1>
          <p className="pg-sub" style={{ margin: "4px 0 0 0" }}>
            Real-time subscriber metrics, revenue breakdown, and user subscription management
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className={`btn-refresh-stats ${refreshing ? "spinning" : ""}`}
            onClick={() => {
              fetchStats();
              fetchSubs();
            }}
            title="Refresh statistics and subscription list"
          >
            <RefreshCw size={15} /> {refreshing ? "Updating..." : "Refresh"}
          </button>
          <button
            className="btn btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: "700",
              boxShadow: "0 4px 12px rgba(229, 9, 20, 0.25)"
            }}
            onClick={() => setIsGiveOpen(true)}
          >
            <Plus size={16} /> Give Subscription
          </button>
        </div>
      </div>

      {/* ── Top Monitoring Cards Grid ── */}
      <div className="subs-stat-grid">
        {/* Card 1: Subscribed Users */}
        <div className="subs-stat-card c-blue">
          <div className="subs-stat-head">
            <span className="subs-stat-title">Subscribed Users</span>
            <div className="subs-stat-icon-wrap">
              <Users size={20} />
            </div>
          </div>
          <div className="subs-stat-val">
            {(stats.totalSubscribedUsers || 0).toLocaleString("en-IN")}
          </div>
          <div className="subs-stat-sub">
            <CheckCircle2 size={13} style={{ color: "var(--green)" }} />
            <span>{stats.activeSubscriptionCount || stats.totalSubscribedUsers || 0} active subscriptions</span>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="subs-stat-card c-pink">
          <div className="subs-stat-head">
            <span className="subs-stat-title">Total Revenue</span>
            <div className="subs-stat-icon-wrap">
              <Wallet size={20} />
            </div>
          </div>
          <div className="subs-stat-val">
            ₹{(incomeStats.totalIncome || revenue || 0).toLocaleString("en-IN")}
          </div>
          <div className="subs-stat-sub">
            <span>All-time subscription earnings</span>
          </div>
        </div>

        {/* Card 3: Today's Income */}
        <div className="subs-stat-card c-green">
          <div className="subs-stat-head">
            <span className="subs-stat-title">Today&apos;s Income</span>
            <div className="subs-stat-icon-wrap">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="subs-stat-val">
            ₹{(incomeStats.todayIncome || 0).toLocaleString("en-IN")}
          </div>
          <div className="subs-stat-sub">
            <span>Weekly: ₹{(incomeStats.weeklyIncome || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Card 4: Monthly Income */}
        <div className="subs-stat-card c-orange">
          <div className="subs-stat-head">
            <span className="subs-stat-title">Monthly Income</span>
            <div className="subs-stat-icon-wrap">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="subs-stat-val">
            ₹{(incomeStats.monthlyIncome || 0).toLocaleString("en-IN")}
          </div>
          <div className="subs-stat-sub">
            <span>Yearly: ₹{(incomeStats.yearlyIncome || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Card 5: Expired / Cancelled */}
        <div className="subs-stat-card c-purple">
          <div className="subs-stat-head">
            <span className="subs-stat-title">Expired & Cancelled</span>
            <div className="subs-stat-icon-wrap">
              <Clock3 size={20} />
            </div>
          </div>
          <div className="subs-stat-val">
            {(stats.expirySubscriptionCount || 0).toLocaleString("en-IN")}
          </div>
          <div className="subs-stat-sub">
            <span>{stats.cancelledSubscriptionCount || 0} cancelled subscriptions</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter & Search Controls ── */}
      <div className="subs-filter-card">
        <div className="subs-filter-row">
          {/* Search Box */}
          <div className="subs-search-box">
            <input
              type="text"
              placeholder="Search by user name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <span className="subs-search-icon">
              <Search size={16} />
            </span>
          </div>

          {/* Status Filter */}
          <select
            className="subs-filter-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>

          {/* Platform Filter */}
          <select
            className="subs-filter-select"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Platforms</option>
            <option value="app">Mobile App</option>
            <option value="website">Website</option>
          </select>

          {/* Plan Filter */}
          <select
            className="subs-filter-select"
            value={selectedPlan}
            onChange={(e) => {
              setSelectedPlan(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Plans</option>
            {plansList.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (₹{p.price})
              </option>
            ))}
          </select>

          {/* Payment Gateway Filter */}
          <select
            className="subs-filter-select"
            value={gateway}
            onChange={(e) => {
              setGateway(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Gateways</option>
            <option value="hdfc">HDFC Bank</option>
            <option value="razorpay">Razorpay</option>
            <option value="zaakpay">Zaakpay</option>
            <option value="sabpaisa">SabPaisa</option>
            <option value="manual">Manual Admin</option>
          </select>

          {/* Sort By */}
          <select
            className="subs-filter-select"
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [by, ord] = e.target.value.split("_");
              setSortBy(by);
              setSortOrder(ord);
              setPage(1);
            }}
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="endDate_desc">Expiry (Latest)</option>
            <option value="endDate_asc">Expiry (Earliest)</option>
            <option value="amount_desc">Amount (High to Low)</option>
          </select>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button className="btn-reset-filters" onClick={handleResetFilters}>
              <RotateCcw size={14} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Subscriptions Table ── */}
      <div className="subs-table-container">
        <table className="subscription-table">
          <thead>
            <tr>
              <th>Subscriber</th>
              <th>Plan</th>
              <th>Platform</th>
              <th>Gateway</th>
              <th>Amount</th>
              <th>Validity</th>
              <th>Status</th>
              <th style={{ textAlign: "right", paddingRight: "20px" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loadingSubs ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", color: "var(--text-soft)" }}>
                    <div style={{ width: "20px", height: "20px", border: "2px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Loading subscriber records...
                  </div>
                </td>
              </tr>
            ) : subs.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty-state">
                    <Users size={36} />
                    <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text)" }}>
                      No subscription records found
                    </div>
                    <div style={{ fontSize: "0.85rem" }}>
                      {hasActiveFilters ? "Try clearing or adjusting your search filters above." : "No users have active subscriptions yet."}
                    </div>
                    {hasActiveFilters && (
                      <button className="btn-reset-filters" style={{ marginTop: "6px" }} onClick={handleResetFilters}>
                        <RotateCcw size={14} /> Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              subs.map((sub) => {
                const now = new Date();
                const isDateValid = sub.endDate && new Date(sub.endDate) > now;
                const isActive = sub.status === "active" && isDateValid;
                const daysRemaining = getDaysRemaining(sub.endDate);

                const isApp = (sub.platform || "app").toLowerCase() === "app";
                const gatewayName = (sub.paymentGateway || "razorpay").toLowerCase();

                return (
                  <tr key={sub._id}>
                    {/* Subscriber Cell */}
                    <td>
                      <div className="sub-user-cell">
                        <div className="sub-user-avatar">
                          {sub.user?.profileImage ? (
                            <img src={getImageUrl(sub.user.profileImage)} alt="Avatar" />
                          ) : (
                            <User size={18} style={{ color: "var(--text-soft)" }} />
                          )}
                        </div>
                        <div className="sub-user-info">
                          <span className="sub-user-name">{sub.user?.name || "Unknown User"}</span>
                          <span className="sub-user-email">{sub.user?.email || "No Email"}</span>
                          {sub.user?.phone && (
                            <span className="sub-user-phone">{sub.user.phone}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Plan Cell */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>
                          {sub.plan?.name || sub.plan || "Custom Plan"}
                        </span>
                        {sub.plan?.duration && (
                          <span style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>
                            {sub.plan.duration} Days • {sub.plan.planType || "Plan"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Platform Cell */}
                    <td>
                      <span className={`badge-pill ${isApp ? "platform-app" : "platform-website"}`}>
                        {isApp ? <Smartphone size={12} /> : <Globe size={12} />}
                        {isApp ? "App" : "Website"}
                      </span>
                    </td>

                    {/* Gateway Cell */}
                    <td>
                      <span className={`badge-pill gateway-${gatewayName}`}>
                        {sub.paymentGateway === "hdfc"
                          ? "HDFC Bank"
                          : sub.paymentGateway === "zaakpay"
                          ? "Zaakpay"
                          : sub.paymentGateway === "sabpaisa"
                          ? "SabPaisa"
                          : sub.paymentGateway === "manual"
                          ? "Manual"
                          : sub.paymentGateway === "voucher"
                          ? "Voucher"
                          : "Razorpay"}
                      </span>
                    </td>

                    {/* Amount Cell */}
                    <td>
                      <span style={{ fontWeight: 800, color: "var(--text)" }}>
                        ₹{sub.amount || 0}
                      </span>
                    </td>

                    {/* Validity Cell */}
                    <td>
                      <div className="validity-cell">
                        <span className="validity-date">
                          {sub.endDate
                            ? new Date(sub.endDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                        {sub.endDate && (
                          <span className="validity-sub">
                            {daysRemaining > 0
                              ? `${daysRemaining} days remaining`
                              : daysRemaining === 0
                              ? "Expires today"
                              : "Expired"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Cell */}
                    <td>
                      <span
                        className={`badge-pill ${
                          isActive
                            ? "status-active"
                            : sub.status === "cancelled"
                            ? "status-cancelled"
                            : "status-expired"
                        }`}
                      >
                        {isActive ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired"}
                      </span>
                    </td>

                    {/* Actions Cell */}
                    <td style={{ textAlign: "right", paddingRight: "20px" }}>
                      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                        <button
                          className="icon-btn view"
                          onClick={() => setSelectedSub(sub)}
                          title="View Subscription Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="icon-btn cancel"
                          style={{
                            opacity: isActive ? 1 : 0.4,
                            cursor: isActive ? "pointer" : "not-allowed",
                          }}
                          disabled={!isActive}
                          onClick={() => handleCancel(sub._id)}
                          title={isActive ? "Cancel Subscription" : "Subscription is not active"}
                        >
                          <Ban size={14} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDelete(sub._id)}
                          title="Delete Subscription"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Pagination Bar ── */}
        <div className="subs-pagination-bar">
          <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
            Showing {subs.length} of {totalCount} subscriptions (Page {page} of {totalPages})
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-ghost"
              style={{
                padding: "6px 14px",
                fontSize: "0.84rem",
                opacity: page === 1 ? 0.4 : 1,
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-ghost"
              style={{
                padding: "6px 14px",
                fontSize: "0.84rem",
                opacity: page >= totalPages ? 0.4 : 1,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
              }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Give Subscription Modal ── */}
      {isGiveOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsGiveOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "24px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              className="modal-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>
                Give Subscription
              </h3>
              <button
                onClick={() => setIsGiveOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleGiveSubmit}>
              <div
                className="modal-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {giveError && (
                  <div
                    style={{
                      color: "var(--red)",
                      background: "rgba(239, 68, 68, 0.1)",
                      padding: "10px 14px",
                      borderRadius: 6,
                      fontSize: "0.9rem",
                    }}
                  >
                    {giveError}
                  </div>
                )}

                <div
                  className="form-row"
                  ref={userDropdownRef}
                  style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}
                >
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Select User *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search user by name, email, or phone..."
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserDropdown(true);
                      if (giveForm.user) setGiveForm({ ...giveForm, user: "" });
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                  />
                  {showUserDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 100,
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                        marginTop: "4px",
                      }}
                    >
                      {usersList
                        .filter(
                          (u) =>
                            !userSearchTerm ||
                            (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                            (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                            (u.phone && String(u.phone).toLowerCase().includes(userSearchTerm.toLowerCase()))
                        )
                        .map((u) => (
                          <div
                            key={u._id}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border)",
                              color: "var(--text)",
                              fontSize: "0.9rem",
                            }}
                            onClick={() => {
                              setGiveForm({ ...giveForm, user: u._id });
                              setUserSearchTerm(`${u.name} (${u.email || u.phone || u._id})`);
                              setShowUserDropdown(false);
                            }}
                            onMouseEnter={(e) => (e.target.style.background = "var(--bg2)")}
                            onMouseLeave={(e) => (e.target.style.background = "transparent")}
                          >
                            {u.name} ({u.email || u.phone || u._id})
                          </div>
                        ))}
                      {usersList.filter(
                        (u) =>
                          !userSearchTerm ||
                          (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                          (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                          (u.phone && String(u.phone).toLowerCase().includes(userSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div
                          style={{
                            padding: "8px 12px",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                            fontStyle: "italic",
                          }}
                        >
                          No users found.
                        </div>
                      )}
                    </div>
                  )}
                  <input type="hidden" required value={giveForm.user} />
                </div>

                <div
                  className="form-row"
                  ref={planDropdownRef}
                  style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}
                >
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Select Plan *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search plan by name..."
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={planSearchTerm}
                    onChange={(e) => {
                      setPlanSearchTerm(e.target.value);
                      setShowPlanDropdown(true);
                      if (giveForm.plan) handlePlanChange("");
                    }}
                    onFocus={() => setShowPlanDropdown(true)}
                  />
                  {showPlanDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 100,
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                        marginTop: "4px",
                      }}
                    >
                      {plansList
                        .filter(
                          (p) =>
                            !planSearchTerm ||
                            (p.name && p.name.toLowerCase().includes(planSearchTerm.toLowerCase()))
                        )
                        .map((p) => (
                          <div
                            key={p._id}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border)",
                              color: "var(--text)",
                              fontSize: "0.9rem",
                            }}
                            onClick={() => {
                              handlePlanChange(p._id);
                              setPlanSearchTerm(`${p.name} (₹${p.price} - ${p.duration} days)`);
                              setShowPlanDropdown(false);
                            }}
                            onMouseEnter={(e) => (e.target.style.background = "var(--bg2)")}
                            onMouseLeave={(e) => (e.target.style.background = "transparent")}
                          >
                            {p.name} (₹{p.price} - {p.duration} days)
                          </div>
                        ))}
                      {plansList.filter(
                        (p) =>
                          !planSearchTerm ||
                          (p.name && p.name.toLowerCase().includes(planSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div
                          style={{
                            padding: "8px 12px",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                            fontStyle: "italic",
                          }}
                        >
                          No plans found.
                        </div>
                      )}
                    </div>
                  )}
                  <input type="hidden" required value={giveForm.plan} />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    placeholder="e.g. 299"
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={giveForm.amount}
                    onChange={(e) => setGiveForm({ ...giveForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Start Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={giveForm.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={giveForm.endDate}
                    onChange={(e) => setGiveForm({ ...giveForm, endDate: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Payment ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. pay_manual_123"
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={giveForm.paymentId}
                    onChange={(e) => setGiveForm({ ...giveForm, paymentId: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}
                  >
                    Subscription ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. sub_manual_123"
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      width: "100%",
                    }}
                    value={giveForm.subscriptionId}
                    onChange={(e) => setGiveForm({ ...giveForm, subscriptionId: e.target.value })}
                  />
                </div>
              </div>

              <div
                className="modal-foot"
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-soft)",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  onClick={() => setIsGiveOpen(false)}
                  disabled={giving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: "var(--primary)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  disabled={giving}
                >
                  {giving ? "Assigning..." : "Give Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal View Details ── */}
      {selectedSub && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedSub(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "24px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              className="modal-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>
                Subscription Details
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* User Section */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  background: "rgba(255,255,255,0.02)",
                  padding: "14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "var(--bg3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  {selectedSub.user?.profileImage ? (
                    <img
                      src={getImageUrl(selectedSub.user.profileImage)}
                      alt="Avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <User size={24} style={{ color: "var(--text-soft)" }} />
                  )}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--text)" }}>
                    {selectedSub.user?.name || "Unknown User"}
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-soft)" }}>
                    {selectedSub.user?.email || "No Email"}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0 0",
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedSub.user?.phone || "No Phone"}
                  </p>
                </div>
              </div>

              {/* Plan Details Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Plan Name</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text)" }}>
                    {selectedSub.plan?.name || selectedSub.plan || "-"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Platform</span>
                  <span
                    className={`badge-pill ${
                      (selectedSub.platform || "app").toLowerCase() === "app"
                        ? "platform-app"
                        : "platform-website"
                    }`}
                  >
                    {(selectedSub.platform || "app").toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Status</span>
                  <span
                    className={`badge-pill ${
                      selectedSub.status === "active"
                        ? "status-active"
                        : selectedSub.status === "cancelled"
                        ? "status-cancelled"
                        : "status-expired"
                    }`}
                  >
                    {selectedSub.status === "active"
                      ? "Active"
                      : selectedSub.status === "cancelled"
                      ? "Cancelled"
                      : "Expired"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Amount Paid</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--text)" }}>
                    ₹{selectedSub.amount || 0}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Payment Gateway</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "capitalize" }}>
                    {selectedSub.paymentGateway || "Razorpay"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
                    Payment / Order ID
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-soft)",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedSub.paymentId || selectedSub.subscriptionId || "N/A"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Start Date</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                    {selectedSub.startDate
                      ? new Date(selectedSub.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Expiry Date</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text)" }}>
                    {selectedSub.endDate
                      ? new Date(selectedSub.endDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: "24px" }}>
              <button
                className="btn btn-ghost"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-soft)",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
                onClick={() => setSelectedSub(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}