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

// Helper static method to get single configuration document (Enforces Mutual Exclusivity)
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
  } else {
    // Count active gateways
    const activeCount = (config.razorpayEnabled ? 1 : 0) + (config.zaakpayEnabled ? 1 : 0) + (config.hdfcEnabled ? 1 : 0) + (config.sabpaisaEnabled ? 1 : 0);
    if (activeCount > 1) {
      // Keep only default gateway active
      config.razorpayEnabled = config.defaultGateway === "razorpay";
      config.zaakpayEnabled = config.defaultGateway === "zaakpay";
      config.hdfcEnabled = config.defaultGateway === "hdfc";
      config.sabpaisaEnabled = config.defaultGateway === "sabpaisa";
      await config.save();
    }
  }
  return config;
};

module.exports = mongoose.model("PaymentConfig", paymentConfigSchema);
