const Admin = require('../../models/admin.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const Otp = require('../../models/admin.otp.model'); // 🔥 NEW
const connectDB = require('../../config/db');

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
    await connectDB();

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

    const storedPassword = typeof admin.password === "string" ? admin.password : "";
    if (!storedPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    let isMatch = false;
    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);

    if (isBcryptHash) {
      isMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy fallback: support plain-text stored passwords once, then upgrade to bcrypt.
      isMatch = password === storedPassword;
      if (isMatch) {
        admin.password = await bcrypt.hash(password, 10);
        await admin.save();
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Admin Login Error: JWT_SECRET is missing");
      return res.status(500).json({ message: "Server configuration error" });
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: normalizedEmail });

    await Otp.create({
      email: normalizedEmail,
      otp,
      purpose: "reset-password",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await getTransporter().sendMail({
      from: `"RoccoPlay" <${process.env.EMAIL}>`,
      to: normalizedEmail,
      subject: "Admin OTP",
      html: `
        <h2>Admin Verification</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Valid for 5 minutes</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
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
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const record = await Otp.findOne({
      email: normalizedEmail,
      otp: String(otp).trim(),
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    await Otp.deleteOne({ _id: record._id });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);

    await admin.save();

    await Otp.deleteMany({ email: normalizedEmail });

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// ================= EMAIL OTP =================
// exports.sendEmailOtp = async (req, res) => {
//   try {
//     const { newEmail } = req.body;

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     await Otp.findOneAndUpdate(
//       { identifier: newEmail, type: "email-change" },
//       { otp, expiresAt: Date.now() + 5 * 60 * 1000 },
//       { upsert: true }
//     );

//     await getTransporter().sendMail({
//       to: newEmail,
//       subject: "OTP",
//       html: `<h1>${otp}</h1>`
//     });

//     res.json({ message: "OTP sent" });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
exports.sendEmailOtp = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email is required",
      });
    }

    const normalizedNewEmail = newEmail.trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({
      email: normalizedNewEmail,
      purpose: "change-email",
    });

    await Otp.create({
      email: normalizedNewEmail,
      otp,
      purpose: "change-email",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await getTransporter().sendMail({
      to: admin.email,
      subject: "Confirm Email Change",
      html: `
        <h2>Email Change Request</h2>
        <p>You requested to change your email to:</p>
        <b>${normalizedNewEmail}</b>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Valid for 5 minutes</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to current email",
    });
  } catch (error) {
    console.error("sendEmailOtp Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};


// ================= CHANGE EMAIL =================
exports.changeAdminEmail = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "New email and OTP are required",
      });
    }

    const normalizedNewEmail = newEmail.trim().toLowerCase();

    const record = await Otp.findOne({
      email: normalizedNewEmail,
      otp: String(otp).trim(),
      purpose: "change-email",
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    admin.email = normalizedNewEmail;
    await admin.save();

    await Otp.deleteOne({ _id: record._id });

    res.status(200).json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (error) {
    console.error("changeAdminEmail Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
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