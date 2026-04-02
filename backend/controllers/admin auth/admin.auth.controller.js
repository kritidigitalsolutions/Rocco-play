const Admin = require('../../models/admin.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const Otp = require('../../models/otp.model'); // 🔥 NEW

// ✅ Lazy transporter factory — created per-call so env vars are always available
// Do NOT initialize at module load time (env vars not ready on Vercel cold start)
const getTransporter = () => {
  if (!process.env.EMAIL || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL and EMAIL_PASS environment variables are not set");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ✅ Generate JWT Token
const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      role: admin.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};



// ================= LOGIN =================
exports.adminLogin = async (req, res) => {
  try {
    // ✅ INPUT VALIDATION ADDED
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(admin);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// ================= CHANGE PASSWORD =================
exports.changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    // ✅ VALIDATION
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    await admin.save();

    res.status(200).json({
      message: "Password updated successfully 🔐",
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// // ================= SEND OTP =================
// exports.sendOtp = async (req, res) => {
//   try {
//     // ✅ VALIDATION ADDED
//     if (!req.body.email) {
//       return res.status(400).json({ message: "Email is required" });
//     }

//     const email = req.body.email.trim().toLowerCase();

//     const admin = await Admin.findOne({ email });

//     if (!admin) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     console.log("Generated OTP:", otp);

//     await Otp.findOneAndUpdate(
//       { email },
//       {
//         otp,
//         expiresAt: Date.now() + 5 * 60 * 1000
//       },
//       { upsert: true, new: true }
//     );

//     console.log("OTP saved in OTP collection ✅");

//     await transporter.sendMail({
//       from: `"RoccoPlay" <${process.env.EMAIL}>`,
//       to: email,
//       subject: "Password Reset OTP",
//       html: `
//         <h2>RoccoPlay OTP</h2>
//         <p>Your OTP is:</p>
//         <h1 style="color:#e50914;">${otp}</h1>
//         <p>Valid for 5 minutes</p>
//       `,
//     });

//     res.json({ message: "OTP sent to email 📩" });

//   } catch (error) {
//     console.error("Send OTP Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
exports.sendOtp = async (req, res) => {
  try {
    const { identifier, type } = req.body;

    // ✅ VALIDATION
    if (!identifier || !type) {
      return res.status(400).json({ message: "Identifier and type required" });
    }

    const normalizedIdentifier =
      type === "email"
        ? identifier.trim().toLowerCase()
        : identifier.trim();

    // 🔥 OPTIONAL: check admin only for email
    if (type === "email") {
      const admin = await Admin.findOne({ email: normalizedIdentifier });
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("Generated OTP:", otp);

    // 🔥 SAVE OTP (UNIFIED)
    await Otp.findOneAndUpdate(
      { identifier: normalizedIdentifier, type },
      {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
      { upsert: true, new: true }
    );

    console.log("OTP saved ✅");

    // 🔥 SEND LOGIC
    if (type === "email") {
      await getTransporter().sendMail({
        from: `"RoccoPlay" <${process.env.EMAIL}>`,
        to: normalizedIdentifier,
        subject: "Password Reset OTP",
        html: `
          <h2>RoccoPlay OTP</h2>
          <p>Your OTP is:</p>
          <h1 style="color:#e50914;">${otp}</h1>
          <p>Valid for 5 minutes</p>
        `,
      });
    } else if (type === "phone") {
      // 🔥 TODO: integrate 2factor here
      console.log("Send OTP to phone:", normalizedIdentifier);
    }

    res.json({ message: `OTP sent via ${type} 📩` });

  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: error.message });
  }
};



// ================= VERIFY OTP =================
// exports.verifyOtp = async (req, res) => {
//   try {
//     // ✅ VALIDATION ADDED
//     if (!req.body.email || !req.body.otp) {
//       return res.status(400).json({ message: "Email and OTP required" });
//     }

//     const email = req.body.email.trim().toLowerCase();
//     const enteredOtp = req.body.otp.toString();

//     const record = await Otp.findOne({ email });

//     if (!record) {
//       return res.status(400).json({ message: "OTP not found" });
//     }

//     console.log("DB OTP:", record.otp);
//     console.log("Entered OTP:", enteredOtp);

//     if (record.otp.toString() !== enteredOtp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     if (record.expiresAt < Date.now()) {
//       return res.status(400).json({ message: "OTP expired" });
//     }

//     // 💡 OPTIONAL: delete OTP after verify
//     // await Otp.deleteOne({ email });

//     res.json({ message: "OTP verified successfully ✅" });

//   } catch (error) {
//     console.error("Verify OTP Error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
exports.verifyOtp = async (req, res) => {
  try {
    const { identifier, otp, type } = req.body;

    if (!identifier || !otp || !type) {
      return res.status(400).json({ message: "All fields required" });
    }

    const normalizedIdentifier =
      type === "email"
        ? identifier.trim().toLowerCase()
        : identifier.trim();

    const record = await Otp.findOne({
      identifier: normalizedIdentifier,
      type,
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    res.json({ message: "OTP verified successfully ✅" });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// ================= RESET PASSWORD =================
// exports.resetPassword = async (req, res) => {
//   try {
//     // ✅ VALIDATION ADDED
//     if (!req.body.email || !req.body.password) {
//       return res.status(400).json({ message: "Email and password required" });
//     }

//     const email = req.body.email.trim().toLowerCase();
//     const { password } = req.body;

//     const admin = await Admin.findOne({ email });

//     if (!admin) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     // 🔥 SECURITY FIX ADDED (OTP CHECK)
//     const record = await Otp.findOne({ email });

//     if (!record) {
//       return res.status(400).json({ message: "OTP not found" });
//     }

//     if (record.expiresAt < Date.now()) {
//       return res.status(400).json({ message: "OTP expired" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     admin.password = await bcrypt.hash(password, salt);

//     await admin.save();

//     // 🔥 DELETE OTP after success
//     await Otp.deleteOne({ email });

//     res.json({ message: "Password reset successful 🔐" });

//   } catch (error) {
//     console.error("Reset Password Error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
exports.resetPassword = async (req, res) => {
  try {
    const { identifier, password, type } = req.body;

    if (!identifier || !password || !type) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (type !== "email") {
      return res.status(400).json({ message: "Password reset only for email" });
    }

    const email = identifier.trim().toLowerCase();

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 🔥 VERIFY OTP AGAIN (SECURITY)
    const record = await Otp.findOne({
      identifier: email,
      type: "email",
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);

    await admin.save();

    await Otp.deleteOne({ identifier: email, type: "email" });

    res.json({ message: "Password reset successful 🔐" });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= EMAIL OTP =================
exports.sendEmailOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { identifier: newEmail, type: "email-change" },
      { otp, expiresAt: Date.now() + 5 * 60 * 1000 },
      { upsert: true }
    );

    await getTransporter().sendMail({
      to: newEmail,
      subject: "OTP",
      html: `<h1>${otp}</h1>`
    });

    res.json({ message: "OTP sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ================= CHANGE EMAIL =================
exports.changeAdminEmail = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    const { oldEmail, newEmail, otp } = req.body;

    const record = await Otp.findOne({
      identifier: newEmail,
      type: "email-change"
    });

    if (!record || record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    admin.email = newEmail;
    await admin.save();

    res.json({ message: "Email updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



//get profile
// ================= GET ADMIN PROFILE =================
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      success: true,
      admin,
    });

  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};