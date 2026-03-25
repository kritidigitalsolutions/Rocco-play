import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";

export default function LegalPage() {
  const [legal,    setLegal]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode,     setMode]     = useState("view");

  useEffect(() => { fetchLegal(); }, []);

  const fetchLegal = async () => {
    try {
      const res = await API.get("/admin/legal");
      setLegal(res.data.documents || []);
    } catch { setLegal([]); }
  };

  const handleSave = async () => {
    try {
      await API.put(`/admin/legal/${selected.type}`, {
        title: selected.title, content: selected.content, type: selected.type,
      });
      setSelected(null);
      fetchLegal();
    } catch { alert("Update failed ❌"); }
  };

  const open = (doc, m) => { setSelected(doc); setMode(m); };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">📜 Legal & Compliance</h1>
          <p className="pg-sub">Manage your platform's legal documents</p>
        </div>
      </div>

      {legal.length === 0 ? (
        <div className="content-box">
          <div className="empty-state"><p>No legal documents found.</p></div>
        </div>
      ) : (
        <div className="doc-grid">
          {legal.map((doc, i) => (
            <div key={doc._id || i} className="doc-card">
              <div className="doc-card-head">
                <h3>{doc.title}</h3>
                <div className="doc-card-actions">
                  <button className="icon-btn view" onClick={() => open(doc, "view")} title="View">👁</button>
                  <button className="icon-btn edit" onClick={() => open(doc, "edit")} title="Edit">✏️</button>
                </div>
              </div>
              <span className={`badge ${doc.isPublished ? "badge-pub" : "badge-draft"}`}>
                {doc.isPublished ? "Published" : "Draft"}
              </span>
              <p className="doc-excerpt">{doc.content}</p>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h3>{mode === "view" ? "📄 View Document" : "✏️ Edit Document"}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Title</label>
                <input className="form-input" value={selected.title} disabled={mode === "view"}
                  onChange={e => setSelected({ ...selected, title: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Content</label>
                <textarea className="form-input" rows={10} value={selected.content} disabled={mode === "view"}
                  style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.88rem", lineHeight: 1.7 }}
                  onChange={e => setSelected({ ...selected, content: e.target.value })} />
              </div>
            </div>
            {mode === "edit" && (
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}