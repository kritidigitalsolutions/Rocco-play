const express = require("express");
const router = express.Router();

const {
  addMovie,
  getAllMovies,
  getMoviesByCategory,
  getMovieBySlug,
  updateMovieBySlug,
  deleteMovieBySlug,searchMovies,playContent
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
// 🔍 Get movie by slug (MAIN DETAIL API)
router.get("/slug/:slug", getMovieBySlug);


// ================= ADMIN ROUTES =================

// ➕ Add movie
router.post("/", authMiddleware, adminMiddleware, addMovie);

// ✏️ Update movie by slug
router.put("/slug/:slug", authMiddleware, adminMiddleware, updateMovieBySlug);

// ❌ Delete movie by slug
router.delete("/slug/:slug", authMiddleware, adminMiddleware, deleteMovieBySlug);



module.exports = router;