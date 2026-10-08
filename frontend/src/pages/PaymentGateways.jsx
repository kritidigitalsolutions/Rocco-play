import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Zap,
  Globe,
  Settings2,
  RefreshCw,
  Key,
  Server,
  Save,
  Check,
  XCircle,
  Building2,
  QrCode,
  Layers,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Smartphone,
  Eye,
  EyeOff,
  Monitor
} from "lucide-react";
import "./PaymentGateways.css";

const GATEWAY_META = {
  razorpay: {
    name: "Razorpay",
    color: "#3b82f6",
    icon: CreditCard,
  },
  zaakpay: {
    name: "Zaakpay",
    color: "#a855f7",
    icon: Zap,
  },
  hdfc: {
    name: "HDFC Bank (SmartGateway)",
    color: "#ef4444",
    icon: Building2,
  },
  sabpaisa: {
    name: "SabPaisa PG 3.0",
    color: "#f59e0b",
    icon: Layers,
  },
};

const DEFAULT_VISIBILITY = {
  razorpay: { app: true, web: true },
  zaakpay: { app: true, web: true },
  hdfc: { app: true, web: true },
  sabpaisa: { app: true, web: true },
};

// Reusable Platform Visibility Controller component
const GatewayVisibilityControl = ({ gwKey, gatewayName, visibility, onToggle }) => {
  const isApp = Boolean(visibility?.[gwKey]?.app ?? true);
  const isWeb = Boolean(visibility?.[gwKey]?.web ?? true);

  return (
    <div className="pg-platform-vis-box">
      <div className="pg-vis-header">
        <span className="pg-vis-title">
          <Monitor size={15} style={{ color: "#38bdf8" }} /> Platform Visibility Control
        </span>
        <span className="pg-vis-hint">Select where {gatewayName} appears</span>
      </div>
      <div className="pg-vis-grid">
        {/* Mobile App Toggle */}
        <div className={`pg-vis-item ${isApp ? "is-vis" : "is-hidden"}`}>
          <div className="pg-vis-info">
            <Smartphone size={16} className="pg-vis-ico" />
            <div>
              <div className="pg-vis-name">Mobile App (Flutter)</div>
              <div className="pg-vis-sub">
                {isApp ? "● Visible in App" : "○ Hidden in App"}
              </div>
            </div>
          </div>
          <label className="pg-switch-toggle pg-switch-mini" title={`Toggle Mobile App visibility for ${gatewayName}`}>
            <input
              type="checkbox"
              checked={isApp}
              onChange={(e) => onToggle(gwKey, "app", e.target.checked)}
            />
            <span className="pg-slider"></span>
          </label>
        </div>

        {/* Website Toggle */}
        <div className={`pg-vis-item ${isWeb ? "is-vis" : "is-hidden"}`}>
          <div className="pg-vis-info">
            <Globe size={16} className="pg-vis-ico" />
            <div>
              <div className="pg-vis-name">Website Checkout</div>
              <div className="pg-vis-sub">
                {isWeb ? "● Visible on Web" : "○ Hidden on Web"}
              </div>
            </div>
          </div>
          <label className="pg-switch-toggle pg-switch-mini" title={`Toggle Website visibility for ${gatewayName}`}>
            <input
              type="checkbox"
              checked={isWeb}
              onChange={(e) => onToggle(gwKey, "web", e.target.checked)}
            />
            <span className="pg-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

const PaymentGateways = () => {
  // Current working state in UI
  const [pgConfig, setPgConfig] = useState({
    razorpayEnabled: true,
    zaakpayEnabled: false,
    hdfcEnabled: false,
    sabpaisaEnabled: false,
    visibility: DEFAULT_VISIBILITY,
    defaultGateway: "razorpay",
    gatewayOrder: ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
    zaakpayMode: "test",
    hdfcMode: "test",
    razorpayKeyConfigured: false,
    zaakpayKeyConfigured: false,
    hdfcKeyConfigured: false,
    sabpaisaKeyConfigured: false,
    sabpaisaMode: "test",
    hdfcVpa: "roccoplaywork@hdfcbank",
    hdfcStoreName: "ROCCOPLAY MEDIA",
  });

  // Last saved state from database
  const [savedConfig, setSavedConfig] = useState({
    razorpayEnabled: true,
    zaakpayEnabled: false,
    hdfcEnabled: false,
    sabpaisaEnabled: false,
    visibility: DEFAULT_VISIBILITY,
    defaultGateway: "razorpay",
    gatewayOrder: ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
    zaakpayMode: "test",
    hdfcMode: "test",
    razorpayKeyConfigured: false,
    zaakpayKeyConfigured: false,
    hdfcKeyConfigured: false,
    sabpaisaKeyConfigured: false,
    sabpaisaMode: "test",
    hdfcVpa: "roccoplaywork@hdfcbank",
    hdfcStoreName: "ROCCOPLAY MEDIA",
  });

  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingRzp, setSavingRzp] = useState(false);
  const [savingZaak, setSavingZaak] = useState(false);
  const [savingHdfc, setSavingHdfc] = useState(false);
  const [savingSabpaisa, setSavingSabpaisa] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [apiStatus, setApiStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [activeTestEndpoint, setActiveTestEndpoint] = useState("/payment/gateways");

  // Fetch PG settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/payment-settings");
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        const mergedVis = {
          ...DEFAULT_VISIBILITY,
          ...(data.visibility || {}),
        };
        const configWithVis = {
          ...data,
          visibility: mergedVis,
        };
        setPgConfig(configWithVis);
        setSavedConfig(configWithVis);
      }
    } catch (err) {
      console.error("Fetch PG Settings error:", err);
      setError(err.response?.data?.message || "Failed to load payment gateway configuration");
    } finally {
      setLoading(false);
    }
  };

  // Test Public Gateway API
  const testPublicGatewayApi = async (query = "") => {
    try {
      setTestingApi(true);
      const ep = query ? `/payment/gateways?${query}` : "/payment/gateways";
      setActiveTestEndpoint(ep);
      const res = await API.get(ep);
      setApiStatus(res.data);
    } catch (err) {
      console.error("Test API error:", err);
      setApiStatus({ error: "Failed to connect to gateway endpoint", details: err.message });
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Independent Toggle Handlers (Master Enable/Disable)
  const handleToggleRazorpay = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      razorpayEnabled: checked,
    }));
  };

  const handleToggleZaakpay = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      zaakpayEnabled: checked,
    }));
  };

  const handleToggleHdfc = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      hdfcEnabled: checked,
    }));
  };

  const handleToggleSabpaisa = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      sabpaisaEnabled: checked,
    }));
  };

  // Platform Visibility Toggle Handler
  const handleToggleVisibility = (gatewayId, platform, checked) => {
    setPgConfig((prev) => {
      const curVis = prev.visibility || DEFAULT_VISIBILITY;
      return {
        ...prev,
        visibility: {
          ...curVis,
          [gatewayId]: {
            ...(curVis[gatewayId] || { app: true, web: true }),
            [platform]: checked,
          },
        },
      };
    });
  };

  // Save All Settings in One Click
  const handleSaveAll = async () => {
    setMessage("");
    setError("");
    try {
      setSavingAll(true);
      const res = await API.put("/admin/payment-settings", {
        razorpayEnabled: pgConfig.razorpayEnabled,
        zaakpayEnabled: pgConfig.zaakpayEnabled,
        hdfcEnabled: pgConfig.hdfcEnabled,
        sabpaisaEnabled: pgConfig.sabpaisaEnabled,
        visibility: pgConfig.visibility,
        defaultGateway: pgConfig.defaultGateway,
        gatewayOrder: pgConfig.gatewayOrder,
        zaakpayMode: pgConfig.zaakpayMode,
        hdfcMode: pgConfig.hdfcMode,
        sabpaisaMode: pgConfig.sabpaisaMode,
      });
      if (res.data?.success) {
        setMessage("All payment gateway settings, visibility controls, and priority order saved successfully! ✅");
        const updated = {
          ...pgConfig,
          ...res.data.data,
          visibility: res.data.data.visibility || pgConfig.visibility,
        };
        setPgConfig(updated);
        setSavedConfig(updated);
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save All error:", err);
      setError(err.response?.data?.message || "Failed to save configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingAll(false);
    }
  };

  // Reordering handlers for Gateway Priority
  const handleMoveGateway = (index, direction) => {
    const currentOrder = [...(pgConfig.gatewayOrder || ["razorpay", "zaakpay", "hdfc", "sabpaisa"])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;
    setPgConfig((prev) => ({
      ...prev,
      gatewayOrder: currentOrder,
    }));
  };

  const handleSetGatewayPosition = (gatewayId, newPosition1Based) => {
    const currentOrder = [...(pgConfig.gatewayOrder || ["razorpay", "zaakpay", "hdfc", "sabpaisa"])];
    const oldIndex = currentOrder.indexOf(gatewayId);
    if (oldIndex === -1) return;
    const newIndex = parseInt(newPosition1Based, 10) - 1;
    if (newIndex < 0 || newIndex >= currentOrder.length || newIndex === oldIndex) return;

    currentOrder.splice(oldIndex, 1);
    currentOrder.splice(newIndex, 0, gatewayId);
    setPgConfig((prev) => ({
      ...prev,
      gatewayOrder: currentOrder,
    }));
  };

  // Save Priority Order Specifically
  const handleSaveOrder = async () => {
    setMessage("");
    setError("");
    try {
      setSavingOrder(true);
      const res = await API.put("/admin/payment-settings", {
        gatewayOrder: pgConfig.gatewayOrder,
      });
      if (res.data?.success) {
        setMessage("Payment gateways display priority order saved successfully! ✅");
        setSavedConfig((prev) => ({
          ...prev,
          gatewayOrder: pgConfig.gatewayOrder,
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save order error:", err);
      setError(err.response?.data?.message || "Failed to save gateway priority order");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingOrder(false);
    }
  };

  // Save Razorpay Gateway specifically
  const handleSaveRazorpay = async () => {
    setMessage("");
    setError("");
    try {
      setSavingRzp(true);
      const res = await API.put("/admin/payment-settings", {
        razorpayEnabled: pgConfig.razorpayEnabled,
        razorpayVisibility: pgConfig.visibility?.razorpay,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.razorpayEnabled ? "Enabled" : "Disabled";
        setMessage(`Razorpay saved as ${stateLabel} with updated visibility settings! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          razorpayEnabled: pgConfig.razorpayEnabled,
          visibility: {
            ...prev.visibility,
            razorpay: pgConfig.visibility?.razorpay,
          },
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save Razorpay error:", err);
      setError(err.response?.data?.message || "Failed to save Razorpay configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingRzp(false);
    }
  };

  // Save Zaakpay Gateway specifically
  const handleSaveZaakpay = async () => {
    setMessage("");
    setError("");
    try {
      setSavingZaak(true);
      const res = await API.put("/admin/payment-settings", {
        zaakpayEnabled: pgConfig.zaakpayEnabled,
        zaakpayMode: pgConfig.zaakpayMode,
        zaakpayVisibility: pgConfig.visibility?.zaakpay,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.zaakpayEnabled ? "Enabled" : "Disabled";
        setMessage(`Zaakpay saved as ${stateLabel} (Mode: ${pgConfig.zaakpayMode.toUpperCase()}) with visibility settings! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          zaakpayEnabled: pgConfig.zaakpayEnabled,
          zaakpayMode: pgConfig.zaakpayMode,
          visibility: {
            ...prev.visibility,
            zaakpay: pgConfig.visibility?.zaakpay,
          },
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save Zaakpay error:", err);
      setError(err.response?.data?.message || "Failed to save Zaakpay configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingZaak(false);
    }
  };

  // Save HDFC Gateway specifically
  const handleSaveHdfc = async () => {
    setMessage("");
    setError("");
    try {
      setSavingHdfc(true);
      const res = await API.put("/admin/payment-settings", {
        hdfcEnabled: pgConfig.hdfcEnabled,
        hdfcMode: pgConfig.hdfcMode,
        hdfcVisibility: pgConfig.visibility?.hdfc,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.hdfcEnabled ? "Enabled" : "Disabled";
        setMessage(`HDFC Bank saved as ${stateLabel} (Mode: ${pgConfig.hdfcMode.toUpperCase()}) with visibility settings! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          hdfcEnabled: pgConfig.hdfcEnabled,
          hdfcMode: pgConfig.hdfcMode,
          visibility: {
            ...prev.visibility,
            hdfc: pgConfig.visibility?.hdfc,
          },
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save HDFC error:", err);
      setError(err.response?.data?.message || "Failed to save HDFC configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingHdfc(false);
    }
  };

  // Save SabPaisa Gateway specifically
  const handleSaveSabpaisa = async () => {
    setMessage("");
    setError("");
    try {
      setSavingSabpaisa(true);
      const res = await API.put("/admin/payment-settings", {
        sabpaisaEnabled: pgConfig.sabpaisaEnabled,
        sabpaisaMode: pgConfig.sabpaisaMode,
        sabpaisaVisibility: pgConfig.visibility?.sabpaisa,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.sabpaisaEnabled ? "Enabled" : "Disabled";
        const modeLabel = (pgConfig.sabpaisaMode || "test").toUpperCase();
        setMessage(`SabPaisa saved as ${stateLabel} (Mode: ${modeLabel}) with visibility settings! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          sabpaisaEnabled: pgConfig.sabpaisaEnabled,
          sabpaisaMode: pgConfig.sabpaisaMode,
          visibility: {
            ...prev.visibility,
            sabpaisa: pgConfig.visibility?.sabpaisa,
          },
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save SabPaisa configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingSabpaisa(false);
    }
  };

  // Determine if individual cards or global config differ from database saved state
  const isVisChanged = (gwKey) => {
    const current = pgConfig.visibility?.[gwKey] || { app: true, web: true };
    const saved = savedConfig.visibility?.[gwKey] || { app: true, web: true };
    return current.app !== saved.app || current.web !== saved.web;
  };

  const isRzpChanged =
    pgConfig.razorpayEnabled !== savedConfig.razorpayEnabled ||
    isVisChanged("razorpay");

  const isZaakChanged =
    pgConfig.zaakpayEnabled !== savedConfig.zaakpayEnabled ||
    pgConfig.zaakpayMode !== savedConfig.zaakpayMode ||
    isVisChanged("zaakpay");

  const isHdfcChanged =
    pgConfig.hdfcEnabled !== savedConfig.hdfcEnabled ||
    pgConfig.hdfcMode !== savedConfig.hdfcMode ||
    isVisChanged("hdfc");

  const isSabpaisaChanged =
    pgConfig.sabpaisaEnabled !== savedConfig.sabpaisaEnabled ||
    pgConfig.sabpaisaMode !== savedConfig.sabpaisaMode ||
    isVisChanged("sabpaisa");

  const isDefaultGatewayChanged = pgConfig.defaultGateway !== savedConfig.defaultGateway;
  const isGatewayOrderChanged =
    JSON.stringify(pgConfig.gatewayOrder || ["razorpay", "zaakpay", "hdfc", "sabpaisa"]) !==
    JSON.stringify(savedConfig.gatewayOrder || ["razorpay", "zaakpay", "hdfc", "sabpaisa"]);

  const isAnyVisChanged =
    isVisChanged("razorpay") ||
    isVisChanged("zaakpay") ||
    isVisChanged("hdfc") ||
    isVisChanged("sabpaisa");

  const isAnyChanged =
    isRzpChanged ||
    isZaakChanged ||
    isHdfcChanged ||
    isSabpaisaChanged ||
    isDefaultGatewayChanged ||
    isGatewayOrderChanged ||
    isAnyVisChanged;

  // Active gateways list calculation
  const activeGatewaysList = [];
  if (pgConfig.razorpayEnabled) activeGatewaysList.push("Razorpay");
  if (pgConfig.zaakpayEnabled) activeGatewaysList.push("Zaakpay");
  if (pgConfig.hdfcEnabled) activeGatewaysList.push("HDFC Bank");
  if (pgConfig.sabpaisaEnabled) activeGatewaysList.push("SabPaisa");

  // App-visible gateways (both master enabled and app visible)
  const appVisibleList = [];
  if (pgConfig.razorpayEnabled && (pgConfig.visibility?.razorpay?.app ?? true)) appVisibleList.push("Razorpay");
  if (pgConfig.zaakpayEnabled && (pgConfig.visibility?.zaakpay?.app ?? true)) appVisibleList.push("Zaakpay");
  if (pgConfig.hdfcEnabled && (pgConfig.visibility?.hdfc?.app ?? true)) appVisibleList.push("HDFC Bank");
  if (pgConfig.sabpaisaEnabled && (pgConfig.visibility?.sabpaisa?.app ?? true)) appVisibleList.push("SabPaisa");

  // Web-visible gateways (both master enabled and web visible)
  const webVisibleList = [];
  if (pgConfig.razorpayEnabled && (pgConfig.visibility?.razorpay?.web ?? true)) webVisibleList.push("Razorpay");
  if (pgConfig.zaakpayEnabled && (pgConfig.visibility?.zaakpay?.web ?? true)) webVisibleList.push("Zaakpay");
  if (pgConfig.hdfcEnabled && (pgConfig.visibility?.hdfc?.web ?? true)) webVisibleList.push("HDFC Bank");
  if (pgConfig.sabpaisaEnabled && (pgConfig.visibility?.sabpaisa?.web ?? true)) webVisibleList.push("SabPaisa");

  return (
    <div className="page-section payment-gateways-page">
      {/* Header */}
      <div className="pg-header-wrap">
        <div>
          <h1 className="pg-title">
            <CreditCard size={28} /> Payment Gateways & Visibility
          </h1>
          <p className="pg-subtitle">
            Configure gateway activation, display priority, and control exact visibility for Flutter Mobile App vs Website checkout.
          </p>
        </div>

        <div className="pg-header-actions">
          <button
            type="button"
            className="pg-secondary-btn"
            onClick={fetchSettings}
            disabled={loading}
            title="Refresh Settings"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            className={`pg-primary-btn ${!isAnyChanged ? "is-saved" : ""}`}
            onClick={handleSaveAll}
            disabled={savingAll || !isAnyChanged}
            title="Save all changes at once"
          >
            {savingAll ? (
              <>
                <RefreshCw size={16} className="spin" /> Saving All...
              </>
            ) : !isAnyChanged ? (
              <>
                <Check size={16} /> All Saved!
              </>
            ) : (
              <>
                <Save size={16} /> Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="pg-alert pg-alert-success">
          <CheckCircle size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="pg-alert pg-alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="pg-overview-grid">
        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="pg-stat-val">
              {activeGatewaysList.length > 0 ? `${activeGatewaysList.length} Active` : "None"}
            </div>
            <div className="pg-stat-lbl">Master Active Gateways</div>
          </div>
        </div>

        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div className="pg-stat-val">
              {appVisibleList.length > 0 ? `${appVisibleList.length} in App` : "0 in App"}
            </div>
            <div className="pg-stat-lbl">
              {appVisibleList.length > 0 ? `App: ${appVisibleList.join(", ")}` : "No gateway visible in App"}
            </div>
          </div>
        </div>

        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
            <Globe size={22} />
          </div>
          <div>
            <div className="pg-stat-val">
              {webVisibleList.length > 0 ? `${webVisibleList.length} on Web` : "0 on Web"}
            </div>
            <div className="pg-stat-lbl">
              {webVisibleList.length > 0 ? `Web: ${webVisibleList.join(", ")}` : "No gateway visible on Web"}
            </div>
          </div>
        </div>

        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="pg-stat-val" style={{ textTransform: "capitalize" }}>
              {pgConfig.defaultGateway || "Razorpay"}
            </div>
            <div className="pg-stat-lbl">Default Preferred Gateway</div>
          </div>
        </div>
      </div>

      {/* Gateways Grid */}
      <div className="pg-cards-grid">
        {/* ── RAZORPAY CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.razorpayEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon rzp-icon">₹</div>
              <div>
                <h3 className="pg-brand-name">Razorpay</h3>
                <span className="pg-brand-type">Standard Modal & UPI Checkout</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle Razorpay Master Status">
              <input
                type="checkbox"
                checked={pgConfig.razorpayEnabled}
                onChange={(e) => handleToggleRazorpay(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.razorpayEnabled ? "active" : "disabled"}`}>
              {pgConfig.razorpayEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className="pg-env-pill rzp">Live Mode</span>
          </div>

          <p className="pg-card-text">
            Standard Razorpay JavaScript & mobile checkout supporting UPI, Credit & Debit Cards, Net Banking, and digital wallets.
          </p>

          <div className="pg-features-list">
            <div className="pg-feature-item">✓ Seamless Pop-up / Overlay checkout</div>
            <div className="pg-feature-item">✓ Instant webhook & signature verification</div>
            <div className="pg-feature-item">✓ Auto-activation of Subscription upon success</div>
          </div>

          {/* Platform Visibility Controller */}
          <GatewayVisibilityControl
            gwKey="razorpay"
            gatewayName="Razorpay"
            visibility={pgConfig.visibility}
            onToggle={handleToggleVisibility}
          />

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <Key size={14} /> Key ID: Configured in Server (.env)
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isRzpChanged ? "is-saved" : pgConfig.razorpayEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveRazorpay}
              disabled={savingRzp || !isRzpChanged}
            >
              {savingRzp ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isRzpChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.razorpayEnabled ? (
                <>
                  <Check size={16} /> Save as Enabled
                </>
              ) : (
                <>
                  <XCircle size={16} /> Save as Disabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── ZAAKPAY CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.zaakpayEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon zaak-icon">Z</div>
              <div>
                <h3 className="pg-brand-name">Zaakpay</h3>
                <span className="pg-brand-type">Hosted Payment Page (Redirect Flow V13)</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle Zaakpay Master Status">
              <input
                type="checkbox"
                checked={pgConfig.zaakpayEnabled}
                onChange={(e) => handleToggleZaakpay(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.zaakpayEnabled ? "active" : "disabled"}`}>
              {pgConfig.zaakpayEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className={`pg-env-pill ${pgConfig.zaakpayMode === "live" ? "live" : "test"}`}>
              {pgConfig.zaakpayMode === "live" ? "Live Gateway" : "UAT / Staging"}
            </span>
          </div>

          <p className="pg-card-text">
            Zaakpay Hosted redirect payment gateway with HMAC-SHA256 checksum verification and card/UPI handling.
          </p>

          <div className="pg-setting-field">
            <label className="pg-field-label">Environment Mode</label>
            <select
              value={pgConfig.zaakpayMode || "test"}
              onChange={(e) => {
                setPgConfig({ ...pgConfig, zaakpayMode: e.target.value });
              }}
              className="pg-select-input"
            >
              <option value="test">🧪 Test / Staging (UAT Sandbox)</option>
              <option value="live">🚀 Live / Production Gateway</option>
            </select>
          </div>

          <div className="pg-uat-box">
            <div className="pg-uat-title">UAT Test Card Credentials:</div>
            <div className="pg-uat-grid">
              <div><strong>Card:</strong> 4111 1111 1111 1111</div>
              <div><strong>CVV:</strong> 123</div>
              <div><strong>Expiry:</strong> 07/29</div>
              <div><strong>OTP:</strong> 1234</div>
            </div>
          </div>

          {/* Platform Visibility Controller */}
          <GatewayVisibilityControl
            gwKey="zaakpay"
            gatewayName="Zaakpay"
            visibility={pgConfig.visibility}
            onToggle={handleToggleVisibility}
          />

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <Key size={14} /> Merchant ID: Configured in Server (.env)
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isZaakChanged ? "is-saved" : pgConfig.zaakpayEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveZaakpay}
              disabled={savingZaak || !isZaakChanged}
            >
              {savingZaak ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isZaakChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.zaakpayEnabled ? (
                <>
                  <Check size={16} /> Save as Enabled
                </>
              ) : (
                <>
                  <XCircle size={16} /> Save as Disabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── HDFC BANK CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.hdfcEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon hdfc-icon">H</div>
              <div>
                <h3 className="pg-brand-name">HDFC Bank</h3>
                <span className="pg-brand-type">SmartGateway / SmartHub (Cards, NetBanking & UPI)</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle HDFC Bank Master Status">
              <input
                type="checkbox"
                checked={pgConfig.hdfcEnabled}
                onChange={(e) => handleToggleHdfc(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.hdfcEnabled ? "active" : "disabled"}`}>
              {pgConfig.hdfcEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className={`pg-env-pill ${pgConfig.hdfcMode === "live" ? "live" : "test"}`}>
              {pgConfig.hdfcMode === "live" ? "Live Gateway" : "UAT / Staging"}
            </span>
          </div>

          <p className="pg-card-text">
            HDFC SmartGateway enterprise payment processing with Cards, NetBanking, and Direct UPI Collect/Intent.
          </p>

          <div className="pg-setting-field">
            <label className="pg-field-label">Environment Mode</label>
            <select
              value={pgConfig.hdfcMode || "test"}
              onChange={(e) => {
                setPgConfig({ ...pgConfig, hdfcMode: e.target.value });
              }}
              className="pg-select-input"
            >
              <option value="test">🧪 Test / Staging (UAT Sandbox)</option>
              <option value="live">🚀 Live / Production Gateway</option>
            </select>
          </div>

          <div className="pg-uat-box" style={{ background: "rgba(30, 58, 138, 0.18)", borderColor: "rgba(59, 130, 246, 0.35)" }}>
            <div className="pg-uat-title" style={{ color: "#93c5fd" }}>HDFC Merchant Configuration:</div>
            <div className="pg-uat-grid">
              <div><strong>Store:</strong> ROCCOPLAY MEDIA</div>
              <div><strong>VPA:</strong> roccoplaywork@hdfcbank</div>
              <div><strong>MID:</strong> HDFC000136707309</div>
              <div><strong>Key ID:</strong> 8352000</div>
            </div>
          </div>

          {/* Platform Visibility Controller */}
          <GatewayVisibilityControl
            gwKey="hdfc"
            gatewayName="HDFC Bank"
            visibility={pgConfig.visibility}
            onToggle={handleToggleVisibility}
          />

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <QrCode size={14} /> VPA: roccoplaywork@hdfcbank
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isHdfcChanged ? "is-saved" : pgConfig.hdfcEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveHdfc}
              disabled={savingHdfc || !isHdfcChanged}
            >
              {savingHdfc ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isHdfcChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.hdfcEnabled ? (
                <>
                  <Check size={16} /> Save as Enabled
                </>
              ) : (
                <>
                  <XCircle size={16} /> Save as Disabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── SABPAISA CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.sabpaisaEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon sabpaisa-icon">S</div>
              <div>
                <h3 className="pg-brand-name">SabPaisa</h3>
                <span className="pg-brand-type">PG 3.0 Hosted Checkout (Cards, UPI & NetBanking)</span>
              </div>
            </div>
            <label className="pg-switch-toggle" title="Toggle SabPaisa Master Status">
              <input type="checkbox" checked={pgConfig.sabpaisaEnabled} onChange={(e) => handleToggleSabpaisa(e.target.checked)} />
              <span className="pg-slider"></span>
            </label>
          </div>
          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.sabpaisaEnabled ? "active" : "disabled"}`}>
              {pgConfig.sabpaisaEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className={`pg-env-pill ${pgConfig.sabpaisaMode === "live" ? "live" : "test"}`}>
              {pgConfig.sabpaisaMode === "live" ? "Live Gateway" : "UAT / Staging"}
            </span>
          </div>
          <p className="pg-card-text">
            Backend-created SabPaisa checkout sessions. Subscriptions activate only after signed return and server-side enquiry verification.
          </p>

          <div className="pg-setting-field">
            <label className="pg-field-label">Environment Mode</label>
            <select
              value={pgConfig.sabpaisaMode || "test"}
              onChange={(e) => {
                setPgConfig({ ...pgConfig, sabpaisaMode: e.target.value });
              }}
              className="pg-select-input"
            >
              <option value="test">🧪 Test / Staging (UAT Sandbox)</option>
              <option value="live">🚀 Live / Production Gateway</option>
            </select>
          </div>

          {pgConfig.sabpaisaMode === "live" ? (
            <div className="pg-uat-box" style={{ background: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.3)" }}>
              <div className="pg-uat-title" style={{ color: "#d8b4fe" }}>Production Live Environment:</div>
              <div className="pg-uat-grid">
                <div><strong>Client Code:</strong> {pgConfig.sabpaisaMerchantId || "XOZO1"}</div>
                <div><strong>Base URL:</strong> merchant-api.sabpaisa.in</div>
                <div><strong>Credentials:</strong> {pgConfig.sabpaisaKeyConfigured ? "Configured in .env" : "Missing in .env"}</div>
                <div><strong>Transactions:</strong> Real Money</div>
              </div>
            </div>
          ) : (
            <div className="pg-uat-box" style={{ background: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
              <div className="pg-uat-title" style={{ color: "#fcd34d" }}>Sandbox Test Credentials (Moves No Real Money):</div>
              <div className="pg-uat-grid">
                <div><strong>Client Code:</strong> SQUA102</div>
                <div><strong>API Key:</strong> sp_itOrld7Rm...</div>
                <div><strong>Secret Key:</strong> sec_lLao-1-y...</div>
                <div><strong>Base URL:</strong> staging-sb-merchant-api.sabpaisa.in</div>
              </div>
            </div>
          )}

          {/* Platform Visibility Controller */}
          <GatewayVisibilityControl
            gwKey="sabpaisa"
            gatewayName="SabPaisa"
            visibility={pgConfig.visibility}
            onToggle={handleToggleVisibility}
          />

          <div className="pg-card-footer">
            <span className="pg-key-tag"><Key size={14} /> Keys stay in backend .env</span>
            <button
              type="button"
              className={`pg-card-save-btn ${!isSabpaisaChanged ? "is-saved" : pgConfig.sabpaisaEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveSabpaisa}
              disabled={savingSabpaisa || !isSabpaisaChanged}
            >
              {savingSabpaisa ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isSabpaisaChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.sabpaisaEnabled ? (
                <>
                  <Check size={16} /> Save as Enabled
                </>
              ) : (
                <>
                  <XCircle size={16} /> Save as Disabled
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── GATEWAY DISPLAY PRIORITY & PLATFORM VISIBILITY ── */}
      <div className="pg-settings-card pg-priority-section" style={{ marginBottom: "24px" }}>
        <div className="pg-settings-card-head">
          <ListOrdered size={24} className="pg-accent-icon" style={{ color: "#38bdf8" }} />
          <div>
            <h3>Payment Gateway Priority & Platform Visibility</h3>
            <p>
              Set which payment gateway appears at 1st, 2nd, 3rd, and 4th position, and view/toggle App and Web status for each.
            </p>
          </div>
        </div>

        <div className="pg-priority-content">
          <div className="pg-priority-intro">
            <span>
              💡 <strong>API Indexing & Visibility Rule:</strong> The order below is returned in <code>orderedGateways</code>. Mobile apps only show gateways enabled with <code>showInApp: true</code> (also returned pre-filtered in <code>appGateways</code>). Websites show gateways with <code>showInWeb: true</code> (pre-filtered in <code>webGateways</code>).
            </span>

            {/* Quick 1-Click Priority Presets */}
            <div className="pg-priority-presets">
              <span className="pg-preset-label">Quick 1-Click Top Priority:</span>
              <button
                type="button"
                className="pg-preset-btn"
                onClick={() => handleSetGatewayPosition("zaakpay", 1)}
                title="Make Zaakpay 1st Priority"
              >
                ⚡ Make Zaakpay #1
              </button>
              <button
                type="button"
                className="pg-preset-btn"
                onClick={() => handleSetGatewayPosition("razorpay", 1)}
                title="Make Razorpay 1st Priority"
              >
                💳 Make Razorpay #1
              </button>
              <button
                type="button"
                className="pg-preset-btn"
                onClick={() => handleSetGatewayPosition("hdfc", 1)}
                title="Make HDFC Bank #1"
              >
                🏦 Make HDFC #1
              </button>
              <button
                type="button"
                className="pg-preset-btn"
                onClick={() => handleSetGatewayPosition("sabpaisa", 1)}
                title="Make SabPaisa #1"
              >
                🌐 Make SabPaisa #1
              </button>
            </div>
          </div>

          <div className="pg-priority-list">
            {(pgConfig.gatewayOrder || ["razorpay", "zaakpay", "hdfc", "sabpaisa"]).map((gwKey, index) => {
              const meta = GATEWAY_META[gwKey] || {
                name: gwKey,
                color: "#94a3b8",
                icon: CreditCard,
              };
              const isEnabled = Boolean(
                gwKey === "razorpay"
                  ? pgConfig.razorpayEnabled
                  : gwKey === "zaakpay"
                  ? pgConfig.zaakpayEnabled
                  : gwKey === "hdfc"
                  ? pgConfig.hdfcEnabled
                  : pgConfig.sabpaisaEnabled
              );
              const isAppVis = Boolean(pgConfig.visibility?.[gwKey]?.app ?? true);
              const isWebVis = Boolean(pgConfig.visibility?.[gwKey]?.web ?? true);
              const IconComp = meta.icon;

              return (
                <div
                  key={gwKey}
                  className={`pg-priority-row ${isEnabled ? "is-row-active" : "is-row-disabled"}`}
                >
                  <div className="pg-priority-rank-badge" data-rank={index + 1}>
                    <span className="pg-rank-num">#{index + 1}</span>
                    <span className="pg-rank-txt">
                      {index === 0
                        ? "1st Priority (Top)"
                        : index === 1
                        ? "2nd Priority"
                        : index === 2
                        ? "3rd Priority"
                        : "4th Priority"}
                    </span>
                  </div>

                  <div className="pg-priority-info">
                    <div className="pg-priority-name-wrap">
                      <div className="pg-priority-icon" style={{ color: meta.color, background: `${meta.color}18` }}>
                        <IconComp size={18} />
                      </div>
                      <div>
                        <span className="pg-priority-name">{meta.name}</span>
                        <span className="pg-priority-sub">
                          {gwKey === "zaakpay"
                            ? `Hosted Checkout (${(pgConfig.zaakpayMode || "test").toUpperCase()})`
                            : gwKey === "hdfc"
                            ? `SmartGateway (${(pgConfig.hdfcMode || "test").toUpperCase()})`
                            : gwKey === "sabpaisa"
                            ? `PG 3.0 (${(pgConfig.sabpaisaMode || "test").toUpperCase()})`
                            : "Native Standard Checkout"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active status pill */}
                  <div className="pg-priority-status">
                    <span className={`pg-status-pill ${isEnabled ? "active" : "disabled"}`}>
                      {isEnabled ? "● Active" : "○ Disabled"}
                    </span>
                  </div>

                  {/* Quick Platform Visibility toggles right in priority row */}
                  <div className="pg-priority-vis-badges">
                    <button
                      type="button"
                      className={`pg-plat-btn ${isAppVis ? "active" : "disabled"}`}
                      onClick={() => handleToggleVisibility(gwKey, "app", !isAppVis)}
                      title={`Click to toggle Mobile App visibility for ${meta.name}`}
                    >
                      <Smartphone size={13} />
                      <span>App: {isAppVis ? "Visible" : "Hidden"}</span>
                    </button>
                    <button
                      type="button"
                      className={`pg-plat-btn ${isWebVis ? "active" : "disabled"}`}
                      onClick={() => handleToggleVisibility(gwKey, "web", !isWebVis)}
                      title={`Click to toggle Website visibility for ${meta.name}`}
                    >
                      <Globe size={13} />
                      <span>Web: {isWebVis ? "Visible" : "Hidden"}</span>
                    </button>
                  </div>

                  <div className="pg-priority-controls">
                    <label className="pg-pos-label">Position:</label>
                    <select
                      className="pg-pos-select"
                      value={index + 1}
                      onChange={(e) => handleSetGatewayPosition(gwKey, e.target.value)}
                    >
                      <option value="1">1st (Top)</option>
                      <option value="2">2nd</option>
                      <option value="3">3rd</option>
                      <option value="4">4th</option>
                    </select>

                    <div className="pg-arrow-btns">
                      <button
                        type="button"
                        className="pg-arrow-btn"
                        onClick={() => handleMoveGateway(index, -1)}
                        disabled={index === 0}
                        title="Move Up"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="pg-arrow-btn"
                        onClick={() => handleMoveGateway(index, 1)}
                        disabled={index === (pgConfig.gatewayOrder?.length || 4) - 1}
                        title="Move Down"
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pg-priority-actions">
            <button
              type="button"
              className={`pg-primary-btn ${!isGatewayOrderChanged && !isAnyVisChanged ? "is-saved" : ""}`}
              onClick={handleSaveAll}
              disabled={savingAll || (!isGatewayOrderChanged && !isAnyVisChanged)}
            >
              {savingAll ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving Priority & Visibility...
                </>
              ) : !isGatewayOrderChanged && !isAnyVisChanged ? (
                <>
                  <Check size={16} /> Priority & Visibility Saved!
                </>
              ) : (
                <>
                  <Save size={16} /> Save Priority & Visibility
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Global Routing & Default Gateway Settings */}
      <div className="pg-settings-card" style={{ marginBottom: "24px" }}>
        <div className="pg-settings-card-head">
          <Settings2 size={22} className="pg-accent-icon" />
          <div>
            <h3>Default / Primary Payment Gateway</h3>
            <p>Select which gateway should be chosen by default when multiple gateways are enabled for users.</p>
          </div>
        </div>

        <div className="pg-routing-form">
          <div className="pg-setting-field" style={{ maxWidth: "400px" }}>
            <label className="pg-field-label">Preferred Default Gateway</label>
            <select
              value={pgConfig.defaultGateway || "razorpay"}
              onChange={(e) => setPgConfig({ ...pgConfig, defaultGateway: e.target.value })}
              className="pg-select-input"
            >
              <option value="razorpay">Razorpay {pgConfig.razorpayEnabled ? "(Enabled)" : "(Disabled)"}</option>
              <option value="zaakpay">Zaakpay {pgConfig.zaakpayEnabled ? "(Enabled)" : "(Disabled)"}</option>
              <option value="hdfc">HDFC Bank {pgConfig.hdfcEnabled ? "(Enabled)" : "(Disabled)"}</option>
              <option value="sabpaisa">SabPaisa {pgConfig.sabpaisaEnabled ? "(Enabled)" : "(Disabled)"}</option>
            </select>
            <span className="pg-field-hint">
              Apps will prioritize this gateway if multiple gateways are active on that platform.
            </span>
          </div>

          <div className="pg-actions-bar">
            <button
              type="button"
              className={`pg-primary-btn ${!isAnyChanged ? "is-saved" : ""}`}
              onClick={handleSaveAll}
              disabled={savingAll || !isAnyChanged}
            >
              {savingAll ? (
                <>
                  <RefreshCw size={16} className="spin" /> Saving Settings...
                </>
              ) : !isAnyChanged ? (
                <>
                  <Check size={16} /> Settings Saved
                </>
              ) : (
                <>
                  <Save size={16} /> Save Default Gateway & All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Public Gateway API Inspector */}
      <div className="pg-settings-card">
        <div className="pg-settings-card-head">
          <Globe size={22} className="pg-accent-icon" />
          <div>
            <h3>Active Gateway Inspector (Live App Status & Flutter Body Test)</h3>
            <p>Test the exact live JSON response that mobile and web apps receive from the server.</p>
          </div>
        </div>

        <div className="pg-routing-form">
          <div className="pg-inspect-btns">
            <button
              type="button"
              className={`pg-secondary-btn ${activeTestEndpoint === "/payment/gateways" ? "is-active-inspect" : ""}`}
              onClick={() => testPublicGatewayApi("")}
              disabled={testingApi}
            >
              <Globe size={16} /> {testingApi && activeTestEndpoint === "/payment/gateways" ? "Testing..." : "Test Full Response (/api/payment/gateways)"}
            </button>

            <button
              type="button"
              className={`pg-secondary-btn ${activeTestEndpoint.includes("platform=app") ? "is-active-inspect" : ""}`}
              onClick={() => testPublicGatewayApi("platform=app")}
              disabled={testingApi}
            >
              <Smartphone size={16} /> {testingApi && activeTestEndpoint.includes("platform=app") ? "Testing..." : "📱 Test Mobile App API (?platform=app)"}
            </button>

            <button
              type="button"
              className={`pg-secondary-btn ${activeTestEndpoint.includes("platform=web") ? "is-active-inspect" : ""}`}
              onClick={() => testPublicGatewayApi("platform=web")}
              disabled={testingApi}
            >
              <Monitor size={16} /> {testingApi && activeTestEndpoint.includes("platform=web") ? "Testing..." : "🌐 Test Website API (?platform=web)"}
            </button>
          </div>

          {apiStatus && (
            <div className="pg-api-preview">
              <div className="pg-api-preview-title">
                <span>Server API Output ({activeTestEndpoint}):</span>
                <span className="pg-preview-badge">Live Status 200 OK</span>
              </div>
              <pre className="pg-code-block">{JSON.stringify(apiStatus, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGateways;
