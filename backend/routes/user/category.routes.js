const express = require("express");
const router = express.Router();

const {
  getAllCategories,
  getCategoryById,
  getCategoriesWithContent,
  getCategoryContentBySlug,
} = require("../../controllers/admin/category.controller");

// ── User Category Routes ──────────────────────────
// Get all categories with their curated content list (for Mobile App / Flutter & Web)
router.get("/with-content", getCategoriesWithContent);
router.get("/content", getCategoriesWithContent);

router.get("/", getAllCategories);
router.get("/:idOrSlug/content", getCategoryContentBySlug);
router.get("/:id", getCategoryById);

module.exports = router;
