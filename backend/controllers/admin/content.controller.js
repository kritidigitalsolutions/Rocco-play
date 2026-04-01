const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");

// 📊 Content Stats
exports.getContentStats = async (req, res) => {
  try {
    const movies = await Movie.countDocuments();
    const series = await Series.countDocuments();

    res.json({
      success: true,
      data: [
        { name: "Movies", value: movies },
        { name: "Series", value: series }
      ]
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// 📚 GET ALL CONTENT (ADMIN)
exports.getAllContent = async (req, res) => {
  try {
    const movies = await Movie.find().lean();
    const series = await Series.find().lean();

    // Add type manually
    const formattedMovies = movies.map(m => ({
      ...m,
      type: "movie"
    }));

    const formattedSeries = series.map(s => ({
      ...s,
      type: "series"
    }));

    const allContent = [...formattedMovies, ...formattedSeries];

    // sort latest first
    allContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: allContent
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};