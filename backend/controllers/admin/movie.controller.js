const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const path = require("path");

const uploadToBunny = require("../../utils/bunnyUpload");
// ✅ No fs required - using memoryStorage (files are Buffer, not disk files)

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
    const isComingSoon = req.body.isComingSoon === "true";

    let posterUrl = "";
    let bannerUrl = "";
    let videoUrl = "";
    let trailerUrl = "";

    // 🖼️ Upload Poster
    if (posterFile) {
      const posterFileName = `${Date.now()}-poster${path.extname(posterFile.originalname)}`;
      const uploadedPoster = await uploadToBunny(
        posterFile.buffer,  // ✅ memoryStorage uses .buffer
        posterFileName,
        "posters"
      );

      if (!uploadedPoster) {
        return res.status(500).json({ message: "Poster upload failed ❌" });
      }

      posterUrl = uploadedPoster;
      // ✅ No fs.unlinkSync needed - no disk file created
    }

    // 🖼️ Upload Banner
    if (bannerFile) {
      const bannerFileName = `${Date.now()}-banner${path.extname(bannerFile.originalname)}`;
      const uploadedBanner = await uploadToBunny(
        bannerFile.buffer,  // ✅ memoryStorage uses .buffer
        bannerFileName,
        "banners"
      );

      if (!uploadedBanner) {
        return res.status(500).json({ message: "Banner upload failed ❌" });
      }

      bannerUrl = uploadedBanner;
    }

    // 🎬 Upload Trailer
    if (trailerFile) {
      const trailerFileName = `${Date.now()}-trailer${path.extname(trailerFile.originalname)}`;
      const uploadedTrailer = await uploadToBunny(
        trailerFile.buffer,  // ✅ memoryStorage uses .buffer
        trailerFileName,
        "trailers"
      );

      if (!uploadedTrailer) {
        return res.status(500).json({ message: "Trailer upload failed ❌" });
      }

      trailerUrl = uploadedTrailer;
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
      // ✅ No fs.unlinkSync needed - no disk file created
    }
      
    // if (!videoUrl) {
    //   return res.status(400).json({
    //     message: "Video is required"
    //   });
    // }
    if (!isComingSoon && !videoUrl) {
  return res.status(400).json({
    message: "Video is required for released content"
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
  const castFileName = `${Date.now()}-cast-${index}${path.extname(file.originalname)}`;

  const uploaded = await uploadToBunny(
    file.buffer,  // ✅ memoryStorage uses .buffer
    castFileName,
    "cast"
  );

  if (uploaded && cast[index]) {
    cast[index].image = uploaded;
  }
  // ✅ No fs.unlinkSync needed
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
        // ✅ NEW
      isComingSoon,
      releaseDate: req.body.releaseDate ? new Date(req.body.releaseDate) : null,
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
// const updateMovieBySlug = async (req, res) => {
//   try {
//     if (req.body.title) {
//       req.body.slug = req.body.title
//         .toLowerCase()
//         .trim()
//         .replace(/\s+/g, "-")
//         .replace(/[^\w-]+/g, "");
//     }

//     const updatedMovie = await Movie.findOneAndUpdate(
//       { slug: req.params.slug },
//       req.body,
//       { new: true }
//     );

//     if (!updatedMovie) {
//       return res.status(404).json({
//         message: "Movie not found"
//       });
//     }

//     res.json({
//       message: "Movie updated successfully ✨",
//       data: updatedMovie
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error updating movie",
//       error: error.message
//     });
//   }
// };
const updateMovieBySlug = async (req, res) => {
  try {
    const movie = await Movie.findOne({ slug: req.params.slug });

    if (!movie) {
      return res.status(404).json({
        message: "Movie not found"
      });
    }

    // 📂 FILES (from memoryStorage - files are Buffer)
    const posterFile = req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0];
    const videoFile = req.files?.video?.[0];

    // 🖼️ Poster Update
    if (posterFile) {
      const posterFileName = `${Date.now()}-poster${path.extname(posterFile.originalname)}`;
      const uploadedPoster = await uploadToBunny(posterFile.buffer, posterFileName, "posters");
      if (uploadedPoster) movie.poster = uploadedPoster;
    }

    // 🖼️ Banner Update
    if (bannerFile) {
      const bannerFileName = `${Date.now()}-banner${path.extname(bannerFile.originalname)}`;
      const uploadedBanner = await uploadToBunny(bannerFile.buffer, bannerFileName, "banners");
      if (uploadedBanner) movie.banner = uploadedBanner;
    }

    // 🎥 Video Update
    if (videoFile) {
      const videoFileName = `${Date.now()}-video${path.extname(videoFile.originalname)}`;
      const uploadedVideo = await uploadToBunny(videoFile.buffer, videoFileName, "videos");
      if (uploadedVideo) movie.videoUrl = uploadedVideo;
    }

    // 🔄 Update normal fields
    Object.keys(req.body).forEach((key) => {
      movie[key] = req.body[key];
    });

    await movie.save();

    res.json({
      message: "Movie updated successfully 🔄",
      data: movie
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

    const now = new Date();

const isComingSoon =
  content.isComingSoon === true || content.isComingSoon === "true";

const releaseDate = content.releaseDate
  ? new Date(content.releaseDate)
  : null;

if (isComingSoon && releaseDate && releaseDate > now) {
  return res.status(403).json({
    message: "Content not released yet"
  });
}

    // 🔐 Premium check
    if (content.isPremium) {
      if (!req.user || !req.user.isSubscribed) {
        return res.status(403).json({
          message: "Subscribe to watch this content 🔒"
        });
      }
    }

    // 🎬 Movie
    if (contentType === "movie") {
      return res.json({
        success: true,
        videoUrl: content.videoUrl
      });
    }

    // 📺 Series
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