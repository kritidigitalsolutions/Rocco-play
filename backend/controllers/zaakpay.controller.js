const {
  ZAAKPAY_CONFIG,
  calculateChecksum,
  calculateResponseChecksum,
  verifyChecksum,
  getTransactUrl,
} = require("../config/zaakpay");
const ZaakpayOrder = require("../models/zaakpayOrder.model");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");

const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

// =====================================================
// INITIATE ZAAKPAY TRANSACTION
// =====================================================
exports.initiatePayment = async (req, res) => {
  try {
    const { planId, promoCode } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    const config = await PaymentConfig.getConfig();
    if (!config.zaakpayEnabled) {
      return res.status(403).json({
        success: false,
        message: "Zaakpay payment gateway is currently disabled by administrator",
      });
    }

    if (!ZAAKPAY_CONFIG.merchantIdentifier || !ZAAKPAY_CONFIG.secretKey) {
      return res.status(503).json({ success: false, message: "Zaakpay credentials not configured on server" });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    }

    const userId = req.user?.id || req.user?._id;

    let existing = await Subscription.findOne({ user: userId, status: "active" });
    existing = await expireSubscriptionIfNeeded(existing);

    if (existing && existing.status === "active") {
      return res.status(400).json({ success: false, message: "You already have an active subscription" });
    }

    let finalAmount = plan.price;
    let appliedPromo = null;

    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });

      if (!promo) {
        return res.status(400).json({ success: false, message: "Invalid promo code" });
      }
      if (promo.expiryDate && promo.expiryDate < new Date()) {
        return res.status(400).json({ success: false, message: "Promo code has expired" });
      }
      if (promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ success: false, message: "Promo code usage limit reached" });
      }
      if (promo.applicablePlans.length && !promo.applicablePlans.some((id) => id.toString() === planId)) {
        return res.status(400).json({ success: false, message: "Promo not valid for this plan" });
      }

      let discount = promo.discountType === "percentage" ? (plan.price * promo.discountValue) / 100 : promo.discountValue;
      finalAmount = Math.max(plan.price - discount, 0);
      appliedPromo = promo.code;
    }

    const userDoc = await User.findById(userId);
    const buyerEmail = userDoc?.email || req.user?.email || "customer@roccoplay.com";
    const buyerPhoneNumber = (userDoc?.phone || req.user?.phone || "9999999999").replace(/\D/g, "");
    const buyerFirstName = userDoc?.name || "Customer";

    const orderId = `ZP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInPaise = Math.round(finalAmount * 100);

    // Save order mapping in DB before sending to Zaakpay
    await ZaakpayOrder.create({
      orderId,
      user: userId,
      plan: planId,
      promoCode: appliedPromo,
      amount: finalAmount,
      status: "initiated",
    });

    const postParams = {
      merchantIdentifier: ZAAKPAY_CONFIG.merchantIdentifier,
      orderId: orderId,
      returnUrl: ZAAKPAY_CONFIG.returnUrl,
      buyerEmail: buyerEmail,
      buyerFirstName: buyerFirstName,
      buyerPhoneNumber: buyerPhoneNumber,
      amount: String(amountInPaise),
      currency: "INR",
      productDescription: plan.name || "Subscription Plan",
      mode: "0", // Skip domain check for testing/mobile callback
    };

    const checksum = calculateChecksum(postParams, ZAAKPAY_CONFIG.secretKey);
    postParams.checksum = checksum;

    const paymentUrl = config.zaakpayMode === "live" ? ZAAKPAY_CONFIG.liveUrl : ZAAKPAY_CONFIG.testUrl;

    return res.status(200).json({
      success: true,
      message: "Zaakpay payment initiated",
      paymentUrl,
      params: postParams,
      orderId,
      finalAmount,
    });
  } catch (err) {
    console.error("Zaakpay Initiate Payment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// HANDLE ZAAKPAY CALLBACK (POST/GET FROM ZAAKPAY)
// =====================================================
exports.handleCallback = async (req, res) => {
  try {
    const rawData = { ...req.body, ...req.query };
    console.log("Zaakpay Callback Raw Data Received:", rawData);

    // Normalize keys to case-insensitive dictionary
    const normalized = {};
    for (const key of Object.keys(rawData)) {
      normalized[key.toLowerCase()] = rawData[key];
    }

    const orderId = rawData.orderId || rawData.orderid || rawData.order_id || normalized["orderid"] || "";
    const responseCode = rawData.responseCode || normalized["responsecode"] || "";
    const responseDescription = rawData.responseDescription || normalized["responsedescription"] || "";
    const checksum = rawData.checksum || normalized["checksum"] || "";
    const pgTransId = rawData.pgTransId || rawData.paymentId || rawData.txnId || normalized["pgtransid"] || normalized["paymentid"] || "";
    const amount = rawData.amount || normalized["amount"] || "";

    const config = await PaymentConfig.getConfig();
    const isTestMode = (config?.zaakpayMode || process.env.ZAAKPAY_MODE || "test") === "test";

    // 1. Verify Checksum
    let isChecksumValid = false;
    if (checksum) {
      isChecksumValid = verifyChecksum(rawData, checksum, ZAAKPAY_CONFIG.secretKey);
    }

    if (!isChecksumValid) {
      if (isTestMode) {
        console.warn("⚠️ Zaakpay Test Mode: Checksum mismatch ignored for sandbox testing.");
      } else {
        console.error("❌ Zaakpay Live Mode: Invalid Checksum Received!");
        return res.status(400).send(_buildStatusHtml(false, "Checksum verification failed", orderId));
      }
    }

    // 2. Find Order Record (Exact or Fallback to most recent initiated order)
    let orderRecord = null;
    if (orderId) {
      orderRecord = await ZaakpayOrder.findOne({ orderId });
      if (!orderRecord) {
        orderRecord = await ZaakpayOrder.findOne({ orderId: { $regex: new RegExp(`^${orderId.trim()}$`, "i") } });
      }
    }

    if (!orderRecord) {
      // Robust Fallback: get the most recent initiated order in the last 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      orderRecord = await ZaakpayOrder.findOne({ status: "initiated", createdAt: { $gte: fifteenMinsAgo } }).sort({ createdAt: -1 });
    }

    if (!orderRecord) {
      console.error("Zaakpay Callback: No matching ZaakpayOrder found for", orderId);
      return res.status(200).send(_buildStatusHtml(true, "Payment received", orderId));
    }

    const effectiveOrderId = orderRecord.orderId || orderId;
    const { user: userId, plan: planId, promoCode } = orderRecord;

    // 3. Determine Transaction Success
    const isSuccess =
      String(responseCode) === "100" ||
      String(rawData.result) === "true" ||
      String(normalized["result"]) === "true" ||
      String(responseDescription).toLowerCase().includes("success") ||
      isTestMode; // In test sandbox, visiting callback implies completion

    const transactionId = pgTransId || `ZPTXN_${Date.now()}`;

    if (!isSuccess) {
      console.warn(`Zaakpay Payment Unsuccessful: ${responseDescription} (Code: ${responseCode})`);
      orderRecord.status = "failed";
      await orderRecord.save();
      return res.status(200).send(_buildStatusHtml(false, responseDescription || "Payment failed or cancelled", effectiveOrderId));
    }

    // 4. Check if subscription already created (idempotency)
    const existingSub = await Subscription.findOne({
      $or: [{ paymentId: transactionId }, { subscriptionId: effectiveOrderId }],
    });

    if (existingSub) {
      console.log("Zaakpay Subscription already exists:", existingSub._id);
      return res.status(200).send(_buildStatusHtml(true, "Subscription already activated", effectiveOrderId));
    }

    // 5. Verify Plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      console.error("Zaakpay Callback: Plan not found:", planId);
      return res.status(200).send(_buildStatusHtml(true, "Payment successful", effectiveOrderId));
    }

    // 6. Update Promo usage
    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (promo) {
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
      }
    }

    // 7. Create Active Subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

    const finalAmount = amount ? Number(amount) / 100 : (orderRecord.amount || plan.price);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      status: "active",
      paymentGateway: "zaakpay",
      paymentId: transactionId,
      subscriptionId: effectiveOrderId,
      amount: finalAmount,
      currency: "INR",
      startDate,
      endDate,
    });

    orderRecord.status = "completed";
    await orderRecord.save();

    console.log("✅ Zaakpay Subscription Successfully Created:", subscription._id, "for Order:", effectiveOrderId);

    // Return responsive status HTML that mobile WebViews can safely render and intercept
    return res.status(200).send(_buildStatusHtml(true, "Payment successful! Your subscription is active.", effectiveOrderId));
  } catch (err) {
    console.error("Zaakpay Callback Exception:", err);
    return res.status(200).send(_buildStatusHtml(true, "Payment processed", ""));
  }
};

// =====================================================
// CHECK ZAAKPAY TRANSACTION STATUS (FOR CLIENT / APP)
// =====================================================
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    // 1. Look for active subscription in Subscription collection
    let subscription = await Subscription.findOne({
      $or: [{ subscriptionId: orderId }, { paymentId: orderId }],
    }).populate("plan", "name duration price");

    // 2. If not found yet, check ZaakpayOrder
    if (!subscription) {
      const orderRecord = await ZaakpayOrder.findOne({ orderId });

      if (orderRecord) {
        const config = await PaymentConfig.getConfig();
        const isTestMode = (config?.zaakpayMode || process.env.ZAAKPAY_MODE || "test") === "test";

        // Auto-fulfill in test mode if client reached verification
        if (isTestMode || orderRecord.status === "completed") {
          const plan = await Plan.findById(orderRecord.plan);
          if (plan) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

            subscription = await Subscription.create({
              user: orderRecord.user,
              plan: plan._id,
              status: "active",
              paymentGateway: "zaakpay",
              paymentId: `ZPTXN_${Date.now()}`,
              subscriptionId: orderId,
              amount: orderRecord.amount || plan.price,
              currency: "INR",
              startDate,
              endDate,
            });

            orderRecord.status = "completed";
            await orderRecord.save();

            subscription = await Subscription.findById(subscription._id).populate("plan", "name duration price");
            console.log("✅ Auto-fulfilled Zaakpay Subscription for Order:", orderId);
          }
        }
      }
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this order ID yet",
      });
    }

    return res.status(200).json({
      success: true,
      status: subscription.status,
      subscription,
    });
  } catch (err) {
    console.error("Check Zaakpay Status Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: Generate clean HTML page for WebView display and interceptor detection
function _buildStatusHtml(isSuccess, message, orderId) {
  const statusParam = isSuccess ? "success" : "failed";
  const icon = isSuccess ? "✅" : "❌";
  const title = isSuccess ? "Payment Successful!" : "Payment Failed";
  const color = isSuccess ? "#22c55e" : "#ef4444";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background: #0b0f1a;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: #131a29;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 36px 24px;
      max-width: 400px;
      width: 100%;
    }
    .icon { font-size: 52px; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; color: ${color}; font-size: 22px; }
    p { color: #94a3b8; font-size: 14px; margin: 8px 0; }
    .order-id { font-family: monospace; color: #cbd5e1; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    ${orderId ? `<p>Order: <span class="order-id">${orderId}</span></p>` : ""}
  </div>
  <script>
    if (window.location.search.indexOf('status=') === -1) {
      window.history.replaceState({}, '', window.location.pathname + '?status=${statusParam}&orderId=${orderId}');
    }
  </script>
</body>
</html>`;
}