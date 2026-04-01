const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");

// =====================================================
// 🔐 COMMON SUBSCRIPTION CHECK FUNCTION
// =====================================================
const checkUserSubscription = async (userId) => {
  if (!userId) return false;

  const user = await User.findById(userId);

  if (!user || !user.subscriptions.length) return false;

  const subscription = await Subscription.findById(
    user.subscriptions[user.subscriptions.length - 1]
  );

  if (
    !subscription ||
    subscription.status !== "active" ||
    new Date() > subscription.endDate
  ) {
    return false;
  }

  return true;
};

// =====================================================
// 📄 GET ALL CONTENT
// =====================================================
const getAllContent = async (req, res) => {
  try {
    const movies = await Movie.find();
    const series = await Series.find();

    const content = [
      ...movies.map((m) => ({ ...m.toObject(), contentType: "movie" })),
      ...series.map((s) => ({ ...s.toObject(), contentType: "series" })),
    ];

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching content",
      error: error.message,
    });
  }
};

// =====================================================
// 🔍 GET CONTENT BY SLUG
// =====================================================
const getContentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let content = await Movie.findOne({ slug });

    if (content) {
      return res.json({
        success: true,
        type: "movie",
        data: content,
      });
    }

    content = await Series.findOne({ slug });

    if (content) {
      return res.json({
        success: true,
        type: "series",
        data: content,
      });
    }

    return res.status(404).json({
      message: "Content not found",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching content",
      error: error.message,
    });
  }
};

// =====================================================
// 🎬 PLAY CONTENT (MOVIE + SERIES)
// =====================================================
const playContent = async (req, res) => {
  try {
    const { slug, season, episode } = req.params;
    const userId = req.query.userId;

    // 🎬 MOVIE CHECK
    const movie = await Movie.findOne({ slug });

    if (movie) {
      // 🔒 Premium check
      if (movie.isPremium) {
        const isSubscribed = await checkUserSubscription(userId);

        if (!isSubscribed) {
          return res.status(403).json({
            message: "Subscribe to watch 🔒",
          });
        }
      }

      return res.json({
        success: true,
        type: "movie",
        videoUrl: movie.videoUrl,
      });
    }

    // 📺 SERIES CHECK
    const series = await Series.findOne({ slug });

    if (!series) {
      return res.status(404).json({
        message: "Content not found",
      });
    }

    if (!season || !episode) {
      return res.status(400).json({
        message: "Season & episode required",
      });
    }

    const ep = await Episode.findOne({
      seriesId: series._id,
      seasonNumber: season,
      episodeNumber: episode,
    });

    if (!ep) {
      return res.status(404).json({
        message: "Episode not found",
      });
    }

    // 🔒 Premium check for series
    if (series.isPremium) {
      const isSubscribed = await checkUserSubscription(userId);

      if (!isSubscribed) {
        return res.status(403).json({
          message: "Subscribe to watch 🔒",
        });
      }
    }

    return res.json({
      success: true,
      type: "series",
      videoUrl: ep.videoUrl,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error playing content",
      error: error.message,
    });
  }
};

module.exports = {
  getAllContent,
  getContentBySlug,
  playContent,
};