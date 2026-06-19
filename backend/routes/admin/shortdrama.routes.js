const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const {
  isAdmin,
} = require(
  "../../middlewares/admin.middleware"
);

const {
  addShortDrama,
  getAllShortDramas,
  getShortDramaById,
  updateShortDrama,
  deleteShortDrama,
  searchShortDrama,
} = require(
  "../../controllers/admin/shortdrama.controller"
);


// ========================================
// MULTER FIELDS
// ========================================
const dramaUpload =
  upload.fields([
    {
      name: "poster",
      maxCount: 1,
    },
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "trailer",
      maxCount: 1,
    },

    {
      name: "castImage_0",
      maxCount: 1,
    },
    {
      name: "castImage_1",
      maxCount: 1,
    },
    {
      name: "castImage_2",
      maxCount: 1,
    },
    {
      name: "castImage_3",
      maxCount: 1,
    },
    {
      name: "castImage_4",
      maxCount: 1,
    },
  ]);


// ========================================
// ROUTES
// ========================================

// ADD
router.post(
  "/add",
  isAdmin,
  dramaUpload,
  addShortDrama
);


// GET ALL
router.get(
  "/",isAdmin,
  getAllShortDramas
);


// SEARCH
router.get(
  "/search",isAdmin,
  searchShortDrama
);


// GET SINGLE
router.get(
  "/:id",isAdmin,
  getShortDramaById
);


// UPDATE
router.patch(
  "/:id",
  isAdmin,
  dramaUpload,
  updateShortDrama
);


// DELETE
router.delete(
  "/:id",
  isAdmin,
  deleteShortDrama
);

module.exports = router;