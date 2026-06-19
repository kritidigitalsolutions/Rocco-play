const DramaEpisode = require(
  "../models/dramaEpisode.model"
);

const ShortDrama = require(
  "../models/shortdrama.model"
);

const fs = require("fs");

const path = require("path");

// ========================================
// GET DRAMA EPISODES
// ========================================
const getDramaEpisodes =
  async (req, res) => {
    try {

      const {
        shortDramaId,
      } = req.params;

      const episodes =
        await DramaEpisode.find({
          shortDramaId,
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch episodes",
      });
    }
  };





// ========================================
// SEARCH DRAMA EPISODES
// ========================================
const searchDramaEpisodes =
  async (req, res) => {
    try {

      const {
        shortDramaId,
      } = req.params;

      const { q } = req.query;

      const episodes =
        await DramaEpisode.find({

          shortDramaId,

          title: {
            $regex: q || "",
            $options: "i",
          },
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        results: episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  getDramaEpisodes,
  searchDramaEpisodes,
};