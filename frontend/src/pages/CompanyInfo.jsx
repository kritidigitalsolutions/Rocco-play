import { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Building2,
  MapPin,
  Globe,
  Save,
  Compass,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Info,
  Smartphone,
  EyeOff,
  LayoutTemplate
} from "lucide-react";
import "./Dashboard.css";
import "./CompanyInfo.css";

export default function CompanyInfo() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    appName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    googleMapUrl: "",
    status: "draft"
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/companyInfo");
      if (res.data && res.data.data) {
        const info = res.data.data;
        setForm({
          companyName: info.companyName || "",
          appName: info.appName || "",
          addressLine1: info.addressLine1 || "",
          addressLine2: info.addressLine2 || "",
          city: info.city || "",
          state: info.state || "",
          country: info.country || "",
          postalCode: info.postalCode || "",
          googleMapUrl: info.googleMapUrl || "",
          status: info.status || "draft"
        });
      }
    } catch (err) {
      console.error("Failed to load company info", err);
      setError("Failed to fetch company information.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = (e) => {
    const isChecked = e.target.checked;
    setForm((prev) => ({
      ...prev,
      status: isChecked ? "published" : "draft"
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const res = await API.patch("/admin/companyInfo", form);
      if (res.data && res.data.success) {
        showToast("Company information updated successfully! 🎉", "success");
        setMessage("Changes saved successfully.");
        // Refresh local state with server response if needed
        if (res.data.data) {
          const info = res.data.data;
          setForm({
            companyName: info.companyName || "",
            appName: info.appName || "",
            addressLine1: info.addressLine1 || "",
            addressLine2: info.addressLine2 || "",
            city: info.city || "",
            state: info.state || "",
            country: info.country || "",
            postalCode: info.postalCode || "",
            googleMapUrl: info.googleMapUrl || "",
            status: info.status || "draft"
          });
        }
      }
    } catch (err) {
      console.error("Failed to save company info", err);
      const errMsg = err.response?.data?.message || "Failed to update company information.";
      showToast(errMsg, "error");
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Helper to check if preview has any details filled
  const hasDetails =
    form.addressLine1 ||
    form.addressLine2 ||
    form.city ||
    form.state ||
    form.country ||
    form.postalCode ||
    form.googleMapUrl;

  if (loading) {
    return (
      <div className="page-section">
        <div className="pg-header">
          <div>
            <h1 className="pg-title">
              <Building2 size={28} /> Company Profile
            </h1>
            <p className="pg-sub">Manage company contact and address details displayed to users</p>
          </div>
        </div>
        <div className="page-loader">
          <div className="page-loader-spinner" />
          <p style={{ color: "var(--text-soft)" }}>Loading company profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-section company-info-page">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Building2 size={28} /> Company Profile
          </h1>
          <p className="pg-sub">Manage company contact and address details displayed to users</p>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert alert-success">
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Two Column Grid */}
      <div className="company-grid">
        {/* Left Side: Form Panel */}
        <div className="company-card">
          <div>
            <h3>
              <Building2 size={20} style={{ color: "var(--primary)" }} /> Company & App Information
            </h3>
            <p className="company-card-subtitle">
              Manage your company and application details. Company & App names will be displayed in the user app footer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="company-form">
            {/* Company Name & App Name Row */}
            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">
                  <Building2 size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  placeholder="e.g. Rocco Play Media Pvt. Ltd."
                  value={form.companyName}
                  onChange={handleChange}
                  className="form-input-styled"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Smartphone size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  App Name
                </label>
                <input
                  type="text"
                  name="appName"
                  placeholder="e.g. Rocco Play"
                  value={form.appName}
                  onChange={handleChange}
                  className="form-input-styled"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-divider-label">
              <span>Office Address Details</span>
            </div>

            <div className="form-group">
              <label className="form-label">Address Line 1</label>
              <input
                type="text"
                name="addressLine1"
                placeholder="Street address, P.O. box, building name"
                value={form.addressLine1}
                onChange={handleChange}
                className="form-input-styled"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address Line 2</label>
              <input
                type="text"
                name="addressLine2"
                placeholder="Apartment, suite, unit, building, floor, etc."
                value={form.addressLine2}
                onChange={handleChange}
                className="form-input-styled"
                disabled={saving}
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleChange}
                  className="form-input-styled"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State / Province / Region</label>
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={form.state}
                  onChange={handleChange}
                  className="form-input-styled"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">Postal Code / ZIP</label>
                <input
                  type="text"
                  name="postalCode"
                  placeholder="Postal Code"
                  value={form.postalCode}
                  onChange={handleChange}
                  className="form-input-styled"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  type="text"
                  name="country"
                  placeholder="Country"
                  value={form.country}
                  onChange={handleChange}
                  className="form-input-styled"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Google Maps URL</label>
              <input
                type="url"
                name="googleMapUrl"
                placeholder="https://maps.google.com/..."
                value={form.googleMapUrl}
                onChange={handleChange}
                className="form-input-styled"
                disabled={saving}
              />
            </div>

            {/* Status Toggle Switch */}
            <div className="status-switch-container">
              <div className="status-info">
                <span className="status-title">Publish Information</span>
                <span className="status-desc">
                  When turned OFF, only address details are hidden. Company & App names remain visible in the app footer.
                </span>
              </div>
              <label className="switch-control">
                <input
                  type="checkbox"
                  checked={form.status === "published"}
                  onChange={handleStatusChange}
                  disabled={saving}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <button type="submit" className="btn-save-company" disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner" /> Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Live Preview Panel */}
        <div className="company-preview-card">
          <div className="preview-badge-row">
            <span className="preview-label">Live App Preview</span>
            {form.status === "published" ? (
              <span className="badge-published">
                <span className="pulse-dot" /> Published
              </span>
            ) : (
              <span className="badge-draft">
                <EyeOff size={13} /> Address Hidden (Draft)
              </span>
            )}
          </div>

          <div className="preview-content">
            <div>
              <h2 className="preview-title">{form.appName || "Rocco Play"}</h2>
              {form.companyName && (
                <div className="preview-company-subtitle">
                  {form.companyName}
                </div>
              )}
            </div>

            {/* Address Details Section */}
            {form.status === "published" ? (
              hasDetails ? (
                <>
                  {(form.addressLine1 || form.addressLine2) && (
                    <div className="preview-item">
                      <MapPin className="preview-item-icon" size={18} />
                      <div>
                        {form.addressLine1 && <div className="preview-item-text">{form.addressLine1}</div>}
                        {form.addressLine2 && <div className="preview-item-text">{form.addressLine2}</div>}
                        {(form.city || form.state || form.postalCode) && (
                          <div className="preview-item-sub">
                            {[form.city, form.state, form.postalCode].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {form.country && <div className="preview-item-sub">{form.country}</div>}
                      </div>
                    </div>
                  )}

                  {form.googleMapUrl && (
                    <div className="preview-item">
                      <Globe className="preview-item-icon" size={18} />
                      <div>
                        <div className="preview-item-text">Location Coordinates</div>
                        <a
                          href={form.googleMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="preview-map-link"
                        >
                          Open in Google Maps <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.88rem", textAlign: "center", padding: "12px 0" }}>
                  Enter company address on the left to see full preview.
                </div>
              )
            ) : (
              <div className="preview-address-hidden-notice">
                <EyeOff size={16} />
                <div>
                  <strong>Address is hidden from users</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: "2px" }}>
                    Enable &quot;Publish Information&quot; to display address and map link on user app.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Map Visual */}
          {form.status === "published" && form.googleMapUrl ? (
            <a
              href={form.googleMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="preview-map-box has-url"
              style={{ textDecoration: "none" }}
            >
              <Compass className="preview-map-icon" size={32} />
              <div>
                <div className="preview-map-label" style={{ color: "var(--blue)" }}>
                  Navigate with GPS
                </div>
                <div className="preview-map-sub">Click to load directions on external map</div>
              </div>
            </a>
          ) : form.status === "published" ? (
            <div className="preview-map-box">
              <Compass className="preview-map-icon" size={32} />
              <div>
                <div className="preview-map-label">No Map Link Added</div>
                <div className="preview-map-sub">Provide a Google Maps URL to enable GPS navigation</div>
              </div>
            </div>
          ) : null}

          {/* User App Footer Preview Card */}
          <div className="preview-footer-mockup">
            <div className="preview-footer-header">
              <LayoutTemplate size={14} />
              <span>User App Footer Output</span>
            </div>
            <div className="preview-footer-body">
              <div className="preview-footer-app-name">
                {form.appName || "Rocco Play"}
              </div>
              <div className="preview-footer-copyright">
                © {new Date().getFullYear()} {form.companyName || form.appName || "Rocco Play Media"}. All rights reserved.
              </div>
              {form.status === "published" && (form.city || form.country) && (
                <div className="preview-footer-location">
                  <MapPin size={11} /> {[form.city, form.country].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
