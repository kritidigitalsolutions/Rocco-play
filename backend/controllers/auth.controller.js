const OTP = require("../models/otp.model");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

exports.sendOTP = async (req, res) => {
  console.log("🔥 sendOTP API HIT");
  try {
    const { phone } = req.body;

    if (!phone || phone.trim() === "") {
      return res.status(400).json({ message: "Phone number required" });
    }

    let formattedPhone = phone.startsWith("+") ? phone : "+91" + phone;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ FIXED: replace old OTP
    await OTP.findOneAndUpdate(
      { phone: formattedPhone },
      {
        otp,
        expiresAt: otpExpiry
      },
      { upsert: true, new: true }
    );

    console.log(`📲 OTP for ${formattedPhone} : ${otp}`);

    res.status(200).json({
      message: "OTP sent successfully for " + formattedPhone + " and OTP : " + otp
    });

  } catch (error) {
    console.error("Error in sending OTP:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// OTP verification controller

exports.verifyOtp = async (req, res) => {
  console.log("Verify OTP Request Body:", req.body);

  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    // ✅ FORMAT PHONE
    let formattedPhone = phone.startsWith("+") ? phone : "+91" + phone;

    // ✅ Better query (includes expiry check)
    const otpRecord = await OTP.findOne({
      phone: formattedPhone,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Better delete
    await OTP.deleteOne({ _id: otpRecord._id });

    // Check if user exists
    let user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      // New user - tell frontend to show profile completion form
      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: "New user. Please complete your profile.",
        phone: formattedPhone
      });
    }

    // Existing user - generate token
    const token = jwt.sign(
      {
        id: user._id,
        phone: user.phone,
        role: "USER"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      isNewUser: false,
      message: "Login successful",
      token,
      user: user
    });
  } catch (error) {
    console.error("Error in verifying OTP:", error);
    res.status(500).json({ message: "Server error" });
  }
};