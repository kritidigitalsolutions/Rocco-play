import { useEffect, useState } from "react";
import API from "../api/axios";
import { HelpCircle, Eye, Edit2, X, Save } from "lucide-react";
import "./Dashboard.css";

export default function HelpPage() {
  const [help,     setHelp]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode,     setMode]     = useState("view");

  useEffect(() => { fetchHelp(); }, []);

  const fetchHelp = async () => {
    try {
      const res = await API.get("/admin/help");
      setHelp(res.data.data || []);
    } catch { setHelp([]); }
  };

  const handleSave = async () => {
    try {
      await API.put(`/admin/help/${selected._id}`, selected);
      setSelected(null);
      fetchHelp();
    } catch { alert("Update failed"); }
  };

  const open = (item, m) => { setSelected(item); setMode(m); };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><HelpCircle size={28} style={{ display: "inline-block", marginRight: 8 }} /> Help Center</h1>
          <p className="pg-sub">Manage your platform's FAQ and support articles</p>
        </div>
      </div>

      {help.length === 0 ? (
        <div className="content-box">
          <div className="empty-state"><p>No help articles found.</p></div>
        </div>
      ) : (
        <div className="doc-grid">
          {help.map((item, i) => (
            <div key={item._id || i} className="doc-card">
              <div className="doc-card-head">
                <h3>{item.question}</h3>
                <div className="doc-card-actions">
                  <button className="icon-btn view" onClick={() => open(item, "view")} title="View"><Eye size={16} /></button>
                  <button className="icon-btn edit" onClick={() => open(item, "edit")} title="Edit"><Edit2 size={16} /></button>
                </div>
              </div>
              {item.category && (
                <span className="badge badge-active">{item.category}</span>
              )}
              <p className="doc-excerpt">{item.answer}</p>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h3>{mode === "view" ? <><HelpCircle size={20} style={{ display: "inline-block", marginRight: 6 }} /> View FAQ</> : <><Edit2 size={20} style={{ display: "inline-block", marginRight: 6 }} /> Edit FAQ</>}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Question</label>
                <input className="form-input" value={selected.question} disabled={mode === "view"}
                  onChange={e => setSelected({ ...selected, question: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Category</label>
                <input className="form-input" value={selected.category || ""} disabled={mode === "view"}
                  onChange={e => setSelected({ ...selected, category: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Answer</label>
                <textarea className="form-input" rows={6} value={selected.answer} disabled={mode === "view"}
                  style={{ resize: "vertical" }}
                  onChange={e => setSelected({ ...selected, answer: e.target.value })} />
              </div>
            </div>
            {mode === "edit" && (
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}><Save size={16} style={{ display: "inline-block", marginRight: 6 }} /> Save Changes</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}