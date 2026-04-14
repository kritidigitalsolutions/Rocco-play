import { useState, useEffect, useCallback } from "react";
import { Bell, Send, X, Trash2, Eye, RefreshCw } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./Notifications.css";

// ── Type badge colours ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  GENERAL:     { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  SYSTEM:      { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" },
  PLAN:        { bg: "rgba(139,92,246,0.15)",  color: "#8b5cf6" },
  PROMOTIONAL: { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" },
};

const EMPTY_FORM = {
  title:      "",
  message:    "",
  type:       "GENERAL",
  sendTo:     "All Users",
  userSearch: "",
  actionUrl:  "",
};

// ── sendTo value → backend targetUserType mapping ─────────────────────────
const SEND_TO_MAP = {
  "All Users":       "ALL",
  "Subscribers Only":"SUBSCRIBERS",
  "Specific User":   "SPECIFIC_USER",
};

// ── Helper: resolve display target from a notification doc ─────────────────
const resolveTarget = (n) => {
  if (n.targetUser)       return n.targetUser?.name || n.targetUser?.email || "Specific User";
  if (n.targetUserType)   return n.targetUserType === "ALL" ? "All Users" : n.targetUserType;
  return "All Users";
};

export default function NotificationsPage() {
  const [form, setForm]               = useState(EMPTY_FORM);
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers]             = useState([]);
  const [userDropOpen, setUserDropOpen]   = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [toast, setToast]             = useState(null);

  // ── Toast helper ──────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch notifications from backend ──────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setFetching(true);
    try {
      const res = await API.get("/admin/notifications/");
      setNotifications(res.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load notifications.", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Fetch users for searchable dropdown ───────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get("/admin/user/all");
      setUsers(res.data.users || res.data.data || []);
    } catch {
      // Non-critical — fallback to empty list
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, [fetchNotifications, fetchUsers]);

  // ── Form input change ─────────────────────────────────────────────────
  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Filtered user list ────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      (u.name  || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      (u.phone || "").includes(form.userSearch)
  );

  // ── Send notification ─────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      showToast("Please fill in title and message.", "error");
      return;
    }
    if (form.sendTo === "Specific User" && !selectedUser) {
      showToast("Please select a specific user.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title:      form.title.trim(),
        message:    form.message.trim(),
        type:       form.type,
        sendTo:     SEND_TO_MAP[form.sendTo] || "ALL",
        actionUrl:  form.actionUrl.trim() || undefined,
        ...(form.sendTo === "Specific User" && selectedUser
          ? { targetUser: selectedUser._id || selectedUser.id }
          : {}),
      };

      await API.post("/admin/notifications/send", payload);

      showToast("Notification sent successfully! 🎉");
      setForm(EMPTY_FORM);
      setSelectedUser(null);
      fetchNotifications(); // refresh table
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Clear form ────────────────────────────────────────────────────────
  const handleClear = () => {
    setForm(EMPTY_FORM);
    setSelectedUser(null);
  };

  // ── Delete notification ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await API.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast("Notification deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed.", "error");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="add-content-page notif-page">

      {/* ── Toast ── */}
      {toast && (
        <div className={`notif-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <span className="pg-title-icon"><Bell size={26} /></span>
            Notifications
          </h1>
          <p className="pg-sub">Send and manage user notifications</p>
        </div>

        <div className="notif-stats-row">
          <div className="notif-stat-chip">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Total Sent</span>
          </div>
          <div className="notif-stat-chip s-green">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Delivered</span>
          </div>
          <div className="notif-stat-chip s-red">
            <span className="notif-stat-val">0</span>
            <span className="notif-stat-lbl">Failed</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SEND FORM ═══════════════════════ */}
      <form onSubmit={handleSend}>
        <div className="form-card notif-card">
          <h3>
            <span className="notif-card-icon"><Send size={16} /></span>
            Send Notification
          </h3>

          {/* Title */}
          <div className="notif-field-group">
            <label className="notif-label">Notification Title</label>
            <input
              className="form-input-styled notif-input"
              name="title"
              placeholder="Enter notification title"
              value={form.title}
              onChange={ch}
            />
          </div>

          {/* Message */}
          <div className="notif-field-group">
            <label className="notif-label">Message</label>
            <textarea
              className="form-input-styled notif-input notif-textarea"
              name="message"
              placeholder="Write notification message..."
              value={form.message}
              onChange={ch}
              rows={4}
            />
          </div>

          {/* Type + Send To */}
          <div className="notif-2col">
            <div className="notif-field-group">
              <label className="notif-label">Type</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="type"
                value={form.type}
                onChange={ch}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="PLAN">PLAN</option>
                <option value="PROMOTIONAL">PROMOTIONAL</option>
              </select>
            </div>

            <div className="notif-field-group">
              <label className="notif-label">Send To</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="sendTo"
                value={form.sendTo}
                onChange={(e) => {
                  ch(e);
                  setSelectedUser(null);
                  setUserDropOpen(false);
                }}
              >
                <option value="All Users">All Users</option>
                <option value="Specific User">Specific User</option>
                <option value="Subscribers Only">Subscribers Only</option>
              </select>
            </div>
          </div>

          {/* Specific User search (conditional) */}
          {form.sendTo === "Specific User" && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">Search User</label>
              <div className="notif-user-search-wrap">
                <input
                  className="form-input-styled notif-input"
                  name="userSearch"
                  placeholder="Search by name / email / phone"
                  value={selectedUser ? (selectedUser.name || selectedUser.email) : form.userSearch}
                  onChange={(e) => {
                    if (selectedUser) setSelectedUser(null);
                    setForm({ ...form, userSearch: e.target.value });
                    setUserDropOpen(true);
                  }}
                  onFocus={() => setUserDropOpen(true)}
                  autoComplete="off"
                />
                {selectedUser && (
                  <button
                    type="button"
                    className="notif-user-clear"
                    onClick={() => { setSelectedUser(null); setForm({ ...form, userSearch: "" }); }}
                  >
                    <X size={14} />
                  </button>
                )}

                {userDropOpen && !selectedUser && (
                  <div className="notif-user-dropdown">
                    {filteredUsers.length === 0 ? (
                      <div className="notif-user-empty">No users found</div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u._id || u.id}
                          className="notif-user-option"
                          onMouseDown={() => {
                            setSelectedUser(u);
                            setUserDropOpen(false);
                            setForm({ ...form, userSearch: u.name || u.email });
                          }}
                        >
                          <div className="notif-user-avatar">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="notif-user-name">{u.name || "—"}</div>
                            <div className="notif-user-meta">
                              {u.email}{u.phone ? ` · ${u.phone}` : ""}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action URL */}
          <div className="notif-field-group">
            <label className="notif-label">
              Action URL <span className="notif-optional">(optional)</span>
            </label>
            <input
              className="form-input-styled notif-input"
              name="actionUrl"
              placeholder="/plans"
              value={form.actionUrl}
              onChange={ch}
            />
          </div>

          {/* Buttons */}
          <div className="notif-btn-row">
            <button
              type="submit"
              className="btn-lg notif-send-btn"
              disabled={loading}
            >
              {loading ? <span className="notif-spinner" /> : <Send size={16} />}
              {loading ? "Sending..." : "Send Notification"}
            </button>

            <button
              type="button"
              className="btn notif-clear-btn"
              onClick={handleClear}
            >
              <X size={15} />
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* ═══════════════════════ RECENT TABLE ═══════════════════════ */}
      <div className="content-box">
        <h3>
          <span className="notif-card-icon" style={{ color: "var(--orange)" }}>
            <Bell size={16} />
          </span>
          Recent Notifications
          <span className="notif-count-badge">{notifications.length}</span>

          {/* Refresh button */}
          <button
            className="icon-btn view"
            title="Refresh"
            onClick={fetchNotifications}
            style={{ marginLeft: "auto" }}
            type="button"
          >
            <RefreshCw size={14} className={fetching ? "notif-spin-icon" : ""} />
          </button>
        </h3>

        <div className="tbl-wrap">
          {fetching ? (
            <div className="empty-state">
              <span className="notif-spinner" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: 14 }}>Loading notifications…</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Date</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div style={{ fontSize: "2rem" }}>🔔</div>
                        <p>No notifications sent yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n._id}>
                      <td>
                        <span className="notif-row-title">{n.title}</span>
                      </td>

                      <td>
                        <span
                          className="badge"
                          style={{
                            background: TYPE_COLORS[n.type]?.bg  || TYPE_COLORS.GENERAL.bg,
                            color:      TYPE_COLORS[n.type]?.color || TYPE_COLORS.GENERAL.color,
                          }}
                        >
                          {n.type || "GENERAL"}
                        </span>
                      </td>

                      <td>
                        <span className="notif-target">{resolveTarget(n)}</span>
                      </td>

                      <td>
                        <span className="notif-date">
                          {new Date(n.createdAt || n.sentAt).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </span>
                      </td>

                      <td>
                        <div className="tbl-actions" style={{ justifyContent: "center" }}>
                          <button className="icon-btn view" title="View">
                            <Eye size={15} />
                          </button>
                          <button
                            className="icon-btn del"
                            title="Delete"
                            type="button"
                            onClick={() => handleDelete(n._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
