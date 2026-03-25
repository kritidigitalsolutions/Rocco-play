const Movie = require("../../models/movie.model");

// ➕ Add Movie (Admin)
const addMovie = async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({
        message: "Title is required"
      });
    }
    console.log(req.body);

    //  Handle movie vs series
    if (req.body.type === "series") {
      req.body.videoUrl = undefined;

      if (!req.body.seasons || req.body.seasons.length === 0) {
        return res.status(400).json({
          message: "Series must have at least one season"
        });
      }
    } else {
      req.body.seasons = [];
    }

    const movie = new Movie(req.body);
    const savedMovie = await movie.save();

    res.status(201).json({
      message: "Content added successfully 🎬",
      data: savedMovie
    });

  } catch (error) {
    res.status(500).json({
      message: "Error adding content",
      error: error.message
    });
  }
};
// 📄 Get all movies
const getAllMovies = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching movies",
      error: error.message
    });
  }
};

// 🔍 Get movie by slug
const getMovieBySlug = async (req, res) => {
  try {
    const movie = await Movie.findOne({ slug: req.params.slug });

    if (!movie) {
      return res.status(404).json({
        message: "Movie not found"
      });
    }

    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching movie",
      error: error.message
    });
  }
};

// 🎯 Get movies by category (FIXED)
const getMoviesByCategory = async (req, res) => {
  try {
    const { category } = req.query;

    const movies = await Movie.find({
      category: { $in: [category] }
    });

    res.json({
      success: true,
      data: movies
    });
  } catch (error) {
    res.status(500).json({
      message: "Error filtering movies",
      error: error.message
    });
  }
};

// ✏️ Update movie by slug
const updateMovieBySlug = async (req, res) => {
  try {
    // update slug if title changes
    if (req.body.title) {
      req.body.slug = req.body.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "");
    }

    const updatedMovie = await Movie.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({
        message: "Movie not found"
      });
    }

    res.json({
      message: "Movie updated successfully ✨",
      data: updatedMovie
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating movie",
      error: error.message
    });
  }
};

// ❌ Delete movie by slug
const deleteMovieBySlug = async (req, res) => {
  try {
    const deletedMovie = await Movie.findOneAndDelete({
      slug: req.params.slug
    });

    if (!deletedMovie) {
      return res.status(404).json({
        message: "Movie not found"
      });
    }

    res.json({
      message: "Movie deleted successfully ❌"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting movie",
      error: error.message
    });
  }
};

// 🔎 Search movies
const searchMovies = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        message: "Search query is required"
      });
    }

    const movies = await Movie.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { genre: { $regex: query, $options: "i" } }
      ]
    });

    res.json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (error) {
    res.status(500).json({
      message: "Error searching movies",
      error: error.message
    });
  }
};
// Play Content
const playContent = async (req, res) => {
  try {
    const { slug, season, episode } = req.params;

    const movie = await Movie.findOne({ slug });

    if (!movie) {
      return res.status(404).json({
        message: "Content not found"
      });
    }

    // 🔐 Premium check
    if (movie.isPremium) {
      if (!req.user || !req.user.isSubscribed) {
        return res.status(403).json({
          message: "Subscribe to watch this content 🔒"
        });
      }
    }

    // 🎥 MOVIE
    if (movie.type === "movie") {
      return res.json({
        success: true,
        videoUrl: movie.videoUrl
      });
    }

    // 📺 SERIES
    if (!season || episode === undefined) {
      return res.status(400).json({
        message: "Season and episode are required for series"
      });
    }

    const seasonData = movie.seasons.find(
      (s) => s.seasonNumber == season
    );

    if (!seasonData) {
      return res.status(404).json({
        message: "Season not found"
      });
    }

    const episodeData = seasonData.episodes[episode];

    if (!episodeData) {
      return res.status(404).json({
        message: "Episode not found"
      });
    }

    res.json({
      success: true,
      videoUrl: episodeData.videoUrl
    });

  } catch (error) {
    res.status(500).json({
      message: "Error playing content",
      error: error.message
    });
  }
};



module.exports = {
  addMovie,
  getAllMovies,
  getMovieBySlug,
  getMoviesByCategory,
  updateMovieBySlug,
  deleteMovieBySlug,
  searchMovies,
  playContent
};