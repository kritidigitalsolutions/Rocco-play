import { useState } from "react";
import "./Topbar.css";

export default function Topbar({ theme, toggleTheme }) {
  const adminName = localStorage.getItem("adminName") || "Admin";
  const [search, setSearch] = useState("");
  const [notif, setNotif] = useState(3); // fake notification count

  return (
    <header className="topbar">
      {/* LEFT — Page greeting */}
      <div className="topbar-left">
        <h2 className="topbar-greeting">
          Welcome back, <span className="topbar-name">{adminName}</span> 👋
        </h2>
        <p className="topbar-date">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* RIGHT — Actions */}
      <div className="topbar-actions">

        {/* Search */}
        <div className="topbar-search">
          <span className="search-ico">🔍</span>
          <input
            type="text"
            placeholder="Search anything..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Notifications */}
        <button className="action-btn notif-btn" title="Notifications" onClick={() => setNotif(0)}>
          🔔
          {notif > 0 && <span className="notif-badge">{notif}</span>}
        </button>

        {/* Theme Toggle */}
        <button
          className={`theme-toggle ${theme}`}
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
        >
          <span className="toggle-track">
            <span className="toggle-thumb">{theme === "dark" ? "🌙" : "☀️"}</span>
          </span>
          <span className="toggle-label">{theme === "dark" ? "Dark" : "Light"}</span>
        </button>

        {/* Admin avatar */}
        <div className="admin-avatar" title={adminName}>
          {adminName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}