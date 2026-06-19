const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const {
  isAdmin,
} = require(
  "../../middlewares/admin.middleware"
);

const {
  addDramaEpisode,
  getDramaEpisodes,
  updateDramaEpisode,
  deleteDramaEpisode,
  searchDramaEpisodes,
} = require(
  "../../controllers/admin/dramaEpisode.controller"
);


// ========================================
// MULTER
// ========================================
const dramaEpisodeUpload =
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]);


// ========================================
// ADD EPISODE
// ========================================
router.post("/:shortDramaId/add",isAdmin,dramaEpisodeUpload,addDramaEpisode);


// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:shortDramaId",isAdmin,getDramaEpisodes);


// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search",isAdmin,searchDramaEpisodes);


// ========================================
// UPDATE EPISODE
// ========================================
router.patch("/:id",isAdmin,dramaEpisodeUpload,updateDramaEpisode);


// ========================================
// DELETE EPISODE
// ========================================
router.delete("/:id",isAdmin,deleteDramaEpisode);


module.exports = router;