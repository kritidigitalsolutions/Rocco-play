const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

// GET USER PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-__v -createdAt -updatedAt");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });

  } catch (error) {
    console.error("Error in getting user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// COMPLETE PROFILE (FIRST TIME)
exports.completeProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    // ✅ format phone
    let formattedPhone = phone.startsWith("+") ? phone : "+91" + phone;

    // ✅ find user
    let user = await User.findOne({ phone: formattedPhone });

    // ✅ handle image (multer)
    let profileImage = "";
    if (req.files && req.files.length > 0) {
      const file = req.files.find(f => f.fieldname === "profileImage");
      if (file) {
        profileImage = file.originalname;
      }
    }

    if (!user) {
      // ✅ create new user
      user = await User.create({
        phone: formattedPhone,
        name,
        email,
        profileImage,
        profileComplete: true
      });
    } else {
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
      
      
      // ✅ check BEFORE update
      if (user.profileComplete) {
        return res.status(400).json({
          message: "Profile already completed",
          token
        });
      }

      // ✅ update
      if (name) user.name = name;
      if (email) user.email = email;
      if (profileImage) user.profileImage = profileImage;

      user.profileComplete = true;

      await user.save();
    }

    res.status(200).json({
      message: "Profile completed successfully",
      user
    });

  } catch (error) {
    console.error("Error in completing user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
    console.log("BODY:", req.body);
console.log("FILES:", req.files);
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ update fields
    if (name) user.name = name;
    if (email) user.email = email;

    // ✅ multer handling
    if (req.files && req.files.length > 0) {
      const file = req.files.find(f => f.fieldname === "profileImage");
      if (file) {
        user.profileImage = file.originalname;
      }
    }

    // ✅ optional but good
    user.profileComplete = true;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user
    });

  } catch (error) {
    console.error("Error in updating user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL USERS (ADMIN PURPOSE)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v");

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error("Error in getting users:", error);
    res.status(500).json({ message: "Server error" });
  }
};