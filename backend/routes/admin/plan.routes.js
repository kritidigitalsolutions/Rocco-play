const express = require("express");
const router = express.Router();

const {
  createPlan,
  updatePlan,
  deletePlan,
  getAllPlans
} = require("../../controllers/admin/admin.plan.controller");

const { isAuth } = require("../../middlewares/auth.middleware"); // ✅ ADD
const { isAdmin } = require("../../middlewares/admin.middleware");

// ================= ADMIN PLAN ROUTES =================

router.post("/", isAuth, isAdmin, createPlan);
router.get("/", isAuth, isAdmin, getAllPlans);
router.put("/:id", isAuth, isAdmin, updatePlan);
router.delete("/:id", isAuth, isAdmin, deletePlan);

module.exports = router;