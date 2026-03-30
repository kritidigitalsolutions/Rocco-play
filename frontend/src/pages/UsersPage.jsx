import { useEffect, useState } from "react";
import API from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, X } from "lucide-react";
import "./Dashboard.css";

export default function UsersPage() {
  const [users,    setUsers]    = useState([]);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/user");
      setUsers(res.data.data || []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/user/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
    } catch { alert("Failed to delete"); }
  };

  const filtered = users.filter(u =>
    (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Users size={28} style={{ display: "inline-block", marginRight: 8 }} /> User Management</h1>
          <p className="pg-sub">View, search, and manage all platform users</p>
        </div>
        <button className="btn btn-primary" onClick={fetchUsers}><RefreshCw size={16} style={{ display: "inline-block", marginRight: 6 }} /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card s-green">
          <div className="stat-icon"><User size={24} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card s-blue">
          <div className="stat-icon"><CheckCircle size={24} /></div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{users.filter(u => !u.isBlocked).length}</div>
        </div>
        <div className="stat-card s-red">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{users.filter(u => u.isBlocked).length}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-box">
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input placeholder="Search by name or email..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p><Loader size={20} style={{ display: "inline-block", marginRight: 8 }} /> Loading users...</p></div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><p>No users found 😕</p></div>
                  </td></tr>
                ) : filtered.map((u, i) => (
                  <tr key={u._id || i}>
                    <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar">{u.name ? u.name[0].toUpperCase() : "U"}</div>
                        <span className="u-name">{u.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-soft)" }}>{u.email}</td>
                    <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <span className={`badge ${u.isBlocked ? "badge-blocked" : "badge-active"}`}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="icon-btn view" onClick={() => setSelected(u)} title="View"><Eye size={16} /></button>
                        <button className="icon-btn del"  onClick={() => handleDelete(u._id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 6 }} /> User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                <div className="u-avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>
                  {selected.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{selected.name || "Unknown"}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{selected.email}</div>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Account ID</label>
                <input className="form-input" value={selected._id} disabled />
              </div>
              <div className="form-row">
                <label className="form-label">Joined</label>
                <input className="form-input" value={new Date(selected.createdAt).toDateString()} disabled />
              </div>
              <div className="form-row">
                <label className="form-label">Status</label>
                <span className={`badge ${selected.isBlocked ? "badge-blocked" : "badge-active"}`} style={{ fontSize: "0.9rem" }}>
                  {selected.isBlocked ? "Blocked" : "Active"}
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}