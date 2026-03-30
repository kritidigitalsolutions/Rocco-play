const OTP = require("../models/otp.model");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const axios = require("axios");

// ================= SEND OTP =================
exports.sendOTP = async (req, res) => {
  try {
    const { identifier, type } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({ message: "Identifier and type required" });
    }

    // ================= FORMAT PHONE =================
    const rawPhone = identifier.replace("+", "");
    const formattedPhone = identifier.startsWith("+")
      ? identifier
      : "+" + identifier;

    // ================= GENERATE OTP =================
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const templateName = "Rocco OTP Login";

    // ================= SEND SMS =================
    const response = await axios.get(
      `https://2factor.in/API/V1/${apiKey}/SMS/${rawPhone}/${otp}/${templateName}`
    );

    console.log("2Factor Response:", response.data);

    // ================= STORE OTP =================
    await OTP.create({
      identifier: formattedPhone,
      type: "phone",
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    res.status(200).json({
      message: "OTP sent via SMS",
      sessionId: response.data.Details,
      otp, // ⚠️ remove in production
    });

  } catch (error) {
    console.error("OTP Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};


// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { identifier, otp, type } = req.body;

    if (!identifier || !otp || !type) {
      return res.status(400).json({ message: "All fields required" });
    }

    const formattedPhone = identifier.startsWith("+")
      ? identifier
      : "+" + identifier;

    const otpRecord = await OTP.findOne({
      identifier: formattedPhone,
      type: "phone",
      otp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    let user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(200).json({
        success: true,
        isNewUser: true,
        phone: formattedPhone,
      });
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: "USER" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      isNewUser: false,
      token,
      user,
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};