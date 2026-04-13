const express = require("express");
const router = express.Router();
const videoUpload = require("../../middlewares/videoUpload.middleware");


const {
  addEpisode,
  getEpisodes,
  playEpisode, updateEpisode, deleteEpisode
} = require("../../controllers/admin/episode.controller");

const isAuth = require("../../middlewares/auth.middleware");
const isAdmin = require("../../middlewares/admin.middleware");

// ➕ Add episode
router.post(
  "/",
  isAuth,
  isAdmin,
  videoUpload.fields([
    { name: "video", maxCount: 1 }
  ]),
  addEpisode
);;

// 📄 Get episodes
router.get("/", getEpisodes);

// 🎥 Play episode
router.get("/play/:seriesId/:season/:episode", isAuth, playEpisode);
// ✏️ Update episode
// router.put("/:id", isAuth, isAdmin, updateEpisode);
router.put(
  "/:id",
  isAuth,
  isAdmin,
  videoUpload.fields([
    { name: "video", maxCount: 1 }
  ]),
  updateEpisode
);

// ❌ Delete episode
router.delete("/:id", isAuth, isAdmin, deleteEpisode);

// ❌ Delete all episodes in a season
router.delete("/season/:seriesId/:seasonNumber", isAuth, isAdmin, async (req, res) => {
  try {
    const Episode = require("../../models/episode.model");
    const { seriesId, seasonNumber } = req.params;
    const result = await Episode.deleteMany({ seriesId, seasonNumber: Number(seasonNumber) });

    // Recalculate max season
    try {
      const Series = require("../../models/series.model");
      const maxSeasonAgg = await Episode.aggregate([
        { $match: { seriesId: new require("mongoose").Types.ObjectId(seriesId) } },
        { $group: { _id: null, maxSeason: { $max: "$seasonNumber" } } }
      ]);
      const maxSeason = maxSeasonAgg.length > 0 ? maxSeasonAgg[0].maxSeason : 0;
      await Series.findByIdAndUpdate(seriesId, { totalSeasons: maxSeason });
    } catch (ignoreErr) {
      // ignore
    }

    res.json({ message: `Season ${seasonNumber} deleted — ${result.deletedCount} episodes removed` });
  } catch (err) {
    res.status(500).json({ message: "Error deleting season", error: err.message });
  }
});

module.exports = router;