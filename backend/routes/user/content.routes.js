const express = require("express");
const router = express.Router();

const {
  getAllContent,
  getContentBySlug,
  playContent
} = require("../../controllers/content.controller");

const auth = require("../../middlewares/auth.middleware");

// 📄 All content
router.get("/", getAllContent);

// 🔍 Detail
router.get("/:slug", getContentBySlug);

// 🎥 Play (protected)
router.get("/play/:slug", auth, playContent);

// 🎞️ Play episode
router.get("/play/:slug/:season/:episode", auth, playContent);

module.exports = router;