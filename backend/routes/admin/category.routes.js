const express = require("express");
const router  = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoryCuratedContent,
  updateCategoryCuratedContent,
} = require("../../controllers/admin/category.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

// ── Admin Category Routes ──────────────────────────
router.get("/", isAdmin, getAllCategories);
router.post("/", isAdmin, createCategory);
router.get("/:id", isAdmin, getCategoryById);
router.patch("/:id", isAdmin, updateCategory);
router.patch("/:id/toggle-status", isAdmin, toggleCategoryStatus);
router.delete("/:id", isAdmin, deleteCategory);

// Curated content ordering for category
router.get("/:id/curated-content", isAdmin, getCategoryCuratedContent);
router.put("/:id/curated-content", isAdmin, updateCategoryCuratedContent);

module.exports = router;
