const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },

  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true
  },

  validityDays: {
    type: Number,
    required: true
  },

  isUsed: {
    type: Boolean,
    default: false
  },

  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  expiryDate: Date
}, { timestamps: true });

module.exports = mongoose.model("Voucher", voucherSchema);