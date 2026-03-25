const express = require("express");
const router = express.Router();

//import controllers
const {sendOTP,verifyOtp} = require("../../controllers/auth.controller");

router.post("/send-otp",sendOTP);
router.post("/verify-otp", verifyOtp);

module.exports = router;