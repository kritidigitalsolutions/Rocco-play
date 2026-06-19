const express = require("express");

const router = express.Router();

const {
  getDramaEpisodes,
  searchDramaEpisodes,
} = require(
  "../../controllers/dramaEpisode.controller"
);

// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:shortDramaId",getDramaEpisodes);


// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search",searchDramaEpisodes);


module.exports = router;