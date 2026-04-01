const express = require("express");
const router = express.Router();

const {
  getPlans,
} = require("../../controllers/user.plan.controller");

// ================= USER PLAN ROUTES =================

// Get all plans
router.get("/", getPlans);

module.exports = router;