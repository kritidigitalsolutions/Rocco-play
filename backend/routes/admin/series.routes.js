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

const auth = require("../../middlewares/auth.middleware");
const admin = require("../../middlewares/admin.middleware");

router.get("/", getAllSeries);
router.get("/:slug", getSeriesBySlug);
router.delete("/:slug", auth, admin, deleteSeries);
router.put("/:slug", auth, admin, updateSeries);



router.post(
  "/",
  auth,
  admin,
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

module.exports = router;