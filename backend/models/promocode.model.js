const mongoose = require("mongoose");

const promoSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },

  discountType: {
    type: String,
    enum: ["percentage", "flat"],
    required: true
  },

  discountValue: {
    type: Number,
    required: true
  },

  applicablePlans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan"
    }
  ],

  maxUses: {
    type: Number,
    default: 100
  },

  usedCount: {
    type: Number,
    default: 0
  },

  expiryDate: Date,

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Promo", promoSchema);