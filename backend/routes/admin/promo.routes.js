const express = require("express");
const router = express.Router();

const {
  createPromo,
  getPromos,
  deletePromo,
  updatePromo
} = require("../../controllers/admin/promo.controller");

const { isAuth } = require("../../middlewares/auth.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");

// 🔐 ADMIN ONLY
router.post("/", isAuth, isAdmin, createPromo);
router.get("/", isAuth, isAdmin, getPromos);
router.delete("/:id", isAuth, isAdmin, deletePromo);
router.put("/:id", isAuth, isAdmin, updatePromo);

module.exports = router;