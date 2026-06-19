const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  googleLogin,
} = require("../../controllers/auth.controller");


// ========================================
// SEND OTP
// ========================================
router.post(
  "/send-otp",
  sendOTP
);


// ========================================
// VERIFY OTP
// ========================================
router.post(
  "/verify-otp",
  verifyOtp
);

// ========================================
// GOOGLE LOGIN
// ========================================
router.post(
  "/google-login",
  googleLogin
);


module.exports = router;