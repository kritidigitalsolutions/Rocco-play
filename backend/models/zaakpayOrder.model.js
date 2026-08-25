const mongoose = require("mongoose");

const zaakpayOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    promoCode: { type: String, default: null },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["initiated", "completed", "failed"], default: "initiated" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ZaakpayOrder", zaakpayOrderSchema);