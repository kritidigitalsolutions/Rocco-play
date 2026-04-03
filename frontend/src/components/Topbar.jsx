import { useState, useEffect } from "react";
import { Search, Bell, Moon, Sun } from "lucide-react";
import "./Topbar.css";
import API from "../api/axios";

export default function Topbar({ theme, toggleTheme ,setActiveTab}) {
  const [adminName, setAdminName] = useState("Admin");
  const [adminData, setAdminData] = useState(null);
  const [search, setSearch] = useState("");
  const [notif, setNotif] = useState(3);
  const [results, setResults] = useState([]);

  // Dropdown + Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // ================= FETCH ADMIN =================
  useEffect(() => {
    fetchAdmin();
  }, []);

  const fetchAdmin = async () => {
    try {
      const res = await API.get("/admin/auth/profile");

      setAdminName(res.data.admin.name);
      setAdminData(res.data.admin);
    } catch (err) {
      console.error("Failed to fetch admin:", err);
    }
  };

  const handleSearch = async (value) => {
  setSearch(value);

  if (!value) {
    setResults([]);
    return;
  }

  try {
    const res = await API.get(`/admin/search?q=${value}`);
    setResults(res.data.data);
  } catch (err) {
    console.error("Search error:", err);
  }
};
const handleSelect = (item) => {
  if (item.type === "User") {
    setActiveTab("users");
  } 
  else if (item.type === "Movie") {
    setActiveTab("content");
  } 
  else if (item.type === "Help") {
    setActiveTab("help");
  }

  setSearch("");
  setResults([]);
};

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // ================= CLOSE DROPDOWN =================
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    window.addEventListener("click", handleClickOutside);

    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <header className="topbar">
        {/* LEFT — Greeting */}
        <div className="topbar-left">
          <h2 className="topbar-greeting">
            Welcome back,{" "}
            <span className="topbar-name">{adminName}</span> 👋
          </h2>
          <p className="topbar-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* RIGHT — Actions */}
        <div className="topbar-actions">
          {/* Search */}
          {/* <div className="topbar-search">
            <Search size={18} className="search-ico" />
            <input
              type="text"
              placeholder="Search anything..."
              value={search}
              // onChange={(e) => setSearch(e.target.value)}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div> */}
          <div className="topbar-search" style={{ position: "relative" }}>
  <Search size={18} className="search-ico" />

  <input
    type="text"
    placeholder="Search anything..."
    value={search}
    onChange={(e) => handleSearch(e.target.value)}
  />

  {/* 🔥 SEARCH RESULTS */}
  {results.length > 0 && (
    <div className="search-dropdown">
      {results.map((item, i) => (
        <div key={i} className="search-item" onClick={() => handleSelect(item)}>
          <strong>{item.title || item.name}</strong>
          <p style={{ fontSize: "12px", opacity: 0.7 }}>
            {item.type}
          </p>
        </div>
      ))}
    </div>
  )}
</div>

          {/* Notifications */}
          <button
            className="action-btn notif-btn"
            title="Notifications"
            onClick={() => setNotif(0)}
          >
            <Bell size={20} />
            {notif > 0 && <span className="notif-badge">{notif}</span>}
          </button>

          {/* Theme Toggle */}
          <button
            className={`theme-toggle ${theme}`}
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          >
            <span className="toggle-track">
              <span className="toggle-thumb">
                {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              </span>
            </span>
            <span className="toggle-label">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>

          {/* Avatar + Dropdown */}
          <div className="admin-menu">
            <div
              className="admin-avatar"
              title={adminName}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>

            {showMenu && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfile(true);
                    setShowMenu(false);
                  }}
                >
                  👤 View Profile
                </div>

                <div
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  🚪 Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= PROFILE MODAL ================= */}
      {showProfile && (
        <div
          className="profile-overlay"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="profile-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-header">
              <h2>Admin Profile</h2>
              <button
                className="close-btn"
                onClick={() => setShowProfile(false)}
              >
                ✖
              </button>
            </div>

            <div className="profile-body">
              <div className="profile-avatar">
                {adminName.charAt(0).toUpperCase()}
              </div>

              <h3>{adminData?.name}</h3>
              <p>{adminData?.email}</p>

              <div className="profile-role">
                Role: {adminData?.role || "ADMIN"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}