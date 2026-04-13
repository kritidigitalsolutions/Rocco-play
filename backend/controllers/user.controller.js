const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const uploadToBunny = require("../utils/bunnyUpload");
const { sendPushNotification } = require("../utils/fcm.service");
// ✅ No fs needed — using memoryStorage (files are Buffer, not disk files)

// GET USER PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-__v -createdAt -updatedAt");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });

  } catch (error) {
    console.error("Error in getting user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// COMPLETE PROFILE
exports.completeProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const formatPhone = (phone) => {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) return "+91" + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return "+" + cleaned;

  return phone;
};

let formattedPhone = formatPhone(phone);
    let user = await User.findOne({ phone: formattedPhone });
    if (email) {
  const existingEmail = await User.findOne({ email });

  if (existingEmail && existingEmail._id.toString() !== user?._id?.toString()) {
    return res.status(400).json({
      message: "Email already in use",
    });
  }
}

    // ✅ IMAGE UPLOAD TO BUNNY (memoryStorage)
    let profileImage = "";

   if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const file = req.files.find(f => f.fieldname === "profileImage");

      if (file) {
        const fileName = `user_${Date.now()}_${file.originalname}`;
        const uploadedUrl = await uploadToBunny(file.buffer, fileName, "user-profile");
        // ✅ No fs.unlinkSync needed
        if (uploadedUrl) profileImage = uploadedUrl;
      }
    }

    if (!user) {
      user = await User.create({
        phone: formattedPhone,
        name,
        email,
        profileImage,
        profileComplete: true,
      });
    } else {
      const token = jwt.sign(
        { id: user._id, phone: user.phone, role: "USER" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

    if (user.profileComplete) {
  return res.status(400).json({
    message: "Profile already completed",
  });
}

      if (name) user.name = name;
      if (email) user.email = email;
      if (profileImage) user.profileImage = profileImage;

      user.profileComplete = true;
      await user.save();
    }

    res.status(200).json({ message: "Profile completed successfully", user });

  } catch (error) {
    console.error("Error in completing user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;

    // ✅ IMAGE UPDATE WITH BUNNY (memoryStorage)
    if (req.files && req.files.length > 0) {
      const file = req.files.find(f => f.fieldname === "profileImage");

      if (file) {
        const fileName = `user_${Date.now()}_${file.originalname}`;
        const uploadedUrl = await uploadToBunny(file.buffer, fileName, "user-profile");
        // ✅ No fs.unlinkSync needed
        if (uploadedUrl) user.profileImage = uploadedUrl;
      }
    }

    user.profileComplete = true;
    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });

  } catch (error) {
    console.error("Error in updating user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v");

    res.status(200).json({ success: true, data: users });

  } catch (error) {
    console.error("Error in getting users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// SAVE FCM TOKEN
// exports.saveFcmToken = async (req, res) => {
//   try {
//     const { fcmToken } = req.body;

//     if (!fcmToken) {
//       return res.status(400).json({
//         success: false,
//         message: "FCM token is required"
//       });
//     }

//     const user = await User.findByIdAndUpdate(
//       req.user.id,
//       { fcmToken },
//       { new: true }
//     );

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "FCM token saved successfully"
//     });

//   } catch (error) {
//     console.error("Save token error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };
exports.saveFcmToken = async (req, res) => {
  try {
    console.log("BODY =>", req.body);
    console.log("USER =>", req.user);

    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
        received: req.body
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.fcmToken = fcmToken;
    await user.save();
console.log("BODY =>", req.body);
console.log("USER =>", req.user);
    res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
      savedToken: user.fcmToken
    });

  } catch (error) {
    console.error("Save token error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// TEST NOTIFICATION
exports.sendTestNotification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.fcmToken) {
      return res.status(400).json({
        success: false,
        message: "No FCM token found"
      });
    }

    const result = await sendPushNotification({
      token: user.fcmToken,
      title: "Test Notification",
      body: "Push notification is working"
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};