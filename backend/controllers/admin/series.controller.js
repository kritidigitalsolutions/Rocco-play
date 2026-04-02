const path = require("path");
const Series = require("../../models/series.model");
const uploadToBunny = require("../../utils/bunnyUpload");
// ✅ No fs needed — using memoryStorage (files are Buffer, not disk files)

const addSeries = async (req, res) => {
  try {
    const posterFile = req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0];
    const trailerFile = req.files?.trailer?.[0];
    const isComingSoon = req.body.isComingSoon === "true";

    let posterUrl = "";
    let bannerUrl = "";
    let trailerUrl = "";

    // 🖼️ Poster
    if (posterFile) {
      const posterFileName = `${Date.now()}-poster${path.extname(posterFile.originalname)}`;
      const uploadedPoster = await uploadToBunny(posterFile.buffer, posterFileName, "series/posters");
      if (!uploadedPoster) return res.status(500).json({ message: "Poster upload failed" });
      posterUrl = uploadedPoster;
    }

    // 🖼️ Banner
    if (bannerFile) {
      const bannerFileName = `${Date.now()}-banner${path.extname(bannerFile.originalname)}`;
      const uploadedBanner = await uploadToBunny(bannerFile.buffer, bannerFileName, "series/banners");
      if (!uploadedBanner) return res.status(500).json({ message: "Banner upload failed" });
      bannerUrl = uploadedBanner;
    }

    // 🎬 Trailer
    if (trailerFile) {
      const trailerFileName = `${Date.now()}-trailer${path.extname(trailerFile.originalname)}`;
      const uploadedTrailer = await uploadToBunny(trailerFile.buffer, trailerFileName, "series/trailers");
      if (!uploadedTrailer) return res.status(500).json({ message: "Trailer upload failed ❌" });
      trailerUrl = uploadedTrailer;
    }

    // 🔄 Parse JSON
    let genre = req.body.genre;
    let category = req.body.category;
    let cast = req.body.cast;

    if (typeof genre === "string") { try { genre = JSON.parse(genre); } catch { genre = []; } }
    if (typeof category === "string") { try { category = JSON.parse(category); } catch { category = []; } }
    if (typeof cast === "string") { try { cast = JSON.parse(cast); } catch { cast = []; } }

    // 🎭 Cast Images
    const castFiles = Object.keys(req.files || {}).filter(key => key.startsWith("castImage_"));

    for (let key of castFiles) {
      const index = key.split("_")[1];
      const file = req.files[key][0];
      const castFileName = `${Date.now()}-cast-${index}${path.extname(file.originalname)}`;
      const uploaded = await uploadToBunny(file.buffer, castFileName, "series/cast");
      if (uploaded && cast[index]) cast[index].image = uploaded;
      // ✅ No fs.unlinkSync needed
    }

    const series = new Series({
      ...req.body,
      genre,
      category,
      cast,
      poster: posterUrl || req.body.poster,
      banner: bannerUrl || req.body.banner,
      trailerUrl: trailerUrl || req.body.trailerUrl,
      isComingSoon,
      releaseDate: req.body.releaseDate,
    });

    const saved = await series.save();

    res.status(201).json({ message: "Series added 📺", data: saved });

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

// ❌ Delete Series + its Episodes
const Episode = require("../../models/episode.model");

const deleteSeries = async (req, res) => {
  try {
    const series = await Series.findOneAndDelete({ slug: req.params.slug });

    if (!series) return res.status(404).json({ message: "Series not found" });

    await Episode.deleteMany({ seriesId: series._id });

    res.json({ message: "Series and its episodes deleted ❌" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting series", error: error.message });
  }
};

// ✏️ Update Series
const updateSeries = async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug });

    if (!series) return res.status(404).json({ message: "Series not found" });

    // 📂 FILES (memoryStorage — files are Buffer)
    const posterFile = req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0];
    const trailerFile = req.files?.trailer?.[0];

    if (posterFile) {
      const posterFileName = `${Date.now()}-poster${path.extname(posterFile.originalname)}`;
      const uploadedPoster = await uploadToBunny(posterFile.buffer, posterFileName, "series/posters");
      if (uploadedPoster) series.poster = uploadedPoster;
    }

    if (bannerFile) {
      const bannerFileName = `${Date.now()}-banner${path.extname(bannerFile.originalname)}`;
      const uploadedBanner = await uploadToBunny(bannerFile.buffer, bannerFileName, "series/banners");
      if (uploadedBanner) series.banner = uploadedBanner;
    }

    if (trailerFile) {
      const trailerFileName = `${Date.now()}-trailer${path.extname(trailerFile.originalname)}`;
      const uploadedTrailer = await uploadToBunny(trailerFile.buffer, trailerFileName, "series/trailers");
      if (uploadedTrailer) series.trailerUrl = uploadedTrailer;
    }

    // 🔄 Update normal fields
    Object.keys(req.body).forEach((key) => { series[key] = req.body[key]; });

    await series.save();

    res.json({ message: "Series updated successfully 🔄", data: series });

  } catch (error) {
    res.status(500).json({ message: "Error updating series", error: error.message });
  }
};

module.exports = { addSeries, getAllSeries, getSeriesBySlug, deleteSeries, updateSeries };