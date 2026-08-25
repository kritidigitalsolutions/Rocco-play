const mongoose = require("mongoose");

const hdfcOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    promoCode: { type: String, default: null },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["initiated", "completed", "failed"], default: "initiated" },
    vpa: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HdfcOrder", hdfcOrderSchema);
