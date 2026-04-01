const Plan = require("../models/plan.model");

// GET ALL ACTIVE PLANS
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });

    res.json({
      success: true,
      plans,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};