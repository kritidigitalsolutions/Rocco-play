const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model"); // ✅ ADD THIS

// =====================================================
// 🔐 CREATE SUBSCRIPTION (CORRECT FLOW)
// =====================================================
exports.verifySubscription = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from token
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const user = await User.findById(userId);

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const existing = await Subscription.findOne({
      user: userId,
      status: "active",
    });

    if (existing && new Date() < existing.endDate) {
      return res.status(400).json({
        success: false,
        message: "Already subscribed",
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      amount: plan.price,
      startDate,
      endDate,
      status: "active",
    });

    res.json({
      success: true,
      subscription,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// =====================================================
// 🔁 CANCEL SUBSCRIPTION
// =====================================================
exports.cancelSubscription = async (req, res) => {
  try {
     const userId = req.user.id; // ✅ from token
    const { subscriptionId } = req.body;

    if (!subscriptionId || !userId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId and userId required",
      });
    }

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 🧠 CHECK SUBSCRIPTION
// =====================================================
exports.checkSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      user: userId,
      status: "active",
    }).populate("plan");

    if (
      !subscription ||
      new Date() > subscription.endDate
    ) {
      return res.status(403).json({
        success: false,
        message: "No active subscription",
      });
    }

    res.status(200).json({
      success: true,
      subscription,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ===============================

// =====================================================
// 📊 ADMIN - GET ALL SUBSCRIPTIONS (DASHBOARD)
// =====================================================
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

