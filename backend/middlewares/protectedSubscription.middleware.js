const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");

const protectSubscription = async (req, res, next) => {
  try {
    // ✅ for testing (no auth)
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const user = await User.findById(userId);

    if (!user || user.subscriptions.length === 0) {
      return res.status(403).json({ message: "Subscription required" });
    }

    const subscription = await Subscription.findById(
      user.subscriptions[user.subscriptions.length - 1]
    );

    if (
      !subscription ||
      subscription.status !== "active" ||
      new Date() > subscription.endDate
    ) {
      return res.status(403).json({ message: "Subscription expired" });
    }

    next();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = protectSubscription;