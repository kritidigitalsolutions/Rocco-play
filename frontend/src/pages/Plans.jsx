import { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function PlansPage() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    features: ""
  });

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [editId, setEditId] = useState(null);

  // =========================
  // 🧠 INPUT CHANGE
  // =========================
  const ch = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // =========================
  // 📥 FETCH PLANS
  // =========================
  const fetchPlans = async () => {
    try {
      const res = await API.get("/admin/plans");
      setPlans(res.data.plans);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // =========================
  // ➕ CREATE / ✏️ UPDATE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        duration: Number(form.duration),
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      };

      if (editId) {
        await API.put(`/admin/plans/${editId}`, payload);
        alert("Plan updated ✏️");
      } else {
        await API.post("/admin/plans", payload);
        alert("Plan created ✅");
      }

      setForm({
        name: "",
        price: "",
        duration: "",
        features: ""
      });

      setEditId(null);
      fetchPlans();

    } catch (err) {
      console.error(err);
      alert("Error ❌");
    }

    setLoading(false);
  };

  // =========================
  // ❌ DELETE
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await API.delete(`/admin/plans/${id}`);
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // ✏️ EDIT
  // =========================
  const handleEdit = (plan) => {
    setForm({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features.join(", ")
    });
    setEditId(plan._id);
  };

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">💳 Subscription Plans</h1>
        <p className="pg-sub">Create and manage plans</p>
      </div>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>{editId ? "Edit Plan ✏️" : "Create New Plan"}</h3>

          <div className="form-2col">
            <input
              className="form-input-styled"
              name="name"
              placeholder="Plan Name (Basic, Premium)"
              value={form.name}
              onChange={ch}
              required
            />

            <input
              className="form-input-styled"
              name="price"
              type="number"
              placeholder="Price (₹)"
              value={form.price}
              onChange={ch}
              required
            />

            <input
              className="form-input-styled"
              name="duration"
              type="number"
              placeholder="Duration (days)"
              value={form.duration}
              onChange={ch}
              required
            />

            <input
              className="form-input-styled form-full"
              name="features"
              placeholder="Features (comma separated)"
              value={form.features}
              onChange={ch}
            />
          </div>

          <button
            className="btn-lg"
            type="submit"
            style={{ marginTop: 16 }}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : editId
              ? "Update Plan"
              : "Create Plan"}
          </button>
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="content-box" style={{ marginTop: 24 }}>
        <h3>All Plans</h3>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Features</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="5">No plans found</td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>₹{p.price}</td>
                    <td>{p.duration} days</td>
                    <td>{p.features.join(", ")}</td>

                    {/* <td style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-sm"
                        onClick={() => handleEdit(p)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="btn-sm danger"
                        onClick={() => handleDelete(p._id)}
                      >
                        ❌ Delete
                      </button>
                    </td> */}
                    <td className="actions">
  <button
    className="icon-btn edit"
    onClick={() => handleEdit(p)}
    title="Edit"
  >
    <Pencil size={16} />
  </button>

  <button
    className="icon-btn delete"
    onClick={() => handleDelete(p._id)}
    title="Delete"
  >
    <Trash2 size={16} />
  </button>
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}