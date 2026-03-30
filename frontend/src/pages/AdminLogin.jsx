import React, { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import "../pages/Dashboard.css"; // Uses shared .login-page classes

const AdminLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/admin/auth/login", form);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        if (res.data.admin?.name) localStorage.setItem("adminName", res.data.admin.name);
        navigate("/dashboard");
      } else {
        setError("No token received. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <form className="login-card" onSubmit={handleSubmit}>
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">RP</div>
          <h1>RoccoPlay</h1>
          <p>Sign in to your Admin Panel</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(229,9,20,0.12)", border: "1px solid rgba(229,9,20,0.4)",
            borderRadius: 8, padding: "10px 14px", fontSize: "0.88rem", color: "#ff6b6b"
          }}>
            ⚠️ {error}
          </div>
        )}

        <input
          className="login-input"
          type="email"
          name="email"
          placeholder="Admin Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          className="login-input"
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
        <p
  className="text-sm text-right text-blue-400 cursor-pointer"
  onClick={() => navigate("/forgot-password")}
>
  Forgot Password?
</p>
      </form>
    </div>
  );
};

export default AdminLogin;