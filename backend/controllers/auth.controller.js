const OTP = require("../models/user.otp.model"); // adjust filename if needed
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const axios = require("axios");

// ================= PHONE FORMATTER =================
const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.length === 10) return "+91" + cleaned;

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return "+" + cleaned;
  }

  return phone;
};

// ================= SEND SMS =================
const sendSMS = async (phone, otp) => {
  try {
    // Use exact approved DLT placeholder
    const message = process.env.SMS_GH_OTP_TEXT.replace("{{otp}}", otp);

    const response = await axios.get(
      "https://www.smsgatewayhub.com/api/mt/SendSMS",
      {
        timeout: 5000,
        params: {
          APIKey: process.env.SMS_GH_API_KEY,
          senderid: process.env.SMS_GH_SENDER_ID,
          channel: "2",
          DCS: 0,
          flashsms: 0,
          number: phone.replace("+91", ""),
          text: message,
          route: process.env.SMS_GH_ROUTE,
          EntityId: process.env.SMS_GH_ENTITY_ID,
          dlttemplateid: process.env.SMS_GH_DLT_TEMPLATE_ID,
        },
      }
    );

    console.log("SMS RESPONSE:", response.data);

    if (response.data && response.data.ErrorCode === "000") {
      return true;
    }

    return false;
  } catch (error) {
    console.error("SMS ERROR:", error.response?.data || error.message);
    return false;
  }
};

// ================= SEND OTP =================
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const normalizedPhone = formatIndianPhone(phone);

    const phoneRegex = /^\+91[6-9]\d{9}$/;

    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid Indian mobile number",
      });
    }

    // Rate limit: 1 OTP per minute
    const recentOtp = await OTP.findOne({
      phone: normalizedPhone,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (process.env.NODE_ENV !== "production") {
      console.log("OTP:", otp);
    }

    // Remove old OTPs
    await OTP.deleteMany({ phone: normalizedPhone });

    // Save new OTP
    await OTP.create({
      phone: normalizedPhone,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const smsSent = await sendSMS(normalizedPhone, otp);

    if (!smsSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
    });
  }
};

// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone and OTP are required",
      });
    }

    const normalizedPhone = formatIndianPhone(phone);
    const normalizedOtp = String(otp).trim();

    const phoneRegex = /^\+91[6-9]\d{9}$/;

    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone format",
      });
    }

    const otpRecord = await OTP.findOne({
      phone: normalizedPhone,
      otp: normalizedOtp,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // Wrong OTP handling
    if (!otpRecord) {
      const existing = await OTP.findOne({
        phone: normalizedPhone,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (existing) {
        existing.attempts = (existing.attempts || 0) + 1;
        await existing.save();

        if (existing.attempts >= 5) {
          await OTP.deleteOne({ _id: existing._id });

          return res.status(429).json({
            success: false,
            message: "Too many wrong attempts. Request new OTP.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // OTP used successfully
    await OTP.deleteOne({ _id: otpRecord._id });

    let user = await User.findOne({ phone: normalizedPhone });

    // New user
    if (!user) {
      return res.status(200).json({
        success: true,
        isNewUser: true,
        phone: normalizedPhone,
      });
    }

    // Existing user
    const token = jwt.sign(
      {
        id: user._id,
        phone: user.phone,
        role: "USER",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      isNewUser: false,
      token,
      user,
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};