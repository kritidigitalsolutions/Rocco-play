import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, X } from "lucide-react";
import "./Dashboard.css";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
    } catch { alert("Failed to delete"); }
  };

  // const handleToggleBlock = async (id) => {
  //   try {
  //     const res = await API.patch(`/admin/users/${id}/block`);
  //     setUsers(p => p.map(u => u._id === id ? res.data.user : u));
  //     if (selected?._id === id) setSelected(res.data.user);
  //   } catch { alert("Failed to update status"); }
  // };

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
                        <div className="u-avatar">
                          {u.profileImage ? (
                            <img src={getImageUrl(u.profileImage)} alt={u.name} />
                          ) : (
                            u.name ? u.name[0].toUpperCase() : "U"
                          )}
                        </div>
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
                        <button className="icon-btn del" onClick={() => handleDelete(u._id)} title="Delete"><Trash2 size={16} /></button>
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
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              {/* Profile Hero */}
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                  <div className="u-avatar large">
                    {selected.profileImage ? (
                      <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="profile-hero-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ margin: 0 }}>{selected.name || "Unknown User"}</h2>
                      {selected.profileComplete && (
                        <span className="badge badge-active" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>✓ VERIFIED</span>
                      )}
                    </div>
                    <p>{selected.email}</p>
                    <span className={`badge ${selected.isBlocked ? "badge-blocked" : "badge-active"}`}>
                      {selected.isBlocked ? "BLOCKED" : "ACTIVE ACCOUNT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{selected.phone || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Profile Status</span>
                  <span className={`p-detail-value ${selected.profileComplete ? "text-success" : "text-warning"}`}>
                    {selected.profileComplete ? "Complete" : "Incomplete"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono">{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Since</span>
                  <span className="p-detail-value">
                    {selected.createdAt?.$date 
                      ? new Date(selected.createdAt.$date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : selected.createdAt 
                        ? new Date(selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                        : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setSelected(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}