const Watchlist = require("../models/watchlist.model");

// ➕ Add to watchlist
const addToWatchlist = async (req, res) => {
  try {
    const { movieId } = req.body;

    const item = await Watchlist.create({
      user: req.user.id,
      movie: movieId
    });

    res.status(201).json({
      message: "Added to watchlist ❤️",
      data: item
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding to watchlist",
      error: error.message
    });
  }
};

// 📄 Get watchlist
const getWatchlist = async (req, res) => {
  try {
    const list = await Watchlist.find({ user: req.user.id })
      .populate("movie");

    res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching watchlist",
      error: error.message
    });
  }
};

// ❌ Remove from watchlist
const removeFromWatchlist = async (req, res) => {
  try {
    await Watchlist.findByIdAndDelete(req.params.id);

    res.json({
      message: "Removed from watchlist ❌"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error removing",
      error: error.message
    });
  }
};

module.exports = {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist
};