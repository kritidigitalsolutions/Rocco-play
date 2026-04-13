const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");
const upload = require("../../middlewares/videoUpload.middleware");

const User = require("../../models/user.model");

const {
  getProfile,
  completeProfile,
  updateProfile,
  getAllUsers,
  saveFcmToken,
  sendTestNotification
} = require("../../controllers/user.controller");

const { getUserGrowth } = require("../../controllers/admin/user.controller");

/* PROFILE */
router.get("/profile", isAuth, getProfile);
router.post("/profile-info", upload.any(), completeProfile);
router.patch("/profile-update", isAuth, upload.any(), updateProfile);

/* USERS */
router.get("/", getAllUsers);
router.get("/growth", isAuth, isAdmin, getUserGrowth);

/* FCM NOTIFICATION */
router.post("/fcm-token", isAuth, saveFcmToken);
router.post("/test-notification", isAuth, sendTestNotification);

/* DELETE USER */
router.delete("/:id", isAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;