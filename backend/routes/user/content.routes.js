const express = require("express");
const router = express.Router();
const { getHomeContent, searchContent } = require("../../controllers/content.controller");
const { getCategoriesWithContent } = require("../../controllers/admin/category.controller");

router.get("/", getHomeContent);
router.get("/category-wise", getCategoriesWithContent);
router.get("/search", searchContent);

module.exports = router;
