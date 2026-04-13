import { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const email = localStorage.getItem("resetIdentifier");

  const handleReset = async () => {
    if (!email) {
      alert("Session expired. Please restart the forgot password flow.");
      navigate("/forgot-password");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/admin/auth/reset-password", {
        email,
        password,
      });

      localStorage.removeItem("resetIdentifier");
      alert("Password reset successful! Please log in.");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg"></div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">RP</div>
          <h1>Set New Password</h1>
          <p>Create a strong password</p>
        </div>

        <input
          type="password"
          placeholder="New Password (min. 6 characters)"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="login-btn" onClick={handleReset} disabled={loading}>
          {loading ? "Updating..." : "Update Password →"}
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;