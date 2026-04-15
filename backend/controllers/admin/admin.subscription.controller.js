const Subscription = require("../../models/subscription.model");
const User = require("../../models/user.model");

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

// GET SUBSCRIPTION STATS (ADMIN DASHBOARD)
exports.getSubscriptionStats = async (req, res) => {
  try {
    const now = new Date();

    const [totalUsers, activeSubscriptionUsers, expiredSubscriptionCount] = await Promise.all([
      User.countDocuments(),
      Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: now },
      }),
      Subscription.countDocuments({
        $or: [
          { status: "expired" },
          { endDate: { $lt: now } },
        ],
      }),
    ]);

    const totalSubscribedUsers = activeSubscriptionUsers.length;
    const totalNotSubscribedUsers = Math.max(totalUsers - totalSubscribedUsers, 0);

    res.json({
      success: true,
      data: {
        totalSubscribedUsers,
        totalNotSubscribedUsers,
        expirySubscriptionCount: expiredSubscriptionCount,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET INCOME STATS (ADMIN DASHBOARD)
exports.getIncomeStats = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfWeek = new Date(startOfToday);
    const dayOfWeek = startOfToday.getDay(); // 0 Sunday ... 6 Saturday
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const sumAmount = async (match) => {
      const result = await Subscription.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]);
      return result[0]?.total || 0;
    };

    const baseMatch = { amount: { $gt: 0 } };

    const [
      todayIncome,
      yesterdayIncome,
      weeklyIncome,
      monthlyIncome,
      yearlyIncome,
      totalIncome,
    ] = await Promise.all([
      sumAmount({ ...baseMatch, createdAt: { $gte: startOfToday, $lt: startOfTomorrow } }),
      sumAmount({ ...baseMatch, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      sumAmount({ ...baseMatch, createdAt: { $gte: startOfWeek, $lt: startOfTomorrow } }),
      sumAmount({ ...baseMatch, createdAt: { $gte: startOfMonth, $lt: startOfTomorrow } }),
      sumAmount({ ...baseMatch, createdAt: { $gte: startOfYear, $lt: startOfTomorrow } }),
      sumAmount(baseMatch),
    ]);

    res.json({
      success: true,
      data: {
        todayIncome,
        yesterdayIncome,
        weeklyIncome,
        monthlyIncome,
        yearlyIncome,
        totalIncome,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
