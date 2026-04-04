import { useState, useEffect } from "react";
import API from "../api/axios";
import "./PromoVoucher.css";
import "../pages/Content.css";

export default function PromoVoucher() {
  const [tab, setTab] = useState("promo");

  const [plans, setPlans] = useState([]);

  const [editPromoId, setEditPromoId] = useState(null);
  const [editVoucherId, setEditVoucherId] = useState(null);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // ================= PROMO =================
  const [promoForm, setPromoForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    maxUses: "",
    applicablePlans: ""
  });

  const [promos, setPromos] = useState([]);

  // ================= VOUCHER =================
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    plan: "",
    validityDays: ""
  });

  const [vouchers, setVouchers] = useState([]);

  // ================= FETCH =================
  const fetchPlans = async () => {
    const res = await API.get("/admin/plans");
    setPlans(res.data.plans);
  };

  const fetchPromos = async () => {
    const res = await API.get("/admin/promo");
    setPromos(res.data.promos);
  };

  const fetchVouchers = async () => {
    const res = await API.get("/admin/voucher");
    setVouchers(res.data.vouchers);
  };

  useEffect(() => {
    fetchPlans();
    fetchPromos();
    fetchVouchers();
  }, []);

  // ================= PROMO =================
  const createPromo = async () => {
    if (!promoForm.code) return alert("Code required");

    try {
      if (editPromoId) {
        await API.put(`/admin/promo/${editPromoId}`, {
          ...promoForm,
          applicablePlans: [promoForm.applicablePlans]
        });
      } else {
        await API.post("/admin/promo", {
          ...promoForm,
          applicablePlans: [promoForm.applicablePlans]
        });
      }

      setPromoForm({
        code: "",
        discountType: "percentage",
        discountValue: "",
        maxUses: "",
        applicablePlans: ""
      });

      setEditPromoId(null);
      setShowPromoModal(false);
      fetchPromos();
    } catch (err) {
      alert("Error");
    }
  };

  const handleEditPromo = (p) => {
    setPromoForm({
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      maxUses: p.maxUses,
      applicablePlans: p.applicablePlans?.[0] || ""
    });

    setEditPromoId(p._id);
    setShowPromoModal(true);
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm("Delete this promo?")) return;
    await API.delete(`/admin/promo/${id}`);
    fetchPromos();
  };

  // ================= VOUCHER =================
  const createVoucher = async () => {
    if (!voucherForm.code) return alert("Code required");

    try {
      if (editVoucherId) {
        await API.put(`/admin/voucher/${editVoucherId}`, voucherForm);
      } else {
        await API.post("/admin/voucher", voucherForm);
      }

      setVoucherForm({
        code: "",
        plan: "",
        validityDays: ""
      });

      setEditVoucherId(null);
      setShowVoucherModal(false);
      fetchVouchers();
    } catch (err) {
      alert("Error");
    }
  };

  const handleEditVoucher = (v) => {
    setVoucherForm({
      code: v.code,
      plan: v.plan?._id || "",
      validityDays: v.validityDays
    });

    setEditVoucherId(v._id);
    setShowVoucherModal(true);
  };

  const handleDeleteVoucher = async (id) => {
    if (!window.confirm("Delete this voucher?")) return;
    await API.delete(`/admin/voucher/${id}`);
    fetchVouchers();
  };

  const closePromoModal = () => {
    setShowPromoModal(false);
    setEditPromoId(null);
  };

  const closeVoucherModal = () => {
    setShowVoucherModal(false);
    setEditVoucherId(null);
  };

  return (
    <div className="pv-container">
      <h1>Promo & Voucher Management</h1>

      <div className="pv-toggle">
        <button className={tab === "promo" ? "active" : ""} onClick={() => setTab("promo")}>
          Promo Codes
        </button>
        <button className={tab === "voucher" ? "active" : ""} onClick={() => setTab("voucher")}>
          Vouchers
        </button>
      </div>

      {/* PROMO */}
      {tab === "promo" && (
        <div className="content-box">
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Promo Codes ({promos.length})</h3>

            <button
              className="btn btn-primary"
              onClick={() => {
                setEditPromoId(null);
                setPromoForm({
                  code: "",
                  discountType: "percentage",
                  discountValue: "",
                  maxUses: "",
                  applicablePlans: ""
                });
                setShowPromoModal(true);
              }}
            >
              + Add Promo
            </button>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Discount</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {promos.map((p) => (
                  <tr key={p._id}>
                    <td>{p.code}</td>
                    <td>{p.discountType}</td>
                    <td>{p.discountValue}</td>
                    <td>{p.usedCount}/{p.maxUses}</td>

                    <td>
                      <div className="tbl-actions">
                        <button className="icon-btn edit" onClick={() => handleEditPromo(p)}>✏️</button>
                        <button className="icon-btn del" onClick={() => handleDeletePromo(p._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VOUCHER */}
      {tab === "voucher" && (
        <div className="content-box">

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Vouchers ({vouchers.length})</h3>

            <button
              className="btn btn-primary"
              onClick={() => {
                setEditVoucherId(null);
                setVoucherForm({
                  code: "",
                  plan: "",
                  validityDays: ""
                });
                setShowVoucherModal(true);
              }}
            >
              + Add Voucher
            </button>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Plan</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {vouchers.map((v) => (
                  <tr key={v._id}>
                    <td>{v.code}</td>
                    <td>{v.plan?.name || "-"}</td>
                    <td>{v.validityDays} days</td>

                    <td>
                      <span className={`badge ${v.isUsed ? "badge-draft" : "badge-active"}`}>
                        {v.isUsed ? "Used" : "Available"}
                      </span>
                    </td>

                    <td>
                      <div className="tbl-actions">
                        <button className="icon-btn edit" onClick={() => handleEditVoucher(v)}>✏️</button>
                        <button className="icon-btn del" onClick={() => handleDeleteVoucher(v._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROMO MODAL */}
      {showPromoModal && (
        <div className="modal-overlay" onClick={closePromoModal}>
          <div className="modal-box modal-box-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editPromoId ? "Edit Promo" : "Create Promo"}</h3>
              <button className="modal-close" onClick={closePromoModal}>✖</button>
            </div>

            <div className="modal-body">
              <input className="form-input" placeholder="Code" value={promoForm.code} onChange={(e)=>setPromoForm({...promoForm,code:e.target.value})}/>
              <select className="form-input" value={promoForm.discountType} onChange={(e)=>setPromoForm({...promoForm,discountType:e.target.value})}>
                <option value="percentage">Percentage</option>
                <option value="flat">Flat</option>
              </select>
              <input className="form-input" placeholder="Discount" value={promoForm.discountValue} onChange={(e)=>setPromoForm({...promoForm,discountValue:e.target.value})}/>
              <input className="form-input" placeholder="Max Uses" value={promoForm.maxUses} onChange={(e)=>setPromoForm({...promoForm,maxUses:e.target.value})}/>
              <select className="form-input" value={promoForm.applicablePlans} onChange={(e)=>setPromoForm({...promoForm,applicablePlans:e.target.value})}>
                <option value="">Select Plan</option>
                {plans.map(p=>(<option key={p._id} value={p._id}>{p.name}</option>))}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closePromoModal}>Cancel</button>
              <button className="btn btn-primary" onClick={createPromo}>
                {editPromoId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER MODAL */}
      {showVoucherModal && (
        <div className="modal-overlay" onClick={closeVoucherModal}>
          <div className="modal-box modal-box-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editVoucherId ? "Edit Voucher" : "Create Voucher"}</h3>
              <button className="modal-close" onClick={closeVoucherModal}>✖</button>
            </div>

            <div className="modal-body">
              <input className="form-input" placeholder="Code" value={voucherForm.code} onChange={(e)=>setVoucherForm({...voucherForm,code:e.target.value})}/>
              <select className="form-input" value={voucherForm.plan} onChange={(e)=>setVoucherForm({...voucherForm,plan:e.target.value})}>
                <option value="">Select Plan</option>
                {plans.map(p=>(<option key={p._id} value={p._id}>{p.name}</option>))}
              </select>
              <input className="form-input" placeholder="Validity Days" value={voucherForm.validityDays} onChange={(e)=>setVoucherForm({...voucherForm,validityDays:e.target.value})}/>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeVoucherModal}>Cancel</button>
              <button className="btn btn-primary" onClick={createVoucher}>
                {editVoucherId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}