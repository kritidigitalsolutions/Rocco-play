const { HDFC_CONFIG, createHdfcSession, getHdfcOrderStatus } = require("../config/hdfc");
const HdfcOrder = require("../models/hdfcOrder.model");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");

const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

// Non-terminal statuses — order is still in progress, don't mark as failed yet
const NON_TERMINAL_STATUSES = ["NEW", "PENDING", "PENDING_VBV"];

// =====================================================
// INITIATE HDFC TRANSACTION
// =====================================================
exports.initiatePayment = async (req, res) => {
  try {
    const { planId, promoCode } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    const config = await PaymentConfig.getConfig();
    if (!config.hdfcEnabled) {
      return res.status(403).json({
        success: false,
        message: "HDFC Payment Gateway is currently disabled by administrator",
      });
    }

    if (!HDFC_CONFIG.merchantId || !HDFC_CONFIG.keyId) {
      return res.status(503).json({ success: false, message: "HDFC JWE credentials not configured on server" });
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

    // HDFC requires order_id < 21 chars, alphanumeric, non-sequential
    const orderId = `HDFC${Date.now().toString().slice(-10)}${Math.floor(100 + Math.random() * 900)}`;

    await HdfcOrder.create({
      orderId,
      user: userId,
      plan: planId,
      promoCode: appliedPromo,
      amount: finalAmount,
      vpa: HDFC_CONFIG.vpa,
      status: "initiated",
    });

    const sessionData = await createHdfcSession({
      orderId,
      amount: finalAmount,
      customerId: userId,
      customerEmail: buyerEmail,
      customerPhone: buyerPhoneNumber,
      firstName: buyerFirstName,
      description: plan.name || "Subscription Plan",
      returnUrl: HDFC_CONFIG.returnUrl,
    });

    console.log("HDFC Session Response (full):", JSON.stringify(sessionData, null, 2));

    return res.status(200).json({
      success: true,
      message: "HDFC Bank payment initiated",
      paymentUrl: sessionData.payment_links?.web || null,
      sdkPayload: sessionData.sdk_payload || null, // Required by HyperCheckout Flutter SDK
      orderId,
      finalAmount,
    });
  } catch (err) {
    console.error("HDFC Initiate Payment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// HANDLE HDFC CALLBACK (return_url redirect + webhook)
// Always confirms via server-to-server Order Status API —
// never trusts the redirect/webhook payload directly.
// =====================================================
exports.handleCallback = async (req, res) => {
  try {
    const rawData = { ...req.query, ...req.body };
    console.log("HDFC Callback Raw Data Received:", rawData);

    const orderId = rawData.order_id || rawData.orderId;

    if (!orderId) {
      console.error("HDFC Callback: no order_id in payload");
      return res.status(200).send(_buildStatusHtml(true, "Payment received", ""));
    }

    const orderRecord = await HdfcOrder.findOne({ orderId });
    if (!orderRecord) {
      console.error("HDFC Callback: No matching HdfcOrder found for", orderId);
      return res.status(200).send(_buildStatusHtml(true, "Payment received", orderId));
    }

    // Ground truth — confirm with HDFC directly via SDK
    const statusData = await getHdfcOrderStatus(orderId);
    console.log("HDFC Order Status Response:", statusData);

    const isSuccess = statusData?.status === "CHARGED";

    if (!isSuccess) {
      if (statusData?.status && !NON_TERMINAL_STATUSES.includes(statusData.status)) {
        orderRecord.status = "failed";
        await orderRecord.save();
      }
      return res.status(200).send(_buildStatusHtml(false, `Payment ${statusData?.status || "not successful"}`, orderId));
    }

    // Duplicate guard
    const transactionId = statusData.txn_id || statusData.id || `HDFCTXN_${Date.now()}`;
    const existingSub = await Subscription.findOne({
      $or: [{ paymentId: transactionId }, { subscriptionId: orderId }],
    });
    if (existingSub) {
      console.log("HDFC Subscription already exists:", existingSub._id);
      return res.status(200).send(_buildStatusHtml(true, "Subscription already activated", orderId));
    }

    const { user: userId, plan: planId, promoCode } = orderRecord;

    const plan = await Plan.findById(planId);
    if (!plan) {
      console.error("HDFC Callback: Plan not found:", planId);
      return res.status(200).send(_buildStatusHtml(true, "Payment successful", orderId));
    }

    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (promo) {
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

    const finalAmount = statusData.amount ? Number(statusData.amount) : (orderRecord.amount || plan.price);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      status: "active",
      paymentGateway: "hdfc",
      paymentId: transactionId,
      subscriptionId: orderId,
      amount: finalAmount,
      currency: "INR",
      startDate,
      endDate,
    });

    orderRecord.status = "completed";
    await orderRecord.save();

    console.log("✅ HDFC Subscription Successfully Created:", subscription._id, "for Order:", orderId);

    return res.status(200).send(_buildStatusHtml(true, "Payment successful! Your subscription is active.", orderId));
  } catch (err) {
    console.error("HDFC Callback Exception:", err);
    return res.status(200).send(_buildStatusHtml(true, "Payment processed", ""));
  }
};

// =====================================================
// CHECK HDFC TRANSACTION STATUS (FOR CLIENT / APP)
// =====================================================
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    let subscription = await Subscription.findOne({
      $or: [{ subscriptionId: orderId }, { paymentId: orderId }],
    }).populate("plan", "name duration price");

    if (!subscription) {
      const orderRecord = await HdfcOrder.findOne({ orderId });

      if (orderRecord && orderRecord.status !== "completed") {
        const statusData = await getHdfcOrderStatus(orderId).catch((err) => {
          console.error("Status poll failed:", err.message);
          return null;
        });

        if (statusData?.status === "CHARGED") {
          const plan = await Plan.findById(orderRecord.plan);
          if (plan) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

            subscription = await Subscription.create({
              user: orderRecord.user,
              plan: plan._id,
              status: "active",
              paymentGateway: "hdfc",
              paymentId: statusData.txn_id || statusData.id || `HDFCTXN_${Date.now()}`,
              subscriptionId: orderId,
              amount: orderRecord.amount || plan.price,
              currency: "INR",
              startDate,
              endDate,
            });

            orderRecord.status = "completed";
            await orderRecord.save();

            subscription = await Subscription.findById(subscription._id).populate("plan", "name duration price");
            console.log("✅ Fulfilled HDFC Subscription via Order Status check for Order:", orderId);
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
    console.error("Check HDFC Status Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper HTML status page
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