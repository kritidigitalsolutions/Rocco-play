const path = require("path");
const Episode = require("../../models/episode.model");
const uploadToBunny = require("../../utils/bunnyUpload");
// ✅ No fs needed — using memoryStorage (files are Buffer, not disk files)

// ➕ Add Episode
const addEpisode = async (req, res) => {
  try {
    const videoFile = req.files?.video?.[0];
    let videoUrl = "";

    if (videoFile) {
      const videoFileName = `${Date.now()}-episode${path.extname(videoFile.originalname)}`;
      const uploadedVideo = await uploadToBunny(videoFile.buffer, videoFileName, "series/videos");
      if (!uploadedVideo) return res.status(500).json({ message: "Video upload failed" });
      videoUrl = uploadedVideo;
      // ✅ No fs.unlinkSync needed
    }

    const episode = new Episode({ ...req.body, videoUrl });
    const saved = await episode.save();

    // Auto-update totalSeasons on Series if this episode is in a new season
    try {
      const Series = require("../../models/series.model");
      const series = await Series.findById(req.body.seriesId);
      if (series && Number(req.body.seasonNumber) > (series.totalSeasons || 0)) {
        series.totalSeasons = Number(req.body.seasonNumber);
        await series.save();
      }
    } catch (ignoreErr) {
      // ignore
    }

    res.status(201).json({ message: "Episode added 🎞️", data: saved });

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
      episodeNumber: episode,
    });

    if (!ep) return res.status(404).json({ message: "Episode not found" });

    res.json({ success: true, videoUrl: ep.videoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update Episode
const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;

    const episode = await Episode.findById(id);
    if (!episode) return res.status(404).json({ message: "Episode not found" });

    // 🎥 Video File (memoryStorage)
    const videoFile = req.files?.video?.[0];
    if (videoFile) {
      const videoFileName = `${Date.now()}-episode${path.extname(videoFile.originalname)}`;
      const uploadedVideo = await uploadToBunny(videoFile.buffer, videoFileName, "series/videos");
      if (uploadedVideo) episode.videoUrl = uploadedVideo;
    }

    // 🔄 Update other fields
    Object.keys(req.body).forEach((key) => { episode[key] = req.body[key]; });

    await episode.save();

    res.json({ message: "Episode updated successfully 🎞️", data: episode });

  } catch (error) {
    res.status(500).json({ message: "Error updating episode", error: error.message });
  }
};

// ❌ Delete Single Episode
const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);

    if (!episode) return res.status(404).json({ message: "Episode not found" });

    res.json({ message: "Episode deleted ❌" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting episode", error: error.message });
  }
};

module.exports = { addEpisode, getEpisodes, playEpisode, updateEpisode, deleteEpisode };