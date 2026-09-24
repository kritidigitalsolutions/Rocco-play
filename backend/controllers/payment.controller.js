const crypto = require("crypto");

const razorpay = require("../config/razorpay");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");

// =====================================================
// GET ACTIVE PAYMENT GATEWAYS (PUBLIC/USER API)
// =====================================================
exports.getActiveGateways = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();

    let rzpEnabled = Boolean(config.razorpayEnabled && razorpay);
    let zaakEnabled = Boolean(
      config.zaakpayEnabled &&
        process.env.ZAAKPAY_MERCHANT_ID &&
        process.env.ZAAKPAY_SECRET_KEY
    );
    let hdfcEnabled = Boolean(
      config.hdfcEnabled &&
        process.env.HDFC_MERCHANT_ID &&
        process.env.HDFC_MERCHANT_KEY
    );
    let sabpaisaEnabled = Boolean(
      config.sabpaisaEnabled &&
        process.env.SABPAISA_API_KEY &&
        process.env.SABPAISA_SECRET_KEY &&
        process.env.SABPAISA_MERCHANT_ID &&
        process.env.SABPAISA_RETURN_URL
    );

    // Standard list of supported gateway IDs
    const allGatewayIds = ["razorpay", "zaakpay", "hdfc", "sabpaisa"];

    // Retrieve configured gateway order from admin settings
    let configuredOrder = Array.isArray(config.gatewayOrder) ? [...config.gatewayOrder] : [];
    // Ensure all standard gateways are included
    allGatewayIds.forEach((id) => {
      if (!configuredOrder.includes(id)) {
        configuredOrder.push(id);
      }
    });
    // Filter out any invalid IDs
    configuredOrder = configuredOrder.filter((id) => allGatewayIds.includes(id));

    // Gateway dictionary definitions
    const gatewayDetails = {
      razorpay: {
        id: "razorpay",
        name: "Razorpay",
        enabled: rzpEnabled,
        key: rzpEnabled ? process.env.RAZORPAY_KEY_ID : null,
      },
      zaakpay: {
        id: "zaakpay",
        name: "Zaakpay",
        enabled: zaakEnabled,
        mode: config.zaakpayMode || "test",
      },
      hdfc: {
        id: "hdfc",
        name: "HDFC Bank (SmartGateway)",
        enabled: hdfcEnabled,
        mode: config.hdfcMode || "test",
        vpa: process.env.HDFC_VPA || "roccoplaywork@hdfcbank",
        storeName: process.env.HDFC_STORE_NAME || "ROCCOPLAY MEDIA",
      },
      sabpaisa: {
        id: "sabpaisa",
        name: "SabPaisa",
        enabled: sabpaisaEnabled,
        mode: config.sabpaisaMode || process.env.SABPAISA_MODE || "test",
      },
    };

    // Build ordered list of all gateways with 1-based priority and 0-based index
    const orderedGateways = configuredOrder.map((id, idx) => {
      const g = gatewayDetails[id];
      return {
        ...g,
        priority: idx + 1, // 1st, 2nd, 3rd, 4th
        index: idx,        // 0, 1, 2, 3
      };
    });

    // Active (enabled) gateways in priority sequence
    const activeOrderedGateways = orderedGateways.filter((g) => g.enabled);

    // Build dictionary maintaining priority insertion order
    const gatewaysDict = {};
    orderedGateways.forEach((g) => {
      gatewaysDict[g.id] = g;
    });

    // Default gateway selection:
    // If admin set defaultGateway and it is enabled, use it; otherwise fallback to highest priority active gateway
    let defaultGateway = config.defaultGateway;
    if (defaultGateway && !gatewayDetails[defaultGateway]?.enabled) {
      defaultGateway = null;
    }
    if (!defaultGateway && activeOrderedGateways.length > 0) {
      defaultGateway = activeOrderedGateways[0].id;
    }
    if (!defaultGateway) {
      defaultGateway = configuredOrder[0] || "razorpay";
    }

    return res.status(200).json({
      success: true,
      defaultGateway,
      gatewayOrder: configuredOrder,
      orderedGateways,
      activeOrderedGateways,
      gateways: gatewaysDict,
    });
  } catch (err) {
    console.error("Get Active Gateways Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



// =====================================================
// CREATE ORDER
// =====================================================
exports.createOrder = async (
  req,
  res
) => {
  try {

    const {
      planId,
      promoCode,
    } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId required",
      });
    }

    const plan =
      await Plan.findById(planId);

    if (
      !plan ||
      !plan.isActive
    ) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    let finalAmount = plan.price;

    let appliedPromo = null;

    // ========================================
    // APPLY PROMO
    // ========================================

    if (promoCode) {

      const promo =
        await Promo.findOne({
          code:
            promoCode.toUpperCase(),
          isActive: true,
        });

      if (!promo) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid promo code",
        });
      }

      // promo expired
      if (
        promo.expiryDate &&
        promo.expiryDate <
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Promo expired",
        });
      }

      // promo limit
      if (
        promo.usedCount >=
        promo.maxUses
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promo limit reached",
        });
      }

      // applicable plans
      if (
        promo.applicablePlans
          .length &&
        !promo.applicablePlans.some(
          (id) =>
            id.toString() ===
            planId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promo not valid for this plan",
        });
      }

      let discount = 0;

      if (
        promo.discountType ===
        "percentage"
      ) {

        discount =
          (
            plan.price *
            promo.discountValue
          ) / 100;

      } else {

        discount =
          promo.discountValue;
      }

      finalAmount = Math.max(
        plan.price - discount,
        0
      );

      appliedPromo = promo.code;
    }

    const userId = req.user?.id || req.user?._id;
    const rawPlatform = ((req.body.platform || req.headers["x-platform"] || plan.platform || "app") + "").trim().toLowerCase();
    const resolvedPlatform = rawPlatform === "website" || rawPlatform === "web" || rawPlatform === "browser" ? "website" : "app";

    // Check existing active subscription for this platform before creating order
    const platformFilter = [{ platform: resolvedPlatform }];
    if (resolvedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let existing = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    }).sort({ createdAt: -1 });

    if (existing) {
      existing = await expireSubscriptionIfNeeded(existing);

      if (existing && existing.status === "active") {
        return res.status(400).json({
          success: false,
          platform: resolvedPlatform,
          message: `You already have an active ${resolvedPlatform === "website" ? "website" : "mobile app"} subscription`,
        });
      }
    }

    // ========================================
    // RAZORPAY CONFIG & ENABLEMENT CHECK
    // ========================================

    const config = await PaymentConfig.getConfig();
    if (!config.razorpayEnabled) {
      return res.status(403).json({
        success: false,
        message: "Razorpay payment gateway is currently disabled by administrator",
      });
    }

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message:
          "Payment gateway not configured",
      });
    }

    // ========================================
    // CREATE ORDER
    // ========================================

    const amountInPaise = Math.round(finalAmount * 100);

    const order =
      await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt:
          "rcpt_" + Date.now(),

        notes: {
          planId: String(planId),
          userId: String(userId),
          promoCode:
            appliedPromo || "",
        },
      });

    res.status(200).json({
      success: true,
      key:
        process.env
          .RAZORPAY_KEY_ID,
      order,
      finalAmount,
    });

  } catch (err) {

    console.error(
      "Create Order Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// VERIFY PAYMENT
// =====================================================
exports.verifyPayment = async (
  req,
  res
) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required payment fields",
      });
    }

    // ========================================
    // VERIFY SIGNATURE
    // ========================================

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET
        )
        .update(body)
        .digest("hex");

    if (
      expectedSignature !==
      razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification failed",
      });
    }

    const userId = req.user?.id || req.user?._id;

    // ========================================
    // PREVENT DUPLICATE PAYMENT
    // ========================================

    const alreadyPaid =
      await Subscription.findOne({
        paymentId:
          razorpay_payment_id,
      });

    if (alreadyPaid) {
      return res.status(200).json({
        success: true,
        message:
          "Payment already processed",
        subscription:
          alreadyPaid,
      });
    }

    // ========================================
    // GET PLAN
    // ========================================

    const plan =
      await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const rawPlatform = ((req.body.platform || req.headers["x-platform"] || plan.platform || "app") + "").trim().toLowerCase();
    const resolvedPlatform = rawPlatform === "website" || rawPlatform === "web" || rawPlatform === "browser" ? "website" : "app";

    // ========================================
    // EXPIRE PREVIOUS ACTIVE SUBSCRIPTION FOR PLATFORM
    // ========================================

    const platformFilter = [{ platform: resolvedPlatform }];
    if (resolvedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let existing =
      await Subscription.findOne({
        user: userId,
        status: "active",
        $or: platformFilter,
      }).sort({ createdAt: -1 });

    if (existing) {
      existing =
        await expireSubscriptionIfNeeded(
          existing
        );

      if (
        existing &&
        existing.status ===
          "active"
      ) {
        existing.status = "expired";
        await existing.save();
      }
    }

    // ========================================
    // RAZORPAY CHECK & FETCH ORDER DETAILS
    // ========================================

    let finalAmount = plan.price;
    let appliedCode = "";

    if (razorpay) {
      try {
        const orderDetails =
          await razorpay.orders.fetch(
            razorpay_order_id
          );

        appliedCode =
          orderDetails?.notes
            ?.promoCode || "";
      } catch (orderFetchErr) {
        console.warn("Razorpay order fetch note:", orderFetchErr.message);
      }
    }

    // ========================================
    // APPLY PROMO
    // ========================================

    if (appliedCode) {

      const promo =
        await Promo.findOne({
          code:
            appliedCode.toUpperCase(),
          isActive: true,
        });

      if (promo) {

        let discount = 0;

        if (
          promo.discountType ===
          "percentage"
        ) {

          discount =
            (
              plan.price *
              promo.discountValue
            ) / 100;

        } else {
          discount = promo.discountValue;
        }

        finalAmount = Math.max(plan.price - discount, 0);

        promo.usedCount += 1;
        await promo.save();
      }
    }

    // ========================================
    // CREATE SUBSCRIPTION
    // ========================================
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (plan.duration || 30));

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      platform: resolvedPlatform,
      status: "active",
      paymentGateway: "razorpay",
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_order_id,
      amount: finalAmount,
      currency: "INR",
      startDate,
      endDate,
    });

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: { subscriptions: subscription._id },
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified",
      subscription,
    });
  } catch (err) {
    console.error("Verify Payment Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
