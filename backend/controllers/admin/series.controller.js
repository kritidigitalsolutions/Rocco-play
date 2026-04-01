const Series = require("../../models/series.model");

const uploadToBunny = require("../../utils/bunnyUpload");
const fs = require("fs");

const addSeries = async (req, res) => {
  try {
    const posterFile = req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0];
    const isComingSoon = req.body.isComingSoon === "true";

    let posterUrl = "";
    let bannerUrl = "";

    // 🖼️ Poster
    if (posterFile) {
      const uploadedPoster = await uploadToBunny(
        posterFile.path,
        posterFile.filename,
        "series/posters"
      );

      if (!uploadedPoster) {
        return res.status(500).json({ message: "Poster upload failed" });
      }

      posterUrl = uploadedPoster;
      fs.unlinkSync(posterFile.path);
    }

    // 🖼️ Banner
    if (bannerFile) {
      const uploadedBanner = await uploadToBunny(
        bannerFile.path,
        bannerFile.filename,
        "series/banners"
      );

      if (!uploadedBanner) {
        return res.status(500).json({ message: "Banner upload failed" });
      }

      bannerUrl = uploadedBanner;
      fs.unlinkSync(bannerFile.path);
    }

    const trailerFile = req.files?.trailer?.[0];
    let trailerUrl = "";

    // 🎬 Trailer Upload
    if (trailerFile) {
      const uploadedTrailer = await uploadToBunny(
        trailerFile.path,
        trailerFile.filename,
        "series/trailers"
      );

      if (!uploadedTrailer) {
        return res.status(500).json({
          message: "Trailer upload failed ❌"
        });
      }

      trailerUrl = uploadedTrailer;
      fs.unlinkSync(trailerFile.path);
    }

    // 🔄 Parse JSON
    let genre = req.body.genre;
    let category = req.body.category;
    let cast = req.body.cast;

    if (typeof genre === "string") {
      try { genre = JSON.parse(genre); } catch { genre = []; }
    }
    if (typeof category === "string") {
      try { category = JSON.parse(category); } catch { category = []; }
    }
    if (typeof cast === "string") {
      try { cast = JSON.parse(cast); } catch { cast = []; }
    }

    // 🔥🎭 NEW: Cast Image Upload (ADDED HERE)
    const castFiles = Object.keys(req.files || {}).filter(key =>
      key.startsWith("castImage_")
    );

    for (let key of castFiles) {
      const index = key.split("_")[1];
      const file = req.files[key][0];

      const uploaded = await uploadToBunny(
        file.path,
        file.filename,
        "series/cast"
      );

      cast[index].image = uploaded;
      fs.unlinkSync(file.path);
    }

    // const series = new Series({
    //   ...req.body,
    //   genre,
    //   category,
    //   cast,
    //   poster: posterUrl,
    //   banner: bannerUrl,
    //   trailerUrl: trailerUrl
    // });
    const series = new Series({
  ...req.body,
  genre,
  category,
  cast,
  poster: posterUrl,
  banner: bannerUrl,
  trailerUrl: trailerUrl,
  isComingSoon,
  releaseDate: req.body.releaseDate
});

    const saved = await series.save();

    res.status(201).json({
      message: "Series added 📺",
      data: saved
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📄 Get All Series
const getAllSeries = async (req, res) => {
  try {
    const series = await Series.find().sort({ createdAt: -1 });

    res.json({ success: true, data: series });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get Series by slug
const getSeriesBySlug = async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug });

    if (!series) return res.status(404).json({ message: "Not found" });

    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ Delete Series
const Episode = require("../../models/episode.model");

// ❌ Delete Series + its Episodes
const deleteSeries = async (req, res) => {
  try {
    const series = await Series.findOneAndDelete({
      slug: req.params.slug
    });

    if (!series) {
      return res.status(404).json({
        message: "Series not found"
      });
    }

    await Episode.deleteMany({
      seriesId: series._id
    });

    res.json({
      message: "Series and its episodes deleted ❌"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting series",
      error: error.message
    });
  }
};

// ✏️ Update Series
// const updateSeries = async (req, res) => {
//   try {
//     if (req.body.title) {
//       req.body.slug = req.body.title
//         .toLowerCase()
//         .trim()
//         .replace(/\s+/g, "-")
//         .replace(/[^\w-]+/g, "");
//     }

//     const series = await Series.findOneAndUpdate(
//       { slug: req.params.slug },
//       req.body,
//       { new: true }
//     );

//     if (!series) {
//       return res.status(404).json({
//         message: "Series not found"
//       });
//     }

//     res.json({
//       message: "Series updated 📺✨",
//       data: series
//     });

//   } catch (error) {
//     res.status(500).json({
//       message: "Error updating series",
//       error: error.message
//     });
//   }
// };
const updateSeries = async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug });

    if (!series) {
      return res.status(404).json({
        message: "Series not found"
      });
    }

    // 📂 FILES
    const posterFile = req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0];
    const trailerFile = req.files?.trailer?.[0];

    // 🖼️ Poster Update
    if (posterFile) {
      const uploadedPoster = await uploadToBunny(
        posterFile.path,
        posterFile.filename,
        "series/posters"
      );
      series.poster = uploadedPoster;
      fs.unlinkSync(posterFile.path);
    }

    // 🖼️ Banner Update
    if (bannerFile) {
      const uploadedBanner = await uploadToBunny(
        bannerFile.path,
        bannerFile.filename,
        "series/banners"
      );
      series.banner = uploadedBanner;
      fs.unlinkSync(bannerFile.path);
    }

    // 🎬 Trailer Update
    if (trailerFile) {
      const uploadedTrailer = await uploadToBunny(
        trailerFile.path,
        trailerFile.filename,
        "series/trailers"
      );
      series.trailerUrl = uploadedTrailer;
      fs.unlinkSync(trailerFile.path);
    }

    // 🔄 Update normal fields
    Object.keys(req.body).forEach((key) => {
      series[key] = req.body[key];
    });

    await series.save();

    res.json({
      message: "Series updated successfully 🔄",
      data: series
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating series",
      error: error.message
    });
  }
};

module.exports = {
  addSeries,
  getAllSeries,
  getSeriesBySlug,
  deleteSeries,
  updateSeries
};