const Voucher = require("../models/voucher.model");
const Subscription = require("../models/subscription.model");

exports.redeemVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    const voucher = await Voucher.findOne({
      code: code.toUpperCase()
    }).populate("plan");

    if (!voucher) {
      return res.status(400).json({ message: "Invalid voucher" });
    }

    if (voucher.isUsed) {
      return res.status(400).json({ message: "Already used" });
    }

    if (voucher.expiryDate && voucher.expiryDate < new Date()) {
      return res.status(400).json({ message: "Voucher expired" });
    }
const existing = await Subscription.findOne({
  user: userId,
  status: "active",
  endDate: { $gt: new Date() }
});

if (existing) {
  return res.status(400).json({
    success: false,
    message: "You already have an active subscription"
  });
}
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + voucher.validityDays);

    const subscription = await Subscription.create({
      user: userId,
      plan: voucher.plan._id,
      amount: 0,
      startDate,
      endDate,
      status: "active"
    });

    voucher.isUsed = true;
    voucher.usedBy = userId;
    await voucher.save();

    res.json({
      success: true,
      message: "Voucher applied successfully",
      subscription
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};