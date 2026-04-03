const express = require("express");
const router = express.Router();
const videoUpload = require("../../middlewares/videoUpload.middleware");

const {
  addMovie,
  getAllMovies,
  getMoviesByCategory,
  getMovieBySlug,
  updateMovieBySlug,
  deleteMovieBySlug,
  searchMovies,
  playContent
} = require("../../controllers/admin/movie.controller");

const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");


// ================= PUBLIC ROUTES =================

// 📄 Get all movies
router.get("/", getAllMovies);

// 🎯 Filter by category
router.get("/category", getMoviesByCategory);

// 🔍 Search movies
router.get("/search", searchMovies);

// 🎥 Movie Play
router.get("/play/:slug", authMiddleware, playContent);

// 📺 Series Play
router.get("/play/:slug/:season/:episode", authMiddleware, playContent);

// 🔍 Get movie by slug
router.get("/slug/:slug", getMovieBySlug);


// ================= ADMIN ROUTES =================

// ➕ Add movie
router.post(
  "/add",
  authMiddleware,
  adminMiddleware,
  videoUpload.fields([
    { name: "poster", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
    { name: "video", maxCount: 1 },
    // 🎭 Cast Images
    { name: "castImage_0", maxCount: 1 },
    { name: "castImage_1", maxCount: 1 },
    { name: "castImage_2", maxCount: 1 },
    { name: "castImage_3", maxCount: 1 }
  ]),
  addMovie
);

// ✏️ Update movie
// router.put("/slug/:slug", authMiddleware, adminMiddleware, updateMovieBySlug);
router.put(
  "/slug/:slug",
  authMiddleware,
  adminMiddleware,
  videoUpload.fields([
    { name: "poster", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "castImage_0", maxCount: 1 },
    { name: "castImage_1", maxCount: 1 },
    { name: "castImage_2", maxCount: 1 },
    { name: "castImage_3", maxCount: 1 },
    { name: "castImage_4", maxCount: 1 },
    { name: "castImage_5", maxCount: 1 }
  ]),
  updateMovieBySlug
);

// ❌ Delete movie
router.delete("/slug/:slug", authMiddleware, adminMiddleware, deleteMovieBySlug);

router.get("/coming-soon", async (req, res) => {
  try {
    const movies = await Movie.find({ isComingSoon: true }).sort({ releaseDate: 1 });

    res.json({
      success: true,
      data: movies
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;