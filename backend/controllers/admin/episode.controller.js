const Episode = require("../../models/episode.model");

// ➕ Add Episode
// const addEpisode = async (req, res) => {
//   try {
//     const episode = new Episode(req.body);
//     const saved = await episode.save();

//     res.status(201).json({
//       message: "Episode added 🎞️",
//       data: saved
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
const uploadToBunny = require("../../utils/bunnyUpload");
const fs = require("fs");

const addEpisode = async (req, res) => {
  try {
    const videoFile = req.files?.video?.[0];

    let videoUrl = "";

    if (videoFile) {
      const uploadedVideo = await uploadToBunny(
        videoFile.path,
        videoFile.filename,
        "series/videos"
      );

      if (!uploadedVideo) {
        return res.status(500).json({ message: "Video upload failed" });
      }

      videoUrl = uploadedVideo;
      fs.unlinkSync(videoFile.path);
    }

    const episode = new Episode({
      ...req.body,
      videoUrl
    });

    const saved = await episode.save();

    res.status(201).json({
      message: "Episode added 🎞️",
      data: saved
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📄 Get Episodes by Series + Season
const getEpisodes = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.query;

    const query = { seriesId };
    if (seasonNumber) query.seasonNumber = seasonNumber;

    const episodes = await Episode.find(query).sort({ seasonNumber: 1, episodeNumber: 1 });

    res.json({ success: true, data: episodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🎥 Play Episode
const playEpisode = async (req, res) => {
  try {
    const { seriesId, season, episode } = req.params;

    const ep = await Episode.findOne({
      seriesId,
      seasonNumber: season,
      episodeNumber: episode
    });

    if (!ep) {
      return res.status(404).json({ message: "Episode not found" });
    }

    res.json({
      success: true,
      videoUrl: ep.videoUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update Episode
const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;

    const episode = await Episode.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!episode) {
      return res.status(404).json({
        message: "Episode not found"
      });
    }

    res.json({
      message: "Episode updated 🎞️",
      data: episode
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating episode",
      error: error.message
    });
  }
};

// ❌ Delete Single Episode
const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);

    if (!episode) {
      return res.status(404).json({
        message: "Episode not found"
      });
    }

    res.json({
      message: "Episode deleted ❌"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting episode",
      error: error.message
    });
  }
};

module.exports = {
  addEpisode,
  getEpisodes,
  playEpisode,
  updateEpisode
,  deleteEpisode
};