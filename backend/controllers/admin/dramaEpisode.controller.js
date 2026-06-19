const DramaEpisode = require(
  "../../models/dramaEpisode.model"
);

const ShortDrama = require(
  "../../models/shortdrama.model"
);

const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");


// ========================================
// UPDATE TOTAL EPISODES
// ========================================
const updateDramaStats =
  async (shortDramaId) => {

    const totalEpisodes =
      await DramaEpisode.countDocuments({
        shortDramaId,
      });

    await ShortDrama.findByIdAndUpdate(
      shortDramaId,
      {
        totalEpisodes,
      }
    );
  };


// ========================================
// ADD DRAMA EPISODE
// ========================================
const addDramaEpisode =
  async (req, res) => {
    try {

      const {
        shortDramaId,
      } = req.params;

      const existingEpisode =
        await DramaEpisode.findOne({
          shortDramaId,

          episodeNumber:
            req.body.episodeNumber,
        });

      if (existingEpisode) {
        return res.status(400).json({
          success: false,
          message:
            "Episode already exists",
        });
      }

      const video =
        req.files?.video?.[0];

      const thumbnail =
        req.files?.thumbnail?.[0];

      const episode =
        await DramaEpisode.create({

          shortDramaId,

          episodeNumber:
            Number(
              req.body.episodeNumber
            ),

          title:
            req.body.title || "",

          description:
            req.body.description || "",

          duration:
            req.body.duration || "",

          isLocked:
            req.body.isLocked ===
            "true",

          isVertical:
            req.body.isVertical !==
            "false",

          videoUrl: getMediaUrl(
            video,
            req.body.videoUrl || ""
          ),

          thumbnail: getMediaUrl(
            thumbnail,
            req.body.thumbnail || req.body.thumbnailUrl || ""
          ),
        });

      await updateDramaStats(
        shortDramaId
      );

      return res.status(201).json({
        success: true,
        message:
          "Drama episode added successfully",

        episode,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to add drama episode",

        error: error.message,
      });
    }
  };


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
// UPDATE DRAMA EPISODE
// ========================================
const updateDramaEpisode =
  async (req, res) => {
    try {

      const episode =
        await DramaEpisode.findById(
          req.params.id
        );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message:
            "Episode not found",
        });
      }

      // DUPLICATE CHECK
      if (
        req.body.episodeNumber
      ) {

        const existingEpisode =
          await DramaEpisode.findOne({
            shortDramaId:
              episode.shortDramaId,

            episodeNumber:
              req.body.episodeNumber,

            _id: {
              $ne: episode._id,
            },
          });

        if (existingEpisode) {
          return res.status(400).json({
            success: false,
            message:
              "Episode number already exists",
          });
        }

        episode.episodeNumber =
          Number(
            req.body.episodeNumber
          );
      }

      if (req.body.title)
        episode.title =
          req.body.title;

      if (req.body.description)
        episode.description =
          req.body.description;

      if (req.body.duration)
        episode.duration =
          req.body.duration;

      if (
        req.body.isLocked !==
        undefined
      ) {

        episode.isLocked =
          req.body.isLocked ===
          "true";
      }

      if (
        req.body.isVertical !==
        undefined
      ) {

        episode.isVertical =
          req.body.isVertical !==
          "false";
      }


      // VIDEO
      if (req.files?.video?.[0]) {

        deleteMedia(
          episode.videoUrl
        );

        episode.videoUrl =
          getMediaUrl(req.files.video[0]);
      }


      // THUMBNAIL
      if (
        req.files?.thumbnail?.[0]
      ) {

        deleteMedia(
          episode.thumbnail
        );

        episode.thumbnail =
          getMediaUrl(req.files.thumbnail[0]);
      }

      await episode.save();

      return res.json({
        success: true,
        message:
          "Drama episode updated successfully",

        episode,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to update episode",
      });
    }
  };


// ========================================
// DELETE DRAMA EPISODE
// ========================================
const deleteDramaEpisode =
  async (req, res) => {
    try {

      const episode =
        await DramaEpisode.findById(
          req.params.id
        );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message:
            "Episode not found",
        });
      }

      deleteMedia(
        episode.videoUrl
      );

      deleteMedia(
        episode.thumbnail
      );

      await DramaEpisode.findByIdAndDelete(
        req.params.id
      );

      await updateDramaStats(
        episode.shortDramaId
      );

      return res.json({
        success: true,
        message:
          "Drama episode deleted successfully",
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete episode",
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
  addDramaEpisode,
  getDramaEpisodes,
  updateDramaEpisode,
  deleteDramaEpisode,
  searchDramaEpisodes,
};