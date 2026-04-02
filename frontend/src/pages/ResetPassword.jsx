import { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const email = localStorage.getItem("resetIdentifier");

  const handleReset = async () => {
    await API.post("/admin/auth/reset-password", {
       identifier: email,
  password,
  type: "email",
    });

    localStorage.removeItem("resetIdentifier");
    navigate("/dashboard");
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
          placeholder="New Password"
          className="login-input"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="login-btn" onClick={handleReset}>
          Update Password →
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;