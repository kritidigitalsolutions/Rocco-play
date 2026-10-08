const Category = require("../../models/category.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Episode = require("../../models/episode.model");

// ─── SEED DEFAULT CATEGORIES ────────────────────────────
exports.seedDefaults = async () => {
  const defaults = [
    { name: "Trending",    slug: "trending",    color: "#f59e0b", isActive: true },
    { name: "Top 10",      slug: "top10",       color: "#ef4444", isActive: true },
    { name: "Recommended", slug: "recommended", color: "#10b981", isActive: true },
  ];
  for (const cat of defaults) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: { ...cat } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
};

// ─── CREATE ─────────────────────────────────────────────
exports.createCategory = async (req, res) => {
  try {
    const { name, color, priority, isActive } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing)
      return res.status(400).json({ success: false, message: "Category already exists" });

    const inputPriority = priority !== undefined ? parseInt(priority) : 0;
    let targetPriority;

    if (inputPriority > 0) {
      // Insert at specific position: shift existing categories with priority >= target down
      await Category.updateMany(
        { priority: { $gte: inputPriority } },
        { $inc: { priority: 1 } }
      );
      targetPriority = inputPriority;
    } else {
      // Auto-assign: append at the end (max priority + 1)
      const maxCat = await Category.findOne().sort("-priority");
      targetPriority = maxCat && maxCat.priority ? maxCat.priority + 1 : 1;
    }

    const category = await Category.create({
      name: name.trim(),
      color: color || "#6366f1",
      priority: targetPriority,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({ success: true, message: "Category created", category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ALL (WITH CONTENT COUNT) ────────────────────────
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ priority: 1, name: 1 }).lean();

    // Calculate content counts per category slug
    const movieCounts = await Movie.aggregate([
      { $unwind: "$category" },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const seriesCounts = await Series.aggregate([
      { $unwind: "$category" },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    movieCounts.forEach(m => {
      countMap[m._id] = (countMap[m._id] || 0) + m.count;
    });
    seriesCounts.forEach(s => {
      countMap[s._id] = (countMap[s._id] || 0) + s.count;
    });

    const enriched = categories.map(cat => ({
      ...cat,
      isActive: cat.isActive !== false,
      contentCount: countMap[cat.slug] || (cat.curatedItems?.length || 0),
    }));

    res.json({ success: true, count: enriched.length, categories: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE ──────────────────────────────────────────────
exports.updateCategory = async (req, res) => {
  try {
    const oldCategory = await Category.findById(req.params.id);
    if (!oldCategory)
      return res.status(404).json({ success: false, message: "Category not found" });

    const { priority, name, color, isActive } = req.body;
    if (priority !== undefined) {
      const newPriority = parseInt(priority);
      const oldPriority = oldCategory.priority;

      if (newPriority !== oldPriority) {
        if (newPriority < oldPriority) {
          // moving up to a higher priority (smaller number): shift others down
          await Category.updateMany(
            { _id: { $ne: oldCategory._id }, priority: { $gte: newPriority, $lt: oldPriority } },
            { $inc: { priority: 1 } }
          );
        } else {
          // moving down to a lower priority (larger number): shift others up
          await Category.updateMany(
            { _id: { $ne: oldCategory._id }, priority: { $gt: oldPriority, $lte: newPriority } },
            { $inc: { priority: -1 } }
          );
        }
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (color) updateData.color = color;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: "after", runValidators: true }
    );

    res.json({ success: true, message: "Category updated", category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TOGGLE STATUS ───────────────────────────────────────
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.isActive = category.isActive === false ? true : false;
    await category.save();

    res.json({
      success: true,
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
      category,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE (also cleans up content) ─────────────────────
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    // Re-sequence: shift all categories with priority > deleted priority down by 1
    if (category.priority) {
      await Category.updateMany(
        { priority: { $gt: category.priority } },
        { $inc: { priority: -1 } }
      );
    }

    // Remove slug from all Movies & Series that used this category
    await Movie.updateMany(
      { category: category.slug },
      { $pull: { category: category.slug } }
    );
    await Series.updateMany(
      { category: category.slug },
      { $pull: { category: category.slug } }
    );

    res.json({ success: true, message: "Category deleted and removed from all content" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET CATEGORY CURATED CONTENT (FOR ADMIN DRAWER) ─────
exports.getCategoryCuratedContent = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Curated items map: contentId string -> position
    const curatedPosMap = {};
    if (Array.isArray(category.curatedItems)) {
      category.curatedItems.forEach((it) => {
        if (it.contentId) {
          curatedPosMap[it.contentId.toString()] = it.position || 0;
        }
      });
    }

    // 1. Fetch all movies and series in DB
    const [allMovies, allSeries] = await Promise.all([
      Movie.find({ isPublished: { $ne: false } })
        .select("_id title poster banner category rating isPremium isPublished priority createdAt")
        .lean(),
      Series.find({ isPublished: { $ne: false } })
        .select("_id title poster banner category rating isPremium isPublished priority totalEpisodes totalSeasons createdAt")
        .lean(),
    ]);

    const formattedMovies = allMovies.map(m => ({
      id: m._id.toString(),
      _id: m._id,
      title: m.title,
      poster: m.poster || "",
      banner: m.banner || "",
      type: "movie",
      category: m.category || [],
      rating: m.rating || 0,
      isPremium: m.isPremium || false,
      createdAt: m.createdAt,
    }));

    const formattedSeries = allSeries.map(s => ({
      id: s._id.toString(),
      _id: s._id,
      title: s.title,
      poster: s.poster || "",
      banner: s.banner || "",
      type: "series",
      category: s.category || [],
      rating: s.rating || 0,
      isPremium: s.isPremium || false,
      totalEpisodes: s.totalEpisodes || 0,
      totalSeasons: s.totalSeasons || 0,
      createdAt: s.createdAt,
    }));

    const allContent = [...formattedSeries, ...formattedMovies];

    // 2. Separate into selected (in category) and available (not in category)
    const selected = [];
    const available = [];

    allContent.forEach(item => {
      const hasSlug = Array.isArray(item.category) && item.category.includes(category.slug);
      const isCurated = curatedPosMap[item.id] !== undefined;

      if (hasSlug || isCurated) {
        // Position: use curated position if set, otherwise fallback to item's position or order
        const pos = curatedPosMap[item.id] !== undefined ? curatedPosMap[item.id] : 999;
        selected.push({
          ...item,
          position: pos,
          isSelected: true,
        });
      } else {
        available.push({
          ...item,
          isSelected: false,
        });
      }
    });

    // 3. Sort selected content by position ascending (1, 2, 3...)
    selected.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Re-index clean consecutive positions if needed
    selected.forEach((item, idx) => {
      if (item.position === 999 || item.position <= 0) {
        item.position = idx + 1;
      }
    });

    // Sort available by recent
    available.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      category,
      curatedItems: selected,
      availableItems: available,
      totalSelected: selected.length,
      totalAvailable: available.length,
    });
  } catch (err) {
    console.error("Get Category Curated Content Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE CATEGORY CURATED CONTENT ORDER ───────────────
exports.updateCategoryCuratedContent = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const { curatedItems } = req.body;
    if (!Array.isArray(curatedItems)) {
      return res.status(400).json({ success: false, message: "curatedItems array is required" });
    }

    // Standardize curated items
    const newCuratedItems = curatedItems.map((item, index) => ({
      contentId: item.id || item._id || item.contentId,
      contentType: (item.type || item.contentType || "series").toLowerCase(),
      position: Number(item.position !== undefined ? item.position : index + 1),
    }));

    // Update Category document
    category.curatedItems = newCuratedItems;
    await category.save();

    // Synchronize category slug on Movies & Series:
    const selectedIds = newCuratedItems.map(it => it.contentId.toString());
    const movieIds = newCuratedItems.filter(it => it.contentType === "movie").map(it => it.contentId);
    const seriesIds = newCuratedItems.filter(it => it.contentType === "series").map(it => it.contentId);

    // Add category slug to all selected
    if (movieIds.length > 0) {
      await Movie.updateMany(
        { _id: { $in: movieIds } },
        { $addToSet: { category: category.slug } }
      );
    }
    if (seriesIds.length > 0) {
      await Series.updateMany(
        { _id: { $in: seriesIds } },
        { $addToSet: { category: category.slug } }
      );
    }

    // Pull category slug from any that were removed
    await Movie.updateMany(
      { _id: { $nin: selectedIds }, category: category.slug },
      { $pull: { category: category.slug } }
    );
    await Series.updateMany(
      { _id: { $nin: selectedIds }, category: category.slug },
      { $pull: { category: category.slug } }
    );

    return res.json({
      success: true,
      message: "Curated display order saved successfully",
      count: newCuratedItems.length,
      category,
    });
  } catch (err) {
    console.error("Update Curated Content Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUBLIC API: GET CATEGORIES WITH CURATED CONTENT ─────
// (For Mobile App / Flutter & Website)
exports.getCategoriesWithContent = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: { $ne: false } })
      .sort({ priority: 1, name: 1 })
      .lean();

    // Fetch all published movies and series
    const [movies, series] = await Promise.all([
      Movie.find({ isPublished: { $ne: false } }).sort({ priority: -1, createdAt: -1 }).lean(),
      Series.find({ isPublished: { $ne: false } }).sort({ priority: -1, createdAt: -1 }).lean(),
    ]);

    const allEpisodes = await Episode.find({
      seriesId: { $in: series.map(s => s._id) }
    }).sort({ seasonNumber: 1, episodeNumber: 1 }).lean();

    const episodesMap = {};
    allEpisodes.forEach(ep => {
      const id = ep.seriesId.toString();
      if (!episodesMap[id]) episodesMap[id] = [];
      episodesMap[id].push(ep);
    });

    const formattedMovies = movies.map(m => ({
      ...m,
      type: "movie",
      isTrending: m.category?.includes("trending") || false
    }));

    const formattedSeries = series.map(s => {
      const episodes = episodesMap[s._id.toString()] || [];
      const seasons = [];
      episodes.forEach(ep => {
        let season = seasons.find(se => se.seasonNumber === ep.seasonNumber);
        if (!season) {
          season = { seasonNumber: ep.seasonNumber, episodes: [] };
          seasons.push(season);
        }
        season.episodes.push(ep);
      });
      return {
        ...s,
        seasons,
        type: "series",
        isTrending: s.category?.includes("trending") || false
      };
    });

    const allContent = [...formattedSeries, ...formattedMovies];

    // For each category, get matching content and sort by curated order
    const resultCategories = categories.map(cat => {
      const curatedMap = {};
      if (Array.isArray(cat.curatedItems)) {
        cat.curatedItems.forEach(it => {
          if (it.contentId) curatedMap[it.contentId.toString()] = it.position || 0;
        });
      }

      // Filter content belonging to this category
      const matched = allContent.filter(item => {
        const idStr = item._id.toString();
        const hasSlug = Array.isArray(item.category) && item.category.includes(cat.slug);
        const isCurated = curatedMap[idStr] !== undefined;
        return hasSlug || isCurated;
      }).map(item => {
        const idStr = item._id.toString();
        const pos = curatedMap[idStr] !== undefined ? curatedMap[idStr] : 999;
        return {
          ...item,
          position: pos,
        };
      });

      // Sort by position ascending
      matched.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Clean up consecutive position numbers
      const sortedContent = matched.map((item, idx) => ({
        ...item,
        position: item.position === 999 ? idx + 1 : item.position,
      }));

      return {
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        color: cat.color || "#6366f1",
        priority: cat.priority || 0,
        isActive: cat.isActive !== false,
        totalContent: sortedContent.length,
        content: sortedContent,
      };
    });

    return res.json({
      success: true,
      count: resultCategories.length,
      categories: resultCategories,
    });
  } catch (err) {
    console.error("Get Categories with Content Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUBLIC API: GET SINGLE CATEGORY CONTENT BY SLUG ─────
exports.getCategoryContentBySlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let category = await Category.findOne({ slug: idOrSlug }).lean();
    if (!category && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(idOrSlug).lean();
    }
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const [movies, series] = await Promise.all([
      Movie.find({
        $or: [{ category: category.slug }, { _id: { $in: (category.curatedItems || []).map(c => c.contentId) } }],
        isPublished: { $ne: false }
      }).lean(),
      Series.find({
        $or: [{ category: category.slug }, { _id: { $in: (category.curatedItems || []).map(c => c.contentId) } }],
        isPublished: { $ne: false }
      }).lean(),
    ]);

    const curatedMap = {};
    (category.curatedItems || []).forEach(it => {
      if (it.contentId) curatedMap[it.contentId.toString()] = it.position || 0;
    });

    const allContent = [
      ...movies.map(m => ({ ...m, type: "movie" })),
      ...series.map(s => ({ ...s, type: "series" })),
    ].map(item => {
      const idStr = item._id.toString();
      const pos = curatedMap[idStr] !== undefined ? curatedMap[idStr] : 999;
      return {
        ...item,
        position: pos,
      };
    });

    allContent.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    allContent.forEach((it, idx) => {
      if (it.position === 999) it.position = idx + 1;
    });

    return res.json({
      success: true,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        color: category.color,
        priority: category.priority,
      },
      totalContent: allContent.length,
      content: allContent,
    });
  } catch (err) {
    console.error("Get Category Content Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
