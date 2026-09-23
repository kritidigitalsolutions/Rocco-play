import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import {
  BarChart3,
  Users,
  Film,
  Radio,
  TrendingUp,
  RefreshCw,
  BadgeCheck,
  UserX,
  Clock3,
  Sun,
  CalendarDays,
  CalendarRange,
  Calendar,
  CalendarClock,
  Wallet,
  CreditCard,
  Layers,
  CheckCircle2,
  AlertCircle,
  Tv,
  Percent,
  Smartphone,
  Globe,
  ShieldCheck
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const PIE_COLORS = ["#e50914", "#3b82f6", "#10b981", "#f59e0b"];

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ch-tooltip">
      <p className="ch-tooltip-label">{label}</p>
      <p className="ch-tooltip-val">{payload[0].value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalSubscribedUsers: 0,
    totalNotSubscribedUsers: 0,
    expirySubscriptionCount: 0,
    activeSubscriptionCount: 0,
    cancelledSubscriptionCount: 0,
  });

  const [registrationStats, setRegistrationStats] = useState({
    todayRegistration: 0,
    yesterdayRegistration: 0,
    totalRegistration: 0,
  });

  const [incomeStats, setIncomeStats] = useState({
    todayIncome: 0,
    yesterdayIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    totalIncome: 0,
  });

  const [contentStats, setContentStats] = useState({
    movies: 0,
    series: 0,
    total: 0
  });

  const [categoriesCount, setCategoriesCount] = useState(0);
  const [plansCount, setPlansCount] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState(null);

  const [growthData, setGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const [
        uRes,
        sRes,
        gRes,
        subStatsRes,
        incomeStatsRes,
        regStatsRes,
        catRes,
        planRes,
        paymentRes
      ] = await Promise.all([
        API.get("/admin/users").catch(() => null),
        API.get("/admin/content/stats").catch(() => null),
        API.get("/admin/user/growth").catch(() => null),
        API.get("/admin/subscription/stats").catch(() => null),
        API.get("/admin/subscription/income-stats").catch(() => null),
        API.get("/admin/user/registration-stats").catch(() => null),
        API.get("/admin/categories").catch(() => null),
        API.get("/admin/plan").catch(() => null),
        API.get("/admin/payment-settings").catch(() => null),
      ]);

      if (uRes?.data) {
        setUsers(uRes.data.users || uRes.data.data || uRes.data || []);
      }
      if (sRes?.data?.stats) {
        setContentStats(sRes.data.stats);
      }
      if (gRes?.data?.data) {
        setGrowthData(gRes.data.data);
      }
      if (subStatsRes?.data?.data) {
        setSubscriptionStats(subStatsRes.data.data);
      }
      if (incomeStatsRes?.data?.data) {
        setIncomeStats(incomeStatsRes.data.data);
      }
      if (regStatsRes?.data?.data) {
        setRegistrationStats(regStatsRes.data.data);
      }
      if (catRes?.data) {
        const catList = catRes.data.categories || catRes.data.data || [];
        setCategoriesCount(Array.isArray(catList) ? catList.length : 0);
      }
      if (planRes?.data?.plans) {
        setPlansCount(planRes.data.plans.length);
      }
      if (paymentRes?.data?.data) {
        setPaymentSettings(paymentRes.data.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const totalUsersCount = Array.isArray(users) ? users.length : 0;
  const activeUsersCount = Array.isArray(users) ? users.filter((u) => !u.isBlocked).length : 0;
  const blockedUsersCount = totalUsersCount - activeUsersCount;

  const moviesCount = contentStats.movies || 0;
  const seriesCount = contentStats.series || 0;
  const totalContent = contentStats.total || (moviesCount + seriesCount);

  // Conversion rate: Subscribed / Total Users %
  const conversionRate = totalUsersCount > 0
    ? ((subscriptionStats.totalSubscribedUsers / totalUsersCount) * 100).toFixed(1)
    : "0.0";

  const PIE = [
    { name: "Movies", value: moviesCount },
    { name: "Web Series", value: seriesCount },
  ];

  const GROWTH = growthData.length ? growthData : [];

  return (
    <div className="page-section">
      {/* ─── Header ─── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <BarChart3 style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} size={32} />
            Platform Overview & Monitoring
          </h1>
          <p className="pg-sub">Real-time statistics, revenue analytics, and system health for Rocco Play</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
          <RefreshCw size={17} style={{ marginRight: 6, animation: loading ? "spin 0.8s linear infinite" : "none" }} />
          {loading ? "Refreshing..." : "Refresh Stats"}
        </button>
      </div>

      {/* ─── Section 1: Executive KPI Cards (Single Unified Color Theme) ─── */}
      <div className="stat-grid">
        {/* Total Users */}
        <div className="stat-card">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{loading ? "..." : totalUsersCount.toLocaleString("en-IN")}</div>
          <div className="stat-trend">
            <CheckCircle2 size={13} style={{ color: "var(--green)" }} />
            <span>{activeUsersCount} active • {blockedUsersCount} blocked</span>
          </div>
        </div>

        {/* Content Library */}
        <div className="stat-card">
          <div className="stat-icon"><Film size={22} /></div>
          <div className="stat-label">Content Library</div>
          <div className="stat-value">{loading ? "..." : totalContent.toLocaleString("en-IN")}</div>
          <div className="stat-trend">
            <Tv size={13} style={{ color: "var(--primary)", marginRight: "6px" }} />
            <span>{moviesCount} Movies • {seriesCount} Series</span>
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="stat-card">
          <div className="stat-icon"><BadgeCheck size={22} /></div>
          <div className="stat-label">Active Subscribers</div>
          <div className="stat-value">{loading ? "..." : (subscriptionStats.totalSubscribedUsers || 0).toLocaleString("en-IN")}</div>
          <div className="stat-trend">
            <Percent size={13} style={{ color: "var(--primary)" }} />
            <span>{conversionRate}% subscriber conversion</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="stat-card">
          <div className="stat-icon"><Wallet size={22} /></div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.totalIncome)}</div>
          <div className="stat-trend">
            <TrendingUp size={13} style={{ color: "var(--green)" }} />
            <span>Lifetime subscription earnings</span>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Registration & User Analytics ─── */}
      <div className="content-box">
        <h3><Users size={18} style={{ color: "var(--primary)" }} /> User Registrations & Accounts</h3>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon"><Sun size={20} /></div>
            <div className="stat-label">Today Registrations</div>
            <div className="stat-value">{loading ? "..." : registrationStats.todayRegistration}</div>
            <div className="stat-trend">New accounts joined today</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><CalendarDays size={20} /></div>
            <div className="stat-label">Yesterday Registrations</div>
            <div className="stat-value">{loading ? "..." : registrationStats.yesterdayRegistration}</div>
            <div className="stat-trend">New accounts joined yesterday</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Users size={20} /></div>
            <div className="stat-label">Total Registered Accounts</div>
            <div className="stat-value">{loading ? "..." : registrationStats.totalRegistration}</div>
            <div className="stat-trend">All-time platform registrations</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Radio size={20} /></div>
            <div className="stat-label">Active Accounts</div>
            <div className="stat-value">{loading ? "..." : activeUsersCount}</div>
            <div className="stat-trend">Verified and unblocked accounts</div>
          </div>
        </div>
      </div>

      {/* ─── Section 3: Subscriptions & Revenue Monitoring ─── */}
      <div className="content-box">
        <h3><CreditCard size={18} style={{ color: "var(--primary)" }} /> Subscription Health & Revenue Breakdown</h3>
        <div className="stat-grid">
          {/* Subscribed Users */}
          <div className="stat-card">
            <div className="stat-icon"><BadgeCheck size={20} /></div>
            <div className="stat-label">Subscribed Users</div>
            <div className="stat-value">{loading ? "..." : subscriptionStats.totalSubscribedUsers}</div>
            <div className="stat-trend">Users with active plans</div>
          </div>

          {/* Unsubscribed Users */}
          <div className="stat-card">
            <div className="stat-icon"><UserX size={20} /></div>
            <div className="stat-label">Non-Subscribed Users</div>
            <div className="stat-value">{loading ? "..." : subscriptionStats.totalNotSubscribedUsers}</div>
            <div className="stat-trend">Free / non-paying accounts</div>
          </div>

          {/* Expired Subscriptions */}
          <div className="stat-card">
            <div className="stat-icon"><Clock3 size={20} /></div>
            <div className="stat-label">Expired Subscriptions</div>
            <div className="stat-value">{loading ? "..." : subscriptionStats.expirySubscriptionCount}</div>
            <div className="stat-trend">Elapsed subscription cycles</div>
          </div>

          {/* Today Income */}
          <div className="stat-card">
            <div className="stat-icon"><Sun size={20} /></div>
            <div className="stat-label">Today Income</div>
            <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.todayIncome)}</div>
            <div className="stat-trend">Today&apos;s collections</div>
          </div>

          {/* Weekly Income */}
          <div className="stat-card">
            <div className="stat-icon"><CalendarRange size={20} /></div>
            <div className="stat-label">Weekly Income</div>
            <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.weeklyIncome)}</div>
            <div className="stat-trend">Current week collections</div>
          </div>

          {/* Monthly Income */}
          <div className="stat-card">
            <div className="stat-icon"><Calendar size={20} /></div>
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.monthlyIncome)}</div>
            <div className="stat-trend">Current month collections</div>
          </div>

          {/* Yearly Income */}
          <div className="stat-card">
            <div className="stat-icon"><CalendarClock size={20} /></div>
            <div className="stat-label">Yearly Income</div>
            <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.yearlyIncome)}</div>
            <div className="stat-trend">Current year collections</div>
          </div>

          {/* Total Revenue */}
          <div className="stat-card">
            <div className="stat-icon"><Wallet size={20} /></div>
            <div className="stat-label">Lifetime Revenue</div>
            <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.totalIncome)}</div>
            <div className="stat-trend">Cumulative subscription revenue</div>
          </div>
        </div>
      </div>

      {/* ─── Section 4: Content & Catalog Monitoring ─── */}
      <div className="content-box">
        <h3><Tv size={18} style={{ color: "var(--primary)" }} /> Catalog & Content Assets</h3>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon"><Film size={20} /></div>
            <div className="stat-label">Movies Available</div>
            <div className="stat-value">{loading ? "..." : moviesCount}</div>
            <div className="stat-trend">Full-length feature films</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Tv size={20} /></div>
            <div className="stat-label">Web Series</div>
            <div className="stat-value">{loading ? "..." : seriesCount}</div>
            <div className="stat-trend">Episodic series shows</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Layers size={20} /></div>
            <div className="stat-label">Content Categories</div>
            <div className="stat-value">{loading ? "..." : categoriesCount}</div>
            <div className="stat-trend">Genres & category tags</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><CreditCard size={20} /></div>
            <div className="stat-label">Subscription Plans</div>
            <div className="stat-value">{loading ? "..." : plansCount}</div>
            <div className="stat-trend">Active pricing tiers</div>
          </div>
        </div>
      </div>

      {/* ─── Section 5: Payment Gateways & Infrastructure Monitoring ─── */}
      <div className="content-box">
        <h3><ShieldCheck size={18} style={{ color: "var(--primary)" }} /> Payment Gateways & Transaction Infrastructure</h3>
        <div className="gateway-status-grid">
          {/* HDFC Bank SmartGateway */}
          <div className="gateway-card">
            <div className="gateway-card-head">
              <span className="gateway-name">
                <ShieldCheck size={18} style={{ color: "var(--primary)" }} /> HDFC SmartGateway
              </span>
              <span className={`gateway-status-badge ${paymentSettings?.hdfcEnabled ? "active" : "inactive"}`}>
                {paymentSettings?.hdfcEnabled ? "● Active" : "Disabled"}
              </span>
            </div>
            <div className="gateway-meta">
              <span>Mode: <span className="mode-badge">{paymentSettings?.hdfcMode || "test"}</span></span>
              {paymentSettings?.defaultGateway === "hdfc" && (
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>Primary Gateway</span>
              )}
            </div>
          </div>

          {/* Razorpay */}
          <div className="gateway-card">
            <div className="gateway-card-head">
              <span className="gateway-name">
                <CreditCard size={18} style={{ color: "var(--primary)" }} /> Razorpay
              </span>
              <span className={`gateway-status-badge ${paymentSettings?.razorpayEnabled ? "active" : "inactive"}`}>
                {paymentSettings?.razorpayEnabled ? "● Active" : "Disabled"}
              </span>
            </div>
            <div className="gateway-meta">
              <span>Keys: {paymentSettings?.razorpayKeyConfigured ? "Configured" : "Missing"}</span>
              {paymentSettings?.defaultGateway === "razorpay" && (
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>Primary Gateway</span>
              )}
            </div>
          </div>

          {/* Zaakpay */}
          <div className="gateway-card">
            <div className="gateway-card-head">
              <span className="gateway-name">
                <CreditCard size={18} style={{ color: "var(--primary)" }} /> Zaakpay
              </span>
              <span className={`gateway-status-badge ${paymentSettings?.zaakpayEnabled ? "active" : "inactive"}`}>
                {paymentSettings?.zaakpayEnabled ? "● Active" : "Disabled"}
              </span>
            </div>
            <div className="gateway-meta">
              <span>Mode: <span className="mode-badge">{paymentSettings?.zaakpayMode || "live"}</span></span>
              {paymentSettings?.defaultGateway === "zaakpay" && (
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>Primary Gateway</span>
              )}
            </div>
          </div>

          {/* SabPaisa */}
          <div className="gateway-card">
            <div className="gateway-card-head">
              <span className="gateway-name">
                <CreditCard size={18} style={{ color: "var(--primary)" }} /> SabPaisa
              </span>
              <span className={`gateway-status-badge ${paymentSettings?.sabpaisaEnabled ? "active" : "inactive"}`}>
                {paymentSettings?.sabpaisaEnabled ? "● Active" : "Disabled"}
              </span>
            </div>
            <div className="gateway-meta">
              <span>Mode: <span className="mode-badge">{paymentSettings?.sabpaisaMode || "test"}</span></span>
              {paymentSettings?.defaultGateway === "sabpaisa" && (
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>Primary Gateway</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 6: Charts Row ─── */}
      <div className="charts-row">
        {/* Area Chart */}
        <div className="content-box">
          <h3><TrendingUp size={18} style={{ color: "var(--primary)" }} /> User Growth Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={GROWTH} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e50914" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--text-muted)"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border2)" }} />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#e50914"
                strokeWidth={2.5}
                fill="url(#redGrad)"
                activeDot={{ r: 6, fill: "#e50914", stroke: "var(--bg2)", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="content-box">
          <h3><Film size={18} style={{ color: "var(--primary)" }} /> Content Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={PIE}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {PIE.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border2)",
                  borderRadius: 8,
                  color: "var(--text)",
                }}
              />
              <Legend
                iconType="circle"
                formatter={(v) => <span style={{ color: "var(--text-soft)", fontSize: "0.8rem" }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Section 7: Recent Users Activity Table ─── */}
      <div className="content-box">
        <h3><Users size={18} style={{ color: "var(--primary)" }} /> Recent Registered Users</h3>
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading user activity...</p>
        ) : !Array.isArray(users) || users.length === 0 ? (
          <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>No users registered yet</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((u, i) => (
                  <tr key={u._id || i}>
                    <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div>
                        <span className="u-name">{u.name || "User"}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-soft)" }}>{u.email || "No Email"}</td>
                    <td style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{u.phone || "No Phone"}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          background: u.isBlocked ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: u.isBlocked ? "#ef4444" : "#10b981",
                        }}
                      >
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
