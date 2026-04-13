import { useState, useEffect } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(0);

  const navigate = useNavigate();

  // ================= SEND OTP =================
  const handleSendOtp = async () => {
    if (!email.trim()) {
      alert("Please enter your email address");
      return;
    }
    try {
      await API.post("/admin/auth/send-otp", {
        email,
      });

      setStep(2);
      setTimer(30); // 🔥 START TIMER

    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    }
  };

  // ================= VERIFY OTP =================
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      alert("Please enter the OTP");
      return;
    }
    try {
      await API.post("/admin/auth/verify-otp", {
        email,
        otp,
      });

      localStorage.setItem("resetIdentifier", email);
      navigate("/reset-password");

    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP");
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
    <div className="login-page">
      <div className="login-bg"></div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">RP</div>
          <h1>Forgot Password</h1>
          <p>Reset your admin password</p>
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Enter your email"
          className="login-input"
          onChange={(e) => setEmail(e.target.value)}
        />

        {step === 1 && (
          <button className="login-btn" onClick={handleSendOtp}>
            Send OTP →
          </button>
        )}

        {/* OTP */}
        {step === 2 && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              className="login-input"
              onChange={(e) => setOtp(e.target.value)}
            />

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

            <button className="login-btn" onClick={handleVerifyOtp}>
              Verify OTP →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;