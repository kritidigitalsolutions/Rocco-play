const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");

// 📄 Get All Content (Movie + Series)
const getAllContent = async (req, res) => {
  try {
    const movies = await Movie.find();
    const series = await Series.find();

    const content = [
      ...movies.map(m => ({ ...m.toObject(), contentType: "movie" })),
      ...series.map(s => ({ ...s.toObject(), contentType: "series" }))
    ];

    res.json({
      success: true,
      data: content
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching content",
      error: error.message
    });
  }
};

// 🔍 Get Content by Slug
const getContentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let content = await Movie.findOne({ slug });

    if (content) {
      return res.json({
        success: true,
        type: "movie",
        data: content
      });
    }

    content = await Series.findOne({ slug });

    if (content) {
      return res.json({
        success: true,
        type: "series",
        data: content
      });
    }

    return res.status(404).json({
      message: "Content not found"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching content",
      error: error.message
    });
  }
};

// 🎥 Play Content (Movie + Episode)
const playContent = async (req, res) => {
  try {
    const { slug, season, episode } = req.params;

    // 🎬 Check Movie
    const movie = await Movie.findOne({ slug });

    if (movie) {
      if (movie.isPremium && !req.user?.isSubscribed) {
        return res.status(403).json({
          message: "Subscribe to watch 🔒"
        });
      }

      return res.json({
        success: true,
        type: "movie",
        videoUrl: movie.videoUrl
      });
    }

    // 📺 Check Series
    const series = await Series.findOne({ slug });

    if (!series) {
      return res.status(404).json({
        message: "Content not found"
      });
    }

    if (!season || !episode) {
      return res.status(400).json({
        message: "Season & episode required"
      });
    }

    const ep = await Episode.findOne({
      seriesId: series._id,
      seasonNumber: season,
      episodeNumber: episode
    });

    if (!ep) {
      return res.status(404).json({
        message: "Episode not found"
      });
    }

    return res.json({
      success: true,
      type: "series",
      videoUrl: ep.videoUrl
    });

  } catch (error) {
    res.status(500).json({
      message: "Error playing content",
      error: error.message
    });
  }
};

module.exports = {
  getAllContent,
  getContentBySlug,
  playContent
};