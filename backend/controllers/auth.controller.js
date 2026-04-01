const OTP = require("../models/otp.model");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const axios = require("axios");

// ================= SEND OTP =================
// exports.sendOTP = async (req, res) => {
//   try {
//     const { identifier, type } = req.body;

//     // ================= VALIDATION =================
//     if (!identifier || !type) {
//       return res.status(400).json({ message: "Identifier and type required" });
//     }

//     if (type !== "phone") {
//       return res.status(400).json({
//         message: "Only phone OTP is supported",
//       });
//     }

//     const normalizedIdentifier = String(identifier).trim();

//     // ✅ Indian phone validation
//     const phoneRegex = /^\+91[6-9]\d{9}$/;
//     if (!phoneRegex.test(normalizedIdentifier)) {
//       return res.status(400).json({
//         message: "Phone number must be in +91XXXXXXXXXX format",
//       });
//     }

//     const apiKey = process.env.TWO_FACTOR_API_KEY;
//     if (!apiKey) {
//       return res.status(500).json({
//         message: "TWO_FACTOR_API_KEY is not configured",
//       });
//     }

//     const rawPhone = normalizedIdentifier.replace("+", "");

//     // ================= GENERATE OTP =================
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     const templateName = encodeURIComponent("Rocco OTP Login");

//     // ================= SEND SMS (FIXED HEADERS) =================
//     // const url = `https://2factor.in/API/V1/${apiKey}/SMS/${rawPhone}/${otp}/${templateName}`;
//     const url = `https://2factor.in/API/V1/${apiKey}/SMS/${rawPhone}/AUTOGEN`;

//     const response = await axios.get(url, {
//       headers: {
//         "User-Agent": "Mozilla/5.0",
//         "Accept": "application/json",
//       },
//       timeout: 10000, // ⏱️ avoid hanging
//     });

//     console.log("2Factor SUCCESS:", response.data);

//     // ================= STORE OTP =================
//     await OTP.create({
//       identifier: normalizedIdentifier,
//       type,
//       otp,
//       expiresAt: new Date(Date.now() + 10 * 60 * 1000),
//     });

//     return res.status(200).json({
//       success: true,
//       message: "OTP sent successfully",
//       // ⚠️ Remove OTP in production
//       otp,
//     });

//   } catch (error) {
//     console.error("OTP ERROR:", error.response?.data || error.message);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to send OTP",
//       error: error.response?.data || error.message,
//     });
//   }
// };
exports.sendOTP = async (req, res) => {
  try {
    const { identifier, type } = req.body;

    if (!identifier || type !== "phone") {
      return res.status(400).json({ message: "Invalid input" });
    }

    const normalizedIdentifier = String(identifier).trim();

    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedIdentifier)) {
      return res.status(400).json({
        message: "Phone must be +91XXXXXXXXXX",
      });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Print OTP (for testing)
    console.log("📱 OTP for", normalizedIdentifier, "is:", otp);

    // ✅ Save in DB
    await OTP.create({
      identifier: normalizedIdentifier,
      type,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      message: "OTP generated",
      otp,
    });
  } catch (error) {
    console.error("OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
    });
  }
};
// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { identifier, otp, type } = req.body;

    // ================= VALIDATION =================
    if (!identifier || !otp || !type) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (type !== "phone") {
      return res.status(400).json({
        message: "Only phone OTP is supported",
      });
    }

    const normalizedIdentifier = String(identifier).trim();
    const normalizedOtp = String(otp).trim();

    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedIdentifier)) {
      return res.status(400).json({
        message: "Invalid phone format",
      });
    }

    // ================= FIND OTP =================
    const otpRecord = await OTP.findOne({
      identifier: normalizedIdentifier,
      type,
      otp: normalizedOtp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // ================= DELETE OTP =================
    await OTP.deleteOne({ _id: otpRecord._id });

    // ================= CHECK USER =================
    let user = await User.findOne({ phone: normalizedIdentifier });

    if (!user) {
      return res.status(200).json({
        success: true,
        isNewUser: true,
        phone: normalizedIdentifier,
      });
    }

    // ================= GENERATE TOKEN =================
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
    console.error("VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};