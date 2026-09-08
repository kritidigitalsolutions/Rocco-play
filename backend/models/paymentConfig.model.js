const mongoose = require("mongoose");

const paymentConfigSchema = new mongoose.Schema(
  {
    razorpayEnabled: {
      type: Boolean,
      default: true,
    },
    zaakpayEnabled: {
      type: Boolean,
      default: false,
    },
    hdfcEnabled: {
      type: Boolean,
      default: false,
    },
    sabpaisaEnabled: {
      type: Boolean,
      default: false,
    },
    defaultGateway: {
      type: String,
      enum: ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
      default: "razorpay",
    },
    zaakpayMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
    },
    hdfcMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
    },
  },
  { timestamps: true }
);

// Helper static method to get single configuration document
paymentConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      razorpayEnabled: true,
      zaakpayEnabled: false,
      hdfcEnabled: false,
      sabpaisaEnabled: false,
      defaultGateway: "razorpay",
      zaakpayMode: process.env.ZAAKPAY_MODE || "test",
      hdfcMode: process.env.HDFC_MODE || "test",
    });
  }
  return config;
};

module.exports = mongoose.model("PaymentConfig", paymentConfigSchema);
