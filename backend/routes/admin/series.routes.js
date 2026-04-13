const express = require("express");
const router = express.Router();
const videoUpload = require("../../middlewares/videoUpload.middleware");

const {
  addSeries,
  getAllSeries,
  getSeriesBySlug,
  deleteSeries,
  updateSeries
} = require("../../controllers/admin/series.controller");

const isAuth = require("../../middlewares/auth.middleware");
const isAdmin = require("../../middlewares/admin.middleware");

router.get("/", getAllSeries);
router.get("/search", async (req, res) => {
  try {
    const Series = require("../../models/series.model");
    const q = req.query.q;
    if (!q) return res.status(400).json({ message: "Query required" });
    const results = await Series.find({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { genre: { $regex: q, $options: "i" } }
      ]
    }).sort({ createdAt: -1 });
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/:slug", getSeriesBySlug);
router.delete("/:slug", isAuth, isAdmin, deleteSeries);
// router.put("/:slug", isAuth, isAdmin, updateSeries);
router.put(
  "/:slug",
  isAuth,
  isAdmin,
  videoUpload.fields([
    { name: "poster", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
    { name: "castImage_0", maxCount: 1 },
    { name: "castImage_1", maxCount: 1 },
    { name: "castImage_2", maxCount: 1 },
    { name: "castImage_3", maxCount: 1 },
    { name: "castImage_4", maxCount: 1 },
    { name: "castImage_5", maxCount: 1 }
  ]),
  updateSeries
);



router.post(
  "/",
  isAuth,
  isAdmin,
  videoUpload.fields([
    { name: "poster", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
    // 🎭 Cast Images
    { name: "castImage_0", maxCount: 1 },
    { name: "castImage_1", maxCount: 1 },
    { name: "castImage_2", maxCount: 1 },
    { name: "castImage_3", maxCount: 1 }
  ]),
  addSeries
);

router.get("/coming-soon", async (req, res) => {
  try {
    const series = await Series.find({ isComingSoon: true }).sort({ releaseDate: 1 });

    res.json({
      success: true,
      data: series
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;