import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { Settings as SettingsIcon, Lock, CheckCircle, AlertCircle } from "lucide-react";
import "./Settings.css";

const Settings = () => {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [emailForm, setEmailForm] = useState({
    oldEmail: "",
    newEmail: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ================= PASSWORD =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      return setError("All fields are required");
    }

    if (form.newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (form.newPassword !== form.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);
      const res = await API.put("/admin/auth/change-password", {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      setMessage(res.data.message);
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });

    } catch (err) {
      setError(err.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // ================= EMAIL =================
  const handleEmailChange = (e) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    try {
      setEmailLoading(true);
      await API.post("/admin/auth/send-email-otp", {
        newEmail: emailForm.newEmail,
      });

      setOtpSent(true);
      setMessage("OTP sent 📩");

      // 🔥 START TIMER
      setTimer(30);

    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();

    try {
      setEmailLoading(true);
      const res = await API.put("/admin/auth/change-email", emailForm);

      setMessage(res.data.message);
      setEmailForm({ oldEmail: "", newEmail: "", otp: "" });
      setOtpSent(false);
      setTimer(0);

    } catch (err) {
      setError(err.response?.data?.message || "Error");
    } finally {
      setEmailLoading(false);
    }
  };

  // 🔥 TIMER LOGIC
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  return (
    <div className="page-section settings-page">

      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">
          <SettingsIcon size={28} /> Settings
        </h1>
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

      {/* 🔥 BOTH CARDS */}
      <div className="form-card-container">

        {/* PASSWORD CARD */}
        <div className="form-card">
          <h3><Lock size={18}/> Change Password</h3>

          <form onSubmit={handleSubmit} className="settings-form">

            <div className="form-field">
              <input
                type="password"
                name="oldPassword"
                placeholder="Old Password"
                value={form.oldPassword}
                onChange={handleChange}
                className="form-input-styled"
              />
            </div>

            <div className="form-field">
              <input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={form.newPassword}
                onChange={handleChange}
                className="form-input-styled"
              />
            </div>

            <div className="form-field">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="form-input-styled"
              />
            </div>

            <button className="btn-lg settings-submit">
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* EMAIL CARD */}
        <div className="form-card">
          <h3>📧 Change Email</h3>

          <form onSubmit={handleUpdateEmail} className="settings-form">

            <div className="form-field">
              <input
                type="email"
                name="oldEmail"
                placeholder="Old Email"
                value={emailForm.oldEmail}
                onChange={handleEmailChange}
                className="form-input-styled"
              />
            </div>

            <div className="form-field">
              <input
                type="email"
                name="newEmail"
                placeholder="New Email"
                value={emailForm.newEmail}
                onChange={handleEmailChange}
                className="form-input-styled"
              />
            </div>

            <button type="button" onClick={handleSendOtp} className="btn-lg">
              {emailLoading ? "Sending..." : "Send OTP"}
            </button>

            {otpSent && (
              <>
                <div className="form-field">
                  <input
                    type="text"
                    name="otp"
                    placeholder="Enter OTP"
                    value={emailForm.otp}
                    onChange={handleEmailChange}
                    className="form-input-styled"
                  />
                </div>

                {/* 🔥 RESEND OTP */}
                <div style={{ textAlign: "right", marginTop: "-10px" }}>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={timer > 0}
                    style={{
                      background: "none",
                      border: "none",
                      color: timer > 0 ? "gray" : "#e50914",
                      cursor: timer > 0 ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                  </button>
                </div>

                <button className="btn-lg settings-submit">
                  {emailLoading ? "Updating..." : "Update Email"}
                </button>
              </>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default Settings;