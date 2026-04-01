const Plan = require("../../models/plan.model");

// CREATE PLAN
exports.createPlan = async (req, res) => {
  try {
    const { name, price, duration, features } = req.body;

    const plan = await Plan.create({
      name,
      price,
      duration,
      features,
    });

    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE PLAN
exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE PLAN
exports.deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Plan deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL PLANS
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      plans
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};