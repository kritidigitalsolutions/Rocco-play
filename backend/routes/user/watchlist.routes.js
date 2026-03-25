const express = require("express");
const router = express.Router();

const {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist
} = require("../../controllers/watchlist.controller");

const authMiddleware = require("../../middlewares/auth.middleware");

// all routes protected
router.post("/", authMiddleware, addToWatchlist);
router.get("/", authMiddleware, getWatchlist);
router.delete("/:id", authMiddleware, removeFromWatchlist);

module.exports = router;