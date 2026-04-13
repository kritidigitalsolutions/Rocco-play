const Subscription = require("../../models/subscription.model");

// 💰 GET TOTAL REVENUE (ADMIN)
exports.getRevenue = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate("plan");

    // ✅ Only count ACTIVE subscriptions
    const validSubs = subscriptions.filter(sub => sub.status === "active");

   const totalRevenue = validSubs.reduce((sum, sub) => {
  return sum + (sub.amount || 0);
}, 0);

    res.json({
      success: true,
      revenue: totalRevenue
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};