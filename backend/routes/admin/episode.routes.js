const express = require("express");
const router = express.Router();
const videoUpload = require("../../middlewares/videoUpload.middleware");


const {
  addEpisode,
  getEpisodes,
  playEpisode,updateEpisode,deleteEpisode
} = require("../../controllers/admin/episode.controller");

const auth = require("../../middlewares/auth.middleware");
const admin = require("../../middlewares/admin.middleware");

// ➕ Add episode
router.post(
  "/",
  auth,
  admin,
  videoUpload.fields([
    { name: "video", maxCount: 1 }
  ]),
  addEpisode
);;

// 📄 Get episodes
router.get("/", getEpisodes);

// 🎥 Play episode
router.get("/play/:seriesId/:season/:episode", auth, playEpisode);
// ✏️ Update episode
// router.put("/:id", auth, admin, updateEpisode);
router.put(
  "/:id",
  auth,
  admin,
  videoUpload.fields([
    { name: "video", maxCount: 1 }
  ]),
  updateEpisode
);

// ❌ Delete episode
router.delete("/:id", auth, admin, deleteEpisode);

module.exports = router;