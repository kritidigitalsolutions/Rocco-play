const express = require("express");
const router = express.Router();

const User = require("../../models/user.model");
const Movie = require("../../models/movie.model");
const Help = require("../../models/help.model");

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    if (!q) return res.json({ data: [] });

    const users = await User.find({
      name: { $regex: q, $options: "i" }
    });

    const movies = await Movie.find({
      title: { $regex: q, $options: "i" }
    });

    const help = await Help.find({
      question: { $regex: q, $options: "i" }
    });

    res.json({
      data: [
        ...users.map(u => ({ ...u._doc, type: "User" })),
        ...movies.map(m => ({ ...m._doc, type: "Movie" })),
        ...help.map(h => ({ ...h._doc, type: "Help" }))
      ]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;