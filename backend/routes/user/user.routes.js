const express = require("express");
const router = express.Router();
const {isAuth} = require("../../middlewares/auth.middleware")
const {isAdmin}=require("../../middlewares/admin.middleware")
// const upload = require("../../middlewares/multer.middleware") // parses multipart/form-data (Firebase upload disabled)
const upload = require("../../middlewares/videoUpload.middleware");
//import models
const User = require("../../models/user.model");
const {getProfile, completeProfile, updateProfile} = require("../../controllers/user.controller")

router.get("/profile", isAuth, getProfile);

// profileImage field is parsed by multer but NOT uploaded (Firebase not configured yet)
router.post("/profile-info", upload.any(), completeProfile);

router.patch("/profile-update", isAuth, upload.any(), updateProfile);
const { getAllUsers } = require("../../controllers/user.controller");

// ADD THIS LINE
router.get("/", getAllUsers);

// DELETE USER
router.delete("/:id", isAuth, async (req, res) => {
  const { id } = req.params;
    try {
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete user" });
    }
});

const { getUserGrowth } = require("../../controllers/admin/user.controller");

router.get("/growth", isAuth, isAdmin, getUserGrowth);
module.exports = router;