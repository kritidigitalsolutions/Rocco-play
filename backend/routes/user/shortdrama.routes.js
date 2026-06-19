const express = require("express");

const router = express.Router();


const {
  getAllShortDramas,
  getShortDramaById,
  searchShortDrama,
} = require(
  "../../controllers/shortdrama.controller"
);

// ========================================
// ROUTES
// ========================================


// GET ALL
router.get(
  "/",
  getAllShortDramas
);


// SEARCH
router.get(
  "/search",
  searchShortDrama
);


// GET SINGLE
router.get(
  "/:id",
  getShortDramaById
);


module.exports = router;