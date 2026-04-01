import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import { BarChart3, Users, Film, Radio, TrendingUp, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";

// const GROWTH = growthData;

const COLORS = ["#e50914", "#3b82f6", "#10b981", "#f59e0b"];

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
  const [users,   setUsers]   = useState([]);
 
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [growthData, setGrowthData] = useState([]);

  const GROWTH = growthData.length ? growthData : [];

    const [contentStats, setContentStats] = useState([]);
  const PIE = contentStats.length ? contentStats : [];

  useEffect(() => { fetchData(); }, []);

  // ✅ CORRECT BACKEND ENDPOINTS
  const fetchData = async () => {
    setLoading(true);
    try {
      // const [uRes, cRes] = await Promise.all([
      //   API.get("/user"),       // ✅ correct: /api/user
      //   API.get("/movies"),     // ✅ correct: /api/movies
      // ]);
//     const [uRes, cRes, rRes, gRes, sRes] = await Promise.all([
//   API.get("/user"),
//   // API.get("/movies"),
//   API.get("/admin/content/stats"),
//   API.get("/admin/subscription/revenue"),
//   API.get("/admin/user/growth"),
//   API.get("/admin/content/stats"),
// ]);
const [uRes, sRes, rRes, gRes] = await Promise.all([
  API.get("/user"),
  API.get("/admin/content/stats"),
  API.get("/admin/subscription/revenue"),
  API.get("/admin/user/growth"),
]);

setContentStats(sRes.data.data || []);



setGrowthData(gRes.data.data || []);

setRevenue(rRes.data.revenue || 0);
      setUsers(uRes.data?.data || uRes.data || []);
      // setContent(cRes.data?.data || cRes.data || []);
    } catch (err) {
      console.log("Dashboard fetch error:", err);
    }
    setLoading(false);
  };

  const moviesCount = contentStats.find(c => c.name === "Movies")?.value || 0;
const seriesCount = contentStats.find(c => c.name === "Series")?.value || 0;

const totalContent = moviesCount + seriesCount;


  // const PIE = [
  //   { name: "Movies", value: movies || 1 },
  //   { name: "Series", value: series || 1 },
  //   { name: "Other",  value: other  || 1 },
  // ];

  const activeUsers = Array.isArray(users) ? users.filter(u => !u.isBlocked).length : 0;

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><BarChart3 style={{ display: "inline-block", marginRight: 8 }} size={32} /> Platform Overview</h1>
          <p className="pg-sub">Real-time stats and analytics for Rocco Play</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData}>
          {loading ? <><TrendingUp size={18} style={{ marginRight: 6 }} /> Loading...</> : <><RefreshCw size={18} style={{ marginRight: 6 }} /> Refresh</>}
        </button>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="stat-grid">
        <div className="stat-card s-red">
          <div className="stat-icon"><Users size={32} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{loading ? "..." : (Array.isArray(users) ? users.length : 0)}</div>
          <div className="stat-trend up">↑ +12% this week</div>
        </div>
        <div className="stat-card s-blue">
          <div className="stat-icon"><Film size={32} /></div>
          <div className="stat-label">Content Library</div>
          {/* <div className="stat-value">{loading ? "..." : (Array.isArray(content) ? content.length : 0)}</div> */}
          <div className="stat-value">
  {loading ? "..." : totalContent}
</div>
          <div className="stat-trend up">↑ +8% this week</div>
        </div>
        <div className="stat-card s-green">
          <div className="stat-icon"><Radio size={32} /></div>
          <div className="stat-label">Active Users</div>
          <div className="stat-value">{loading ? "..." : activeUsers}</div>
          <div className="stat-trend up">↑ Live now</div>
        </div>
        <div className="stat-card s-orange">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Monthly Revenue</div>
          {/* <div className="stat-value">₹1.24L</div> */}
          <div className="stat-value">
  ₹{loading ? "..." : (revenue / 100000).toFixed(2)}L
</div>
          {/* <div className="stat-trend down">↓ -2% vs last</div> */}
        </div>
      </div>

      {/* ─── Charts Row ─── */}
      <div className="charts-row">
        {/* Area Chart */}
        <div className="content-box">
          <h3>📈 User Growth — This Week</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={GROWTH} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e50914" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border2)" }} />
              <Area type="monotone" dataKey="users" stroke="#e50914" strokeWidth={2.5}
                fill="url(#redGrad)"
                activeDot={{ r: 6, fill: "#e50914", stroke: "var(--bg2)", strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="content-box">
          <h3>🎬 Content Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={PIE} cx="50%" cy="50%"
                innerRadius={55} outerRadius={88}
                paddingAngle={4} dataKey="value" stroke="none">
                {PIE.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)" }} />
              <Legend iconType="circle" formatter={v => <span style={{ color: "var(--text-soft)", fontSize: "0.8rem" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Recent Activity ─── */}
      <div className="content-box">
        <h3>🕐 Recent Users</h3>
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading...</p>
        ) : !Array.isArray(users) || users.length === 0 ? (
          <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>No users yet</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>User</th><th>Email</th><th>Joined</th></tr></thead>
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
                    <td style={{ color: "var(--text-soft)" }}>{u.email}</td>
                    <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
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