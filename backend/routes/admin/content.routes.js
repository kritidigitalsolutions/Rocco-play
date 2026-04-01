const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");

const { getContentStats } = require("../../controllers/admin/content.controller");

// 📊 Content Split
router.get("/stats", isAuth, isAdmin, getContentStats);

const { getAllContent } = require("../../controllers/admin/content.controller");

router.get("/all", isAuth, isAdmin, getAllContent);

module.exports = router;