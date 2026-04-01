const express = require("express");
const router = express.Router();

const {
  adminLogin,
  changeAdminPassword,
  sendOtp,
  verifyOtp,
  resetPassword,sendEmailOtp,changeAdminEmail,getAdminProfile
} = require("../../controllers/admin auth/admin.auth.controller");

const isAuth = require("../../middlewares/auth.middleware");
const isAdmin = require("../../middlewares/admin.middleware");

// ✅ Login
router.post("/login", adminLogin);

// ✅ CHANGE PASSWORD (VERY IMPORTANT ORDER)
router.put(
  "/change-password",
  isAuth,      // 🔥 MUST RUN FIRST
  isAdmin,     // 🔥 THEN ADMIN CHECK
  changeAdminPassword
);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// 🔥 ADD ONLY
router.post("/send-email-otp", isAuth, isAdmin, sendEmailOtp);
router.put("/change-email", isAuth, isAdmin, changeAdminEmail);
router.get("/profile", isAuth, isAdmin, getAdminProfile);


module.exports = router;