const express = require("express");
const router = express.Router();

const {
  getAllContent,
  getContentBySlug,
  playContent
} = require("../../controllers/content.controller");

const auth = require("../../middlewares/auth.middleware");
const protectSubscription = require("../../middlewares/protectedSubscription.middleware");

// 📄 All content (public)
router.get("/", getAllContent);

// 🔍 Detail (public)
router.get("/:slug", getContentBySlug);

// 🎥 Play (protected: login + subscription)
router.get("/play/:slug", auth, protectSubscription, playContent);

// 🎞️ Play episode (protected: login + subscription)
router.get("/play/:slug/:season/:episode", auth, protectSubscription, playContent);

module.exports = router;