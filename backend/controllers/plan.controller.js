const Plan = require("../models/plan.model");

// GET ACTIVE PLANS
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: plans.length,
      plans,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};