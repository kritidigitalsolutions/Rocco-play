const express = require("express");
const router = express.Router();

const {
  createVoucher,
  getVouchers,
  updateVoucher,
  deleteVoucher
} = require("../../controllers/admin/voucher.controller");

const { isAuth } = require("../../middlewares/auth.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");

router.post("/", isAuth, isAdmin, createVoucher);
router.get("/", isAuth, isAdmin, getVouchers);
router.put("/:id", isAuth, isAdmin, updateVoucher);
router.delete("/:id", isAuth, isAdmin, deleteVoucher);

module.exports = router;