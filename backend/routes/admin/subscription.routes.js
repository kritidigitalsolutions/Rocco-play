const express = require("express");
const router = express.Router();

const {
  getRevenue,
  getSubscriptionStats,
  getIncomeStats,
} = require("../../controllers/admin/admin.subscription.controller");
const { isAuth } = require("../../middlewares/auth.middleware"); 
const { isAdmin } = require("../../middlewares/admin.middleware");

router.get("/revenue", isAuth, isAdmin, getRevenue);
router.get("/stats", isAuth, isAdmin, getSubscriptionStats);
router.get("/income-stats", isAuth, isAdmin, getIncomeStats);

module.exports = router;
