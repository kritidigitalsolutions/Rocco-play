const express = require("express");
const router = express.Router();

const {
    addOrUpdateRating,
    getAllRatings
} = require("../../controllers/rating.controller");

const { isAuth } = require("../../middlewares/auth.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");

// ✅ USER
router.post("/rate", isAuth, addOrUpdateRating);

// ✅ ADMIN
router.get("/all",isAdmin, getAllRatings);

module.exports = router;