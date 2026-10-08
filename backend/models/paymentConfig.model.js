const mongoose = require("mongoose");

const platformVisibilitySchema = new mongoose.Schema(
  {
    app: {
      type: Boolean,
      default: true,
    },
    web: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

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
    visibility: {
      razorpay: {
        type: platformVisibilitySchema,
        default: () => ({ app: true, web: true }),
      },
      zaakpay: {
        type: platformVisibilitySchema,
        default: () => ({ app: true, web: true }),
      },
      hdfc: {
        type: platformVisibilitySchema,
        default: () => ({ app: true, web: true }),
      },
      sabpaisa: {
        type: platformVisibilitySchema,
        default: () => ({ app: true, web: true }),
      },
    },
    defaultGateway: {
      type: String,
      enum: ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
      default: "razorpay",
    },
    gatewayOrder: {
      type: [String],
      default: ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
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
    sabpaisaMode: {
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
      visibility: {
        razorpay: { app: true, web: true },
        zaakpay: { app: true, web: true },
        hdfc: { app: true, web: true },
        sabpaisa: { app: true, web: true },
      },
      defaultGateway: "razorpay",
      gatewayOrder: ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
      zaakpayMode: process.env.ZAAKPAY_MODE || "test",
      hdfcMode: process.env.HDFC_MODE || "test",
      sabpaisaMode: process.env.SABPAISA_MODE || "test",
    });
  } else {
    let needsSave = false;
    if (!Array.isArray(config.gatewayOrder) || config.gatewayOrder.length === 0) {
      config.gatewayOrder = ["razorpay", "zaakpay", "hdfc", "sabpaisa"];
      needsSave = true;
    }
    if (!config.visibility) {
      config.visibility = {
        razorpay: { app: true, web: true },
        zaakpay: { app: true, web: true },
        hdfc: { app: true, web: true },
        sabpaisa: { app: true, web: true },
      };
      needsSave = true;
    } else {
      ["razorpay", "zaakpay", "hdfc", "sabpaisa"].forEach((gw) => {
        if (!config.visibility[gw]) {
          config.visibility[gw] = { app: true, web: true };
          needsSave = true;
        } else {
          if (config.visibility[gw].app === undefined) {
            config.visibility[gw].app = true;
            needsSave = true;
          }
          if (config.visibility[gw].web === undefined) {
            config.visibility[gw].web = true;
            needsSave = true;
          }
        }
      });
    }
    if (needsSave) {
      await config.save();
    }
  }
  return config;
};

module.exports = mongoose.model("PaymentConfig", paymentConfigSchema);
