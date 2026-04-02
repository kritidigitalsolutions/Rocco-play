import "./Sidebar.css";
// import { BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut } from "lucide-react";
import { BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut, Star } from "lucide-react";

// const NAV = [
//   { id: "dashboard",   label: "Dashboard",       icon: BarChart3, color: "#e50914" },
//   { id: "users",       label: "Users",            icon: Users, color: "#3b82f6" },
//   { id: "add-content", label: "Add Content",      icon: Plus, color: "#10b981" },
//   { id: "content",     label: "Content Library",  icon: Film, color: "#f59e0b" },
//   { id: "legal",       label: "Legal",            icon: FileText, color: "#8b5cf6" },
//   { id: "help",        label: "Help Center",      icon: HelpCircle, color: "#06b6d4" },
//   { id: "pricing",     label: "Pricing",          icon: CreditCard, color: "#ec4899" },
//   { id: "settings",    label: "Settings",         icon: Settings, color: "#64748b" },
// ];

const NAV = [
  { id: "dashboard",   label: "Dashboard",       icon: BarChart3, color: "#e50914" },
  { id: "users",       label: "Users",            icon: Users, color: "#3b82f6" },
  { id: "add-content", label: "Add Content",      icon: Plus, color: "#10b981" },
  { id: "content",     label: "Content Library",  icon: Film, color: "#f59e0b" },

  // ⭐ NEW
  { id: "ratings",     label: "Ratings",          icon: Star, color: "#facc15" },

  // 💳 NEW
  { id: "plans",       label: "Subscription Plans", icon: CreditCard, color: "#ec4899" },
  { id: "pricing",     label: "User Plan",          icon: CreditCard, color: "#ec4899" },

  { id: "legal",       label: "Legal",            icon: FileText, color: "#8b5cf6" },
  { id: "help",        label: "Help Center",      icon: HelpCircle, color: "#06b6d4" },
  { id: "settings",    label: "Settings",         icon: Settings, color: "#64748b" },
];

export default function Sidebar({ activeTab, setActiveTab, theme }) {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <aside className="sidebar">
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">RP</div>
        <div>
          <div className="sidebar-title">RoccoPlay</div>
          <div className="sidebar-tag">Admin Panel</div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              style={isActive ? { "--accent": item.color } : undefined}
            >
              <span className="nav-icon-wrap" style={isActive ? { background: item.color + "22", color: item.color } : undefined}>
                <item.icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
              {isActive && <span className="nav-pill" style={{ background: item.color }} />}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> <span>Logout</span>
        </button>
        <p className="sidebar-version">v1.0 · {theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
      </div>
    </aside>
  );
}