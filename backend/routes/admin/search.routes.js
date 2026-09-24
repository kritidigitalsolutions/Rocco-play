const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const { globalAdminSearch } = require("../../controllers/admin/search.controller");

// Global Admin Search: GET /api/admin/search?q=...
router.get("/", isAdmin, globalAdminSearch);

module.exports = router;
