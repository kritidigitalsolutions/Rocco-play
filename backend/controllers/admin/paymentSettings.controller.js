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
        sabpaisaEnabled: config.sabpaisaEnabled,
        defaultGateway: config.defaultGateway,
        zaakpayMode: config.zaakpayMode,
        hdfcMode: config.hdfcMode,
        razorpayKeyConfigured: !!process.env.RAZORPAY_KEY_ID,
        zaakpayKeyConfigured: !!(process.env.ZAAKPAY_MERCHANT_ID && process.env.ZAAKPAY_SECRET_KEY),
        hdfcKeyConfigured: !!(process.env.HDFC_MERCHANT_ID && process.env.HDFC_MERCHANT_KEY),
        sabpaisaKeyConfigured: !!(process.env.SABPAISA_API_KEY && process.env.SABPAISA_SECRET_KEY && process.env.SABPAISA_MERCHANT_ID && process.env.SABPAISA_RETURN_URL),
        sabpaisaMode: process.env.SABPAISA_MODE || "test",
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
// Multiple payment gateways can be enabled simultaneously
exports.updatePaymentSettings = async (req, res) => {
  try {
    const {
      razorpayEnabled,
      zaakpayEnabled,
      hdfcEnabled,
      sabpaisaEnabled,
      defaultGateway,
      zaakpayMode,
      hdfcMode,
      activeGateway,
    } = req.body;

    const updateData = {};

    // 1. Direct gateway boolean toggles (Independent)
    if (razorpayEnabled !== undefined) {
      updateData.razorpayEnabled = Boolean(razorpayEnabled);
    }
    if (zaakpayEnabled !== undefined) {
      updateData.zaakpayEnabled = Boolean(zaakpayEnabled);
    }
    if (hdfcEnabled !== undefined) {
      updateData.hdfcEnabled = Boolean(hdfcEnabled);
    }
    if (sabpaisaEnabled !== undefined) {
      if (sabpaisaEnabled && !(process.env.SABPAISA_API_KEY && process.env.SABPAISA_SECRET_KEY && process.env.SABPAISA_MERCHANT_ID && process.env.SABPAISA_RETURN_URL)) {
        return res.status(400).json({ success: false, message: "Configure SABPAISA_API_KEY, SABPAISA_SECRET_KEY, SABPAISA_MERCHANT_ID, and SABPAISA_RETURN_URL before enabling SabPaisa" });
      }
      updateData.sabpaisaEnabled = Boolean(sabpaisaEnabled);
    }

    // Backwards compatibility for single activeGateway parameter if sent
    if (activeGateway && ["razorpay", "zaakpay", "hdfc", "sabpaisa"].includes(activeGateway)) {
      if (activeGateway === "sabpaisa" && !(process.env.SABPAISA_API_KEY && process.env.SABPAISA_SECRET_KEY && process.env.SABPAISA_MERCHANT_ID && process.env.SABPAISA_RETURN_URL)) {
        return res.status(400).json({ success: false, message: "Configure SabPaisa credentials first" });
      }
      updateData[`${activeGateway}Enabled`] = true;
      updateData.defaultGateway = activeGateway;
    }

    if (defaultGateway && ["razorpay", "zaakpay", "hdfc", "sabpaisa"].includes(defaultGateway)) {
      updateData.defaultGateway = defaultGateway;
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
        sabpaisaEnabled: config.sabpaisaEnabled,
        defaultGateway: config.defaultGateway,
        zaakpayMode: config.zaakpayMode,
        hdfcMode: config.hdfcMode,
        razorpayKeyConfigured: !!process.env.RAZORPAY_KEY_ID,
        zaakpayKeyConfigured: !!(process.env.ZAAKPAY_MERCHANT_ID && process.env.ZAAKPAY_SECRET_KEY),
        hdfcKeyConfigured: !!(process.env.HDFC_MERCHANT_ID && process.env.HDFC_MERCHANT_KEY),
        sabpaisaKeyConfigured: !!(process.env.SABPAISA_API_KEY && process.env.SABPAISA_SECRET_KEY && process.env.SABPAISA_MERCHANT_ID && process.env.SABPAISA_RETURN_URL),
        sabpaisaMode: process.env.SABPAISA_MODE || "test",
        hdfcVpa: process.env.HDFC_VPA || "roccoplaywork@hdfcbank",
        hdfcStoreName: process.env.HDFC_STORE_NAME || "ROCCOPLAY MEDIA",
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
