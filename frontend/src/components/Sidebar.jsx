import "./Sidebar.css";

const NAV = [
  { id: "dashboard",   label: "Dashboard",       icon: "📊", color: "#e50914" },
  { id: "users",       label: "Users",            icon: "👥", color: "#3b82f6" },
  { id: "add-content", label: "Add Content",      icon: "➕", color: "#10b981" },
  { id: "content",     label: "Content Library",  icon: "🎬", color: "#f59e0b" },
  { id: "legal",       label: "Legal",            icon: "📜", color: "#8b5cf6" },
  { id: "help",        label: "Help Center",      icon: "❓", color: "#06b6d4" },
  { id: "pricing",     label: "Pricing",          icon: "💳", color: "#ec4899" },
  { id: "settings",    label: "Settings",         icon: "⚙️", color: "#64748b" },
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
                {item.icon}
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
          🚪 <span>Logout</span>
        </button>
        <p className="sidebar-version">v1.0 · {theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
      </div>
    </aside>
  );
}