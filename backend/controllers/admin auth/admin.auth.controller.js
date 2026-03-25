const Admin = require('../../models/admin.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
// console.log("Request Body:", req.body);

// const admin = await Admin.findOne({ email });

// const isMatch = await bcrypt.compare(password, admin?.password || "");


// ✅ Admin Login Controller
exports.adminLogin = async (req, res) => {
  console.log("Admin Login Request:", req.body);

  try {
    const { email, password } = req.body;

    // 1. Check if admin exists
    const admin = await Admin.findOne({ email });
    console.log("Admin Found:", admin);

    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log("Password match:", isMatch);
    

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Generate token
    const token = generateToken(admin);

    // 4. Send response
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};