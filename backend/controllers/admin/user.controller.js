const User = require("../../models/user.model");

// 📊 USER GROWTH (LAST 7 DAYS)
exports.getUserGrowth = async (req, res) => {
  try {
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      const count = await User.countDocuments({
        createdAt: { $gte: start, $lte: end }
      });

      data.push({
        day: start.toLocaleDateString("en-US", { weekday: "short" }),
        users: count
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// USER REGISTRATION STATS (TODAY, YESTERDAY, TOTAL)
exports.getRegistrationStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const [todayRegistration, yesterdayRegistration, totalRegistration] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfToday, $lt: startOfTomorrow } }),
      User.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        todayRegistration,
        yesterdayRegistration,
        totalRegistration,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
