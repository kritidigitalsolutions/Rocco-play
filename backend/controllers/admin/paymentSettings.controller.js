const PaymentConfig = require("../../models/paymentConfig.model");

// GET /api/admin/payment-settings
exports.getPaymentSettings = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    return res.status(200).json({
      success: true,
      data: {
        razorpayEnabled: config.razorpayEnabled,
        zaakpayEnabled: config.zaakpayEnabled,
        hdfcEnabled: config.hdfcEnabled,
        defaultGateway: config.defaultGateway,
        zaakpayMode: config.zaakpayMode,
        hdfcMode: config.hdfcMode,
        razorpayKeyConfigured: !!process.env.RAZORPAY_KEY_ID,
        zaakpayKeyConfigured: !!(process.env.ZAAKPAY_MERCHANT_ID && process.env.ZAAKPAY_SECRET_KEY),
        hdfcKeyConfigured: !!(process.env.HDFC_MERCHANT_ID && process.env.HDFC_MERCHANT_KEY),
        hdfcVpa: process.env.HDFC_VPA || "roccoplaywork@hdfcbank",
        hdfcStoreName: process.env.HDFC_STORE_NAME || "ROCCOPLAY MEDIA",
      },
    });
  } catch (error) {
    console.error("Get Payment Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment gateway settings",
      error: error.message,
    });
  }
};

// PUT /api/admin/payment-settings
// ONLY ONE PAYMENT GATEWAY IS ACTIVE AT A TIME (Mutually Exclusive among Razorpay, Zaakpay & HDFC)
exports.updatePaymentSettings = async (req, res) => {
  try {
    const {
      razorpayEnabled,
      zaakpayEnabled,
      hdfcEnabled,
      zaakpayMode,
      hdfcMode,
      activeGateway,
    } = req.body;

    const updateData = {};

    // 1. Direct active gateway selection
    if (activeGateway === "razorpay") {
      updateData.razorpayEnabled = true;
      updateData.zaakpayEnabled = false;
      updateData.hdfcEnabled = false;
      updateData.defaultGateway = "razorpay";
    } else if (activeGateway === "zaakpay") {
      updateData.zaakpayEnabled = true;
      updateData.razorpayEnabled = false;
      updateData.hdfcEnabled = false;
      updateData.defaultGateway = "zaakpay";
    } else if (activeGateway === "hdfc") {
      updateData.hdfcEnabled = true;
      updateData.razorpayEnabled = false;
      updateData.zaakpayEnabled = false;
      updateData.defaultGateway = "hdfc";
    }
    // 2. Individual flags (enforce mutual exclusivity)
    else if (razorpayEnabled === true) {
      updateData.razorpayEnabled = true;
      updateData.zaakpayEnabled = false;
      updateData.hdfcEnabled = false;
      updateData.defaultGateway = "razorpay";
    } else if (zaakpayEnabled === true) {
      updateData.zaakpayEnabled = true;
      updateData.razorpayEnabled = false;
      updateData.hdfcEnabled = false;
      updateData.defaultGateway = "zaakpay";
    } else if (hdfcEnabled === true) {
      updateData.hdfcEnabled = true;
      updateData.razorpayEnabled = false;
      updateData.zaakpayEnabled = false;
      updateData.defaultGateway = "hdfc";
    }

    if (zaakpayMode && ["test", "live"].includes(zaakpayMode)) {
      updateData.zaakpayMode = zaakpayMode;
    }
    if (hdfcMode && ["test", "live"].includes(hdfcMode)) {
      updateData.hdfcMode = hdfcMode;
    }

    let config = await PaymentConfig.findOne();
    if (!config) {
      config = new PaymentConfig(updateData);
    } else {
      Object.assign(config, updateData);
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: "Payment gateway settings updated successfully",
      data: {
        razorpayEnabled: config.razorpayEnabled,
        zaakpayEnabled: config.zaakpayEnabled,
        hdfcEnabled: config.hdfcEnabled,
        defaultGateway: config.defaultGateway,
        zaakpayMode: config.zaakpayMode,
        hdfcMode: config.hdfcMode,
      },
    });
  } catch (error) {
    console.error("Update Payment Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment gateway settings",
      error: error.message,
    });
  }
};
