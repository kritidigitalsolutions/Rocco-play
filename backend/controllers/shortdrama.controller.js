const ShortDrama = require(
  "../models/shortdrama.model"
);

const DramaEpisode = require(
  "../models/dramaEpisode.model"
);

const fs = require("fs");

const path = require("path");


// GET ALL SHORT DRAMAS
const getAllShortDramas =
  async (req, res) => {
    try {

      const dramas =
        await ShortDrama.find()
          .sort({
            priority: -1,
            createdAt: -1,
          });

      return res.json({
        success: true,
        dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch dramas",
      });
    }
  };


// GET SINGLE SHORT DRAMA
const getShortDramaById =
  async (req, res) => {
    try {

      const shortDrama =
        await ShortDrama.findById(
          req.params.id
        );

      if (!shortDrama) {
        return res.status(404).json({
          success: false,
          message:
            "Short drama not found",
        });
      }

      return res.json({
        success: true,
        shortDrama,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch short drama",
      });
    }
  };

// SEARCH
const searchShortDrama =
  async (req, res) => {
    try {

      const { q } = req.query;

      const dramas =
        await ShortDrama.find({
          title: {
            $regex: q,
            $options: "i",
          },
        }).sort({
          priority: -1,
          createdAt: -1,
        });

      return res.json({
        success: true,
        results: dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  getAllShortDramas,
  getShortDramaById,
  searchShortDrama
};