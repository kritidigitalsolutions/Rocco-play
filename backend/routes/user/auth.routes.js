const express = require("express");
const router = express.Router();

const { sendOTP, verifyOtp } = require("../../controllers/auth.controller");

// ================= DEBUG =================
console.log("USER AUTH ROUTES LOADED");

// ================= VALIDATION =================

// Send OTP
const validateSendOtp = (req, res, next) => {
  console.log("NEW VALIDATOR HIT");

  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone is required",
    });
  }

  next();
};

// Verify OTP
const validateVerifyOtp = (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: "Phone and OTP are required",
    });
  }

  next();
};

// ================= RATE LIMITER =================
const rateLimitMap = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();

  const windowTime = 60 * 1000;
  const maxRequests = 5;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap
    .get(ip)
    .filter((ts) => now - ts < windowTime);

  if (requests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Try again later.",
    });
  }

  requests.push(now);
  rateLimitMap.set(ip, requests);

  next();
};

// ================= ROUTES =================
router.post("/send-otp", rateLimiter, validateSendOtp, sendOTP);

router.post("/verify-otp", rateLimiter, validateVerifyOtp, verifyOtp);

module.exports = router;