const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { HDFC_CONFIG, createHdfcSession, getHdfcOrderStatus } = require("../config/hdfc");
const Transaction = require("../models/transaction.model");
const HdfcStatusLog = require("../models/hdfcStatusLog.model");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");

const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

// Non-terminal statuses — order is still in progress, don't mark as failed yet
const NON_TERMINAL_STATUSES = ["NEW", "PENDING", "PENDING_VBV"];

function newOrderId() {
  // 19 characters, alphanumeric, cryptographically random (never a counter).
  return `HDFC${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
}

function safeValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(safeValue);
  const hidden = /token|key|secret|signature|authorization|email|phone|card|vpa/i;
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, hidden.test(key) ? "[MASKED]" : safeValue(val)]));
}

function logStatus(orderId, event, request, response, error) {
  const entry = { orderId, event, request: safeValue(request), response: safeValue(response), error: error?.message || error || null };
  console.log("HDFC_STATUS_API_LOG", JSON.stringify(entry));
  return HdfcStatusLog.create(entry).catch((e) => console.error("HDFC status log persistence failed:", e.message));
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

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
    if (!HDFC_CONFIG.returnUrl || !/^https:\/\//i.test(HDFC_CONFIG.returnUrl)) {
      return res.status(503).json({ success: false, message: "A valid HTTPS HDFC return URL is not configured" });
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

    let orderId;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        orderId = newOrderId();
        await Transaction.create({ orderId, user: userId, plan: planId, promoCode: appliedPromo, amount: finalAmount, vpa: HDFC_CONFIG.vpa, status: "pending" });
        break;
      } catch (e) {
        if (e.code !== 11000 || attempt === 2) throw e;
      }
    }

    if (!/^\w{1,20}$/.test(orderId)) throw new Error("Generated invalid HDFC order ID");

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

    console.log("HDFC_SESSION_CREATED", JSON.stringify({ orderId, paymentLink: !!sessionData.payment_links?.web, sdkPayload: !!sessionData.sdk_payload }));

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
    console.log("HDFC_CALLBACK_RECEIVED", JSON.stringify(safeValue(rawData)));

    const orderId = String(rawData.order_id || rawData.orderId || "");

    if (!orderId || !/^[A-Za-z0-9]{1,20}$/.test(String(orderId))) {
      console.error("HDFC Callback: no order_id in payload");
      return res.status(400).send(_buildStatusHtml(false, "Unable to verify payment", "", null));
    }

    const orderRecord = await Transaction.findOne({ orderId });
    if (!orderRecord) {
      console.error("HDFC Callback: No matching Transaction found for", orderId);
      return res.status(404).send(_buildStatusHtml(false, "Unable to verify payment", orderId, null));
    }

    // Ground truth — confirm with HDFC directly via SDK
    let statusData;
    try {
      statusData = await getHdfcOrderStatus(orderId);
      await logStatus(orderId, "order_status", { order_id: orderId }, statusData);
    } catch (e) {
      await logStatus(orderId, "order_status", { order_id: orderId }, null, e);
      return res.status(200).send(_buildStatusHtml(false, "Payment status is pending verification. Please do not retry.", orderId, orderRecord.amount));
    }

    const isSuccess = statusData?.status === "CHARGED";

    if (!isSuccess) {
      if (statusData?.status && !NON_TERMINAL_STATUSES.includes(statusData.status)) {
        orderRecord.status = "failed";
        orderRecord.transactionId = statusData?.txn_id || statusData?.id || null;
        await orderRecord.save();
      }
      return res.status(200).send(_buildStatusHtml(false, `Payment ${statusData?.status || "not successful"}`, orderId, orderRecord.amount));
    }

    // Duplicate guard
    const transactionId = statusData.txn_id || statusData.id || `HDFCTXN_${Date.now()}`;
    const existingSub = await Subscription.findOne({
      $or: [{ paymentId: transactionId }, { subscriptionId: orderId }],
    });
    if (existingSub) {
      console.log("HDFC Subscription already exists:", existingSub._id);
      return res.status(200).send(_buildStatusHtml(true, "Subscription already activated", orderId, existingSub.amount));
    }

    const { user: userId, plan: planId, promoCode } = orderRecord;

    const plan = await Plan.findById(planId);
    if (!plan) {
      console.error("HDFC Callback: Plan not found:", planId);
      return res.status(500).send(_buildStatusHtml(false, "Payment received but could not be fulfilled. Support has been notified.", orderId, orderRecord.amount));
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

    const finalAmount = Number(statusData.amount);
    if (!Number.isFinite(finalAmount) || Math.abs(finalAmount - Number(orderRecord.amount)) > 0.01) {
      orderRecord.status = "failed";
      orderRecord.transactionId = statusData?.txn_id || statusData?.id || null;
      await orderRecord.save();
      await logStatus(orderId, "amount_mismatch", { expected: orderRecord.amount }, statusData);
      return res.status(200).send(_buildStatusHtml(false, "Payment amount could not be verified.", orderId, orderRecord.amount));
    }

    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (promo) {
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
      }
    }

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

    orderRecord.status = "success";
    orderRecord.transactionId = transactionId;
    await orderRecord.save();

    console.log("✅ HDFC Subscription Successfully Created:", subscription._id, "for Order:", orderId);

    return res.status(200).send(_buildStatusHtml(true, "Payment successful! Your subscription is active.", orderId, finalAmount));
  } catch (err) {
    console.error("HDFC Callback Exception:", err);
    return res.status(200).send(_buildStatusHtml(false, "Payment status could not be verified. Please contact support.", "", null));
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
    if (!/^[A-Za-z0-9]{1,20}$/.test(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid orderId format" });
    }

    const orderRecord = await Transaction.findOne({ orderId });
    const userId = req.user?.id || req.user?._id;
    if (!orderRecord || String(orderRecord.user) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    let subscription = await Subscription.findOne({
      $or: [{ subscriptionId: orderId }, { paymentId: orderId }],
      user: userId,
    }).populate("plan", "name duration price");

    if (!subscription) {
      if (orderRecord && orderRecord.status !== "success") {
        let statusData = null;
        try {
          statusData = await getHdfcOrderStatus(orderId);
          await logStatus(orderId, "client_status_poll", { order_id: orderId }, statusData);
        } catch (err) {
          await logStatus(orderId, "client_status_poll", { order_id: orderId }, null, err);
        }

        if (statusData?.status === "CHARGED") {
          const plan = await Plan.findById(orderRecord.plan);
          const verifiedAmount = Number(statusData.amount);
          if (plan && Number.isFinite(verifiedAmount) && Math.abs(verifiedAmount - Number(orderRecord.amount)) <= 0.01) {
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
              amount: verifiedAmount,
              currency: "INR",
              startDate,
              endDate,
            });

            orderRecord.status = "success";
            orderRecord.transactionId = statusData.txn_id || statusData.id || null;
            await orderRecord.save();

            subscription = await Subscription.findById(subscription._id).populate("plan", "name duration price");
            console.log("✅ Fulfilled HDFC Subscription via Order Status check for Order:", orderId);
          }
        }
      }
    }

    const responsePayload = {
      orderId,
      amount: subscription ? subscription.amount : orderRecord.amount,
      status: subscription ? "success" : orderRecord.status,
    };
    const jwtToken = jwt.sign(responsePayload, HDFC_CONFIG.jwtSecret, { algorithm: "HS256" });

    if (!subscription) {
      return res.status(202).json({
        success: false,
        message: "Payment is pending verification",
        orderId,
        amount: orderRecord.amount,
        jwtToken,
      });
    }

    return res.status(200).json({
      success: true,
      status: subscription.status,
      orderId,
      amount: subscription.amount,
      message: "Payment successful",
      receipt: {
        receiptNumber: subscription.paymentId,
        orderNumber: orderId,
        amount: subscription.amount,
        currency: subscription.currency,
        issuedAt: subscription.createdAt,
      },
      subscription,
      jwtToken,
    });
  } catch (err) {
    console.error("Check HDFC Status Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper HTML status page
function _buildStatusHtml(isSuccess, message, orderId, amount) {
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
    <p>${htmlEscape(message)}</p>
    ${orderId ? `<p>Order Number: <span class="order-id">${htmlEscape(orderId)}</span></p>` : ""}
    ${amount !== null && amount !== undefined ? `<p>Amount: <span class="order-id">INR ${htmlEscape(Number(amount).toFixed(2))}</span></p>` : ""}
  </div>
  <script>
    if (window.location.search.indexOf('status=') === -1) {
      window.history.replaceState({}, '', window.location.pathname + '?status=${statusParam}&orderId=${encodeURIComponent(orderId || '')}');
    }
  </script>
</body>
</html>`;
}
