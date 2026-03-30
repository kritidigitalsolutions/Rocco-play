const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
// const uploadFileOnBunny = require("../../cdn/bunnyCDN");

const uploadToBunny = require("../../utils/bunnyUpload");
const fs = require("fs");

// ➕ Add Movie (Admin)
const addMovie = async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({
        message: "Title is required"
      });
    }

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // 📂 Get files from multer
    const posterFile = req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0];
    const videoFile = req.files?.video?.[0];
    const trailerFile = req.files?.trailer?.[0];

    let posterUrl = "";
    let bannerUrl = "";
    let videoUrl = "";
    let trailerUrl = "";

    // 🖼️ Upload Poster
    if (posterFile) {
      // ❌ OLD CODE
      // posterUrl = await uploadToBunny(posterFile.path, posterFile.filename);
      // fs.unlinkSync(posterFile.path);

    // ❌ OLD
// const uploadedPoster = await uploadToBunny(posterFile.path, posterFile.filename);

// ✅ NEW
const uploadedPoster = await uploadToBunny(
  posterFile.path,
  posterFile.filename,
  "posters"
);

      if (!uploadedPoster) {
        return res.status(500).json({
          message: "Poster upload failed ❌"
        });
      }

      posterUrl = uploadedPoster;
      fs.unlinkSync(posterFile.path);
    }

    // 🖼️ Upload Banner
    if (bannerFile) {
      // ❌ OLD CODE
      // bannerUrl = await uploadToBunny(bannerFile.path, bannerFile.filename);
      // fs.unlinkSync(bannerFile.path);

      // ❌ OLD
// const uploadedBanner = await uploadToBunny(bannerFile.path, bannerFile.filename);

// ✅ NEW
const uploadedBanner = await uploadToBunny(
  bannerFile.path,
  bannerFile.filename,
  "banners"
);

      if (!uploadedBanner) {
        return res.status(500).json({
          message: "Banner upload failed ❌"
        });
      }

      bannerUrl = uploadedBanner;
      fs.unlinkSync(bannerFile.path);
    }

    // � Upload Trailer
    if (trailerFile) {
      const uploadedTrailer = await uploadToBunny(
        trailerFile.path,
        trailerFile.filename,
        "trailers"
      );

      if (!uploadedTrailer) {
        return res.status(500).json({
          message: "Trailer upload failed ❌"
        });
      }

      trailerUrl = uploadedTrailer;
      fs.unlinkSync(trailerFile.path);
    }

    // �🎥 Upload Video
    if (videoFile) {
      // ❌ OLD CODE
      // videoUrl = await uploadToBunny(videoFile.path, videoFile.filename);
      // fs.unlinkSync(videoFile.path);

      // ❌ OLD
// const uploadedVideo = await uploadToBunny(videoFile.path, videoFile.filename);

// ✅ NEW
const uploadedVideo = await uploadToBunny(
  videoFile.path,
  videoFile.filename,
  "videos"
);

      if (!uploadedVideo) {
        return res.status(500).json({
          message: "Video upload failed ❌"
        });
      }

      videoUrl = uploadedVideo;
      fs.unlinkSync(videoFile.path);
    }

    if (!videoUrl) {
      return res.status(400).json({
        message: "Video is required"
      });
    }

    // 🔄 Parse JSON fields
    let genre = req.body.genre;
    let category = req.body.category;
    let cast = req.body.cast;

    if (typeof genre === "string") {
      try { genre = JSON.parse(genre); } catch(e) { genre = []; }
    }
    if (typeof category === "string") {
      try { category = JSON.parse(category); } catch(e) { category = []; }
    }
    if (typeof cast === "string") {
      try { cast = JSON.parse(cast); } catch(e) { cast = []; }
    }
// 🎭 Cast Image Upload
const castFiles = Object.keys(req.files || {}).filter(key =>
  key.startsWith("castImage_")
);

for (let key of castFiles) {
  const index = key.split("_")[1];
  const file = req.files[key][0];

  const uploaded = await uploadToBunny(
    file.path,
    file.filename,
    "cast" // for movie
    // "series/cast" for series controller
  );

  if (uploaded && cast[index]) {
    cast[index].image = uploaded;
  }

  fs.unlinkSync(file.path);
}
    // 💾 Save to DB
    const movie = new Movie({
      title: req.body.title,
      description: req.body.description,
      language: req.body.language,
      releaseYear: Number(req.body.releaseYear),
      duration: req.body.duration,
      genre,
      category,
      rating: Number(req.body.rating),
      isPremium: req.body.isPremium === "true",
      poster: posterUrl || req.body.poster,
      banner: bannerUrl || req.body.banner,
      trailerUrl: trailerUrl || req.body.trailerUrl,
      cast,
      videoUrl
    });

    const savedMovie = await movie.save();

    res.status(201).json({
      message: "Movie added successfully 🎬",
      data: savedMovie
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error adding movie",
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

// 🎯 Get movies by category
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

// ❌ Delete movie
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

// 🎥 Play Content
const playContent = async (req, res) => {
  try {
    const { slug, season, episode } = req.params;

    let content = await Movie.findOne({ slug });
    let contentType = "movie";

    if (!content) {
      content = await Series.findOne({ slug });
      contentType = "series";
    }

    if (!content) {
      return res.status(404).json({
        message: "Content not found"
      });
    }

    if (content.isPremium) {
      if (!req.user || !req.user.isSubscribed) {
        return res.status(403).json({
          message: "Subscribe to watch this content 🔒"
        });
      }
    }

    if (contentType === "movie") {
      return res.json({
        success: true,
        videoUrl: content.videoUrl
      });
    }

    if (!season || episode === undefined) {
      return res.status(400).json({
        message: "Season and episode are required"
      });
    }

    const Episode = require("../../models/episode.model");
    const ep = await Episode.findOne({
      seriesId: content._id,
      seasonNumber: Number(season),
      episodeNumber: Number(episode)
    });

    if (!ep) {
      return res.status(404).json({
        message: "Episode not found"
      });
    }

    res.json({
      success: true,
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
  addMovie,
  getAllMovies,
  getMovieBySlug,
  getMoviesByCategory,
  updateMovieBySlug,
  deleteMovieBySlug,
  searchMovies,
  playContent
};