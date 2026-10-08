const PaymentConfig = require("../../models/paymentConfig.model");
const { isSabpaisaConfigured, getSabpaisaConfig } = require("../../config/sabpaisa");

const defaultVisibility = {
  razorpay: { app: true, web: true },
  zaakpay: { app: true, web: true },
  hdfc: { app: true, web: true },
  sabpaisa: { app: true, web: true },
};

// GET /api/admin/payment-settings
exports.getPaymentSettings = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    const sabpaisaMode = config.sabpaisaMode || process.env.SABPAISA_MODE || "test";
    const sabpaisaCfg = getSabpaisaConfig(sabpaisaMode);

    const rawVis = (config.visibility && (config.visibility.toObject ? config.visibility.toObject() : config.visibility)) || {};
    const visibility = {
      razorpay: {
        app: rawVis.razorpay?.app !== false,
        web: rawVis.razorpay?.web !== false,
      },
      zaakpay: {
        app: rawVis.zaakpay?.app !== false,
        web: rawVis.zaakpay?.web !== false,
      },
      hdfc: {
        app: rawVis.hdfc?.app !== false,
        web: rawVis.hdfc?.web !== false,
      },
      sabpaisa: {
        app: rawVis.sabpaisa?.app !== false,
        web: rawVis.sabpaisa?.web !== false,
      },
    };

    return res.status(200).json({
      success: true,
      data: {
        razorpayEnabled: config.razorpayEnabled,
        zaakpayEnabled: config.zaakpayEnabled,
        hdfcEnabled: config.hdfcEnabled,
        sabpaisaEnabled: config.sabpaisaEnabled,
        visibility,
        defaultGateway: config.defaultGateway,
        gatewayOrder: Array.isArray(config.gatewayOrder) && config.gatewayOrder.length > 0
          ? config.gatewayOrder
          : ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
        zaakpayMode: config.zaakpayMode,
        hdfcMode: config.hdfcMode,
        sabpaisaMode: sabpaisaMode,
        razorpayKeyConfigured: !!process.env.RAZORPAY_KEY_ID,
        zaakpayKeyConfigured: !!(process.env.ZAAKPAY_MERCHANT_ID && process.env.ZAAKPAY_SECRET_KEY),
        hdfcKeyConfigured: !!(process.env.HDFC_MERCHANT_ID && process.env.HDFC_MERCHANT_KEY),
        sabpaisaKeyConfigured: isSabpaisaConfigured(sabpaisaMode),
        sabpaisaMerchantId: sabpaisaCfg.merchantId,
        sabpaisaBaseUrl: sabpaisaCfg.baseUrl,
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
      visibility,
      razorpayVisibility,
      zaakpayVisibility,
      hdfcVisibility,
      sabpaisaVisibility,
      defaultGateway,
      gatewayOrder,
      zaakpayMode,
      hdfcMode,
      sabpaisaMode,
      activeGateway,
    } = req.body;

    const currentConfig = await PaymentConfig.getConfig();
    const targetSabpaisaMode = (sabpaisaMode && ["test", "live"].includes(sabpaisaMode))
      ? sabpaisaMode
      : (currentConfig.sabpaisaMode || "test");

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
      if (sabpaisaEnabled && !isSabpaisaConfigured(targetSabpaisaMode)) {
        return res.status(400).json({
          success: false,
          message: `Configure SabPaisa credentials for ${targetSabpaisaMode} mode before enabling`,
        });
      }
      updateData.sabpaisaEnabled = Boolean(sabpaisaEnabled);
    }

    // 2. Visibility Handling (merge gracefully)
    const curRawVis = (currentConfig.visibility && (currentConfig.visibility.toObject ? currentConfig.visibility.toObject() : currentConfig.visibility)) || {};
    const baseVis = {
      razorpay: {
        app: curRawVis.razorpay?.app !== false,
        web: curRawVis.razorpay?.web !== false,
      },
      zaakpay: {
        app: curRawVis.zaakpay?.app !== false,
        web: curRawVis.zaakpay?.web !== false,
      },
      hdfc: {
        app: curRawVis.hdfc?.app !== false,
        web: curRawVis.hdfc?.web !== false,
      },
      sabpaisa: {
        app: curRawVis.sabpaisa?.app !== false,
        web: curRawVis.sabpaisa?.web !== false,
      },
    };

    let updatedVis = {
      razorpay: { ...baseVis.razorpay },
      zaakpay: { ...baseVis.zaakpay },
      hdfc: { ...baseVis.hdfc },
      sabpaisa: { ...baseVis.sabpaisa },
    };
    let hasVisChange = false;

    if (visibility && typeof visibility === "object") {
      ["razorpay", "zaakpay", "hdfc", "sabpaisa"].forEach((gw) => {
        if (visibility[gw] && typeof visibility[gw] === "object") {
          if (visibility[gw].app !== undefined) {
            updatedVis[gw].app = Boolean(visibility[gw].app);
            hasVisChange = true;
          }
          if (visibility[gw].web !== undefined) {
            updatedVis[gw].web = Boolean(visibility[gw].web);
            hasVisChange = true;
          }
        }
      });
    }

    // Support individual fields: razorpayVisibility, zaakpayVisibility, etc.
    const individualVisMap = {
      razorpay: razorpayVisibility,
      zaakpay: zaakpayVisibility,
      hdfc: hdfcVisibility,
      sabpaisa: sabpaisaVisibility,
    };
    Object.entries(individualVisMap).forEach(([gw, val]) => {
      if (val && typeof val === "object") {
        if (val.app !== undefined) {
          updatedVis[gw].app = Boolean(val.app);
          hasVisChange = true;
        }
        if (val.web !== undefined) {
          updatedVis[gw].web = Boolean(val.web);
          hasVisChange = true;
        }
      }
    });

    if (hasVisChange) {
      updateData.visibility = updatedVis;
    }

    // Backwards compatibility for single activeGateway parameter if sent
    if (activeGateway && ["razorpay", "zaakpay", "hdfc", "sabpaisa"].includes(activeGateway)) {
      if (activeGateway === "sabpaisa" && !isSabpaisaConfigured(targetSabpaisaMode)) {
        return res.status(400).json({ success: false, message: "Configure SabPaisa credentials first" });
      }
      updateData[`${activeGateway}Enabled`] = true;
      updateData.defaultGateway = activeGateway;
    }

    if (defaultGateway && ["razorpay", "zaakpay", "hdfc", "sabpaisa"].includes(defaultGateway)) {
      updateData.defaultGateway = defaultGateway;
    }

    // 3. Gateway display priority ordering
    if (Array.isArray(gatewayOrder) && gatewayOrder.length > 0) {
      const allowed = ["razorpay", "zaakpay", "hdfc", "sabpaisa"];
      const filtered = gatewayOrder.filter((id) => allowed.includes(id));
      allowed.forEach((id) => {
        if (!filtered.includes(id)) filtered.push(id);
      });
      updateData.gatewayOrder = filtered;
    }

    if (zaakpayMode && ["test", "live"].includes(zaakpayMode)) {
      updateData.zaakpayMode = zaakpayMode;
    }
    if (hdfcMode && ["test", "live"].includes(hdfcMode)) {
      updateData.hdfcMode = hdfcMode;
    }
    if (sabpaisaMode && ["test", "live"].includes(sabpaisaMode)) {
      updateData.sabpaisaMode = sabpaisaMode;
    }

    let config = await PaymentConfig.findOne();
    if (!config) {
      config = new PaymentConfig(updateData);
    } else {
      Object.assign(config, updateData);
    }

    await config.save();

    const activeSabMode = config.sabpaisaMode || "test";
    const activeSabCfg = getSabpaisaConfig(activeSabMode);

    const finalRawVis = (config.visibility && (config.visibility.toObject ? config.visibility.toObject() : config.visibility)) || {};
    const finalVisibility = {
      razorpay: {
        app: finalRawVis.razorpay?.app !== false,
        web: finalRawVis.razorpay?.web !== false,
      },
      zaakpay: {
        app: finalRawVis.zaakpay?.app !== false,
        web: finalRawVis.zaakpay?.web !== false,
      },
      hdfc: {
        app: finalRawVis.hdfc?.app !== false,
        web: finalRawVis.hdfc?.web !== false,
      },
      sabpaisa: {
        app: finalRawVis.sabpaisa?.app !== false,
        web: finalRawVis.sabpaisa?.web !== false,
      },
    };

    return res.status(200).json({
      success: true,
      message: "Payment gateway settings updated successfully",
      data: {
        razorpayEnabled: config.razorpayEnabled,
        zaakpayEnabled: config.zaakpayEnabled,
        hdfcEnabled: config.hdfcEnabled,
        sabpaisaEnabled: config.sabpaisaEnabled,
        visibility: finalVisibility,
        defaultGateway: config.defaultGateway,
        gatewayOrder: config.gatewayOrder || ["razorpay", "zaakpay", "hdfc", "sabpaisa"],
        zaakpayMode: config.zaakpayMode,
        hdfcMode: config.hdfcMode,
        sabpaisaMode: activeSabMode,
        razorpayKeyConfigured: !!process.env.RAZORPAY_KEY_ID,
        zaakpayKeyConfigured: !!(process.env.ZAAKPAY_MERCHANT_ID && process.env.ZAAKPAY_SECRET_KEY),
        hdfcKeyConfigured: !!(process.env.HDFC_MERCHANT_ID && process.env.HDFC_MERCHANT_KEY),
        sabpaisaKeyConfigured: isSabpaisaConfigured(activeSabMode),
        sabpaisaMerchantId: activeSabCfg.merchantId,
        sabpaisaBaseUrl: activeSabCfg.baseUrl,
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
