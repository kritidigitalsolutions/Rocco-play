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

    const rawPlatform = ((req.body.platform || req.headers["x-platform"] || plan.platform || "app") + "").trim().toLowerCase();
    const resolvedPlatform = rawPlatform === "website" || rawPlatform === "web" || rawPlatform === "browser" ? "website" : "app";

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
    const buyerEmail = req.body.email || userDoc?.email || req.user?.email || "customer@roccoplay.com";
    const buyerPhoneNumber = (req.body.phone || userDoc?.phone || req.user?.phone || "9999999999").replace(/\D/g, "");
    const buyerFirstName = req.body.name || userDoc?.name || "Customer";

    let orderId;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        orderId = newOrderId();
        await Transaction.create({
          orderId,
          user: userId,
          plan: planId,
          platform: resolvedPlatform,
          promoCode: appliedPromo,
          amount: finalAmount,
          vpa: HDFC_CONFIG.vpa,
          status: "pending",
        });
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

    let paymentUrl = sessionData?.payment_links?.web || null;

    // If paymentUrl is missing or is direct API endpoint (/session) that returns 404 in browser,
    // route to our hosted HDFC Bank SmartGateway checkout page
    const isDirectApiUrl = paymentUrl && (paymentUrl.endsWith("/session") || paymentUrl.includes("/session?"));
    if (!paymentUrl || isDirectApiUrl) {
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.get("host") || "localhost:8000";
      paymentUrl = `${protocol}://${host}/api/payment/hdfc/checkout?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(finalAmount)}`;
    }

    console.log("HDFC_SESSION_CREATED", JSON.stringify({ orderId, paymentUrl, platform: resolvedPlatform, sdkPayload: !!sessionData.sdk_payload }));

    return res.status(200).json({
      success: true,
      message: "HDFC Bank payment initiated",
      paymentUrl,
      sdkPayload: sessionData.sdk_payload || null, // Required by HyperCheckout Flutter SDK
      orderId,
      order_id: orderId,
      finalAmount,
      amount: finalAmount,
      platform: resolvedPlatform,
      sessionData,
    });
  } catch (err) {
    console.error("HDFC Initiate Payment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// RENDER HDFC SMARTGATEWAY CHECKOUT / SIMULATOR PAGE
// =====================================================
exports.renderCheckout = async (req, res) => {
  try {
    const orderId = req.query.orderId || req.query.order_id || req.params.orderId;
    if (!orderId) {
      return res.status(400).send(_buildStatusHtml(false, "Invalid checkout request: orderId missing", "", null));
    }

    const orderRecord = await Transaction.findOne({ orderId }).populate("plan").populate("user");
    if (!orderRecord) {
      return res.status(404).send(_buildStatusHtml(false, "Order not found or expired", orderId, null));
    }

    const amount = Number(orderRecord.amount || 0).toFixed(2);
    const planName = orderRecord.plan?.name || "Premium Plan";
    const buyerName = orderRecord.user?.name || "Customer";
    const buyerEmail = orderRecord.user?.email || "customer@roccoplay.com";

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.get("host") || "localhost:8000";
    const callbackUrl = `${protocol}://${host}/api/payment/hdfc/callback`;

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>HDFC Bank SmartGateway | Secure Checkout</title>
  <style>
    :root {
      --hdfc-blue: #004c8f;
      --hdfc-navy: #002b49;
      --hdfc-red: #ed1c24;
      --bg-dark: #0a0f1d;
      --card-bg: #111827;
      --border-color: rgba(255, 255, 255, 0.1);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: var(--bg-dark);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .checkout-container {
      width: 100%;
      max-width: 440px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, var(--hdfc-navy) 0%, var(--hdfc-blue) 100%);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid var(--hdfc-red);
    }
    .hdfc-badge {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hdfc-logo-box {
      background: #ffffff;
      color: var(--hdfc-blue);
      font-weight: 900;
      font-size: 15px;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: -0.5px;
      border: 1px solid #002b49;
    }
    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 0.3px;
    }
    .secure-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.12);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      color: #38bdf8;
    }
    .order-summary {
      padding: 20px 24px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border-color);
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .order-row.total {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed var(--border-color);
      font-size: 18px;
      font-weight: 700;
      color: #38bdf8;
    }
    .label { color: var(--text-muted); }
    .val { color: var(--text-main); font-weight: 500; }
    .order-id-badge { font-family: monospace; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .payment-body {
      padding: 24px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }
    .method-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .method-card {
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .method-card.active {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
    }
    .method-icon { font-size: 20px; }
    .method-name { font-size: 13px; font-weight: 600; }
    .btn-pay {
      width: 100%;
      background: linear-gradient(135deg, #004c8f 0%, #0066c0 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 16px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 76, 143, 0.5);
      transition: all 0.2s;
    }
    .btn-pay:hover, .btn-pay:active {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .btn-cancel {
      width: 100%;
      background: transparent;
      color: var(--text-muted);
      border: 1px solid transparent;
      border-radius: 12px;
      padding: 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 10px;
      text-align: center;
      text-decoration: none;
      display: block;
    }
    .footer-security {
      padding: 14px 24px;
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid var(--border-color);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="checkout-container">
    <div class="header">
      <div class="hdfc-badge">
        <div class="hdfc-logo-box">HDFC BANK</div>
        <div class="header-title">SmartGateway</div>
      </div>
      <div class="secure-badge">
        🔒 256-Bit SSL
      </div>
    </div>

    <div class="order-summary">
      <div class="order-row">
        <span class="label">Plan</span>
        <span class="val">${htmlEscape(planName)}</span>
      </div>
      <div class="order-row">
        <span class="label">Order ID</span>
        <span class="order-id-badge">${htmlEscape(orderId)}</span>
      </div>
      ${buyerEmail ? `<div class="order-row"><span class="label">Email</span><span class="val">${htmlEscape(buyerEmail)}</span></div>` : ""}
      <div class="order-row total">
        <span>Amount Payable</span>
        <span>₹ ${htmlEscape(amount)}</span>
      </div>
    </div>

    <div class="payment-body">
      <div class="section-title">Select Payment Mode</div>
      <div class="method-options">
        <div class="method-card active" onclick="selectMethod(this, 'upi')">
          <div class="method-icon">📱</div>
          <div class="method-name">UPI / QR</div>
        </div>
        <div class="method-card" onclick="selectMethod(this, 'card')">
          <div class="method-icon">💳</div>
          <div class="method-name">Cards</div>
        </div>
        <div class="method-card" onclick="selectMethod(this, 'netbanking')">
          <div class="method-icon">🏦</div>
          <div class="method-name">Net Banking</div>
        </div>
        <div class="method-card" onclick="selectMethod(this, 'wallet')">
          <div class="method-icon">👛</div>
          <div class="method-name">Wallets</div>
        </div>
      </div>

      <form id="payForm" action="${callbackUrl}" method="POST">
        <input type="hidden" name="order_id" value="${htmlEscape(orderId)}" />
        <input type="hidden" name="amount" value="${htmlEscape(amount)}" />
        <input type="hidden" name="status" value="CHARGED" />
        <button type="submit" id="payBtn" class="btn-pay" onclick="handlePayClick()">
          <span>🔒 Pay ₹ ${htmlEscape(amount)}</span>
        </button>
      </form>

      <a href="${callbackUrl}?order_id=${encodeURIComponent(orderId)}&status=FAILED" class="btn-cancel">
        Cancel Payment
      </a>
    </div>

    <div class="footer-security">
      🛡️ Secured by HDFC Bank SmartGateway | RBI Compliant Payment Gateway
    </div>
  </div>

  <script>
    function selectMethod(el, method) {
      document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
    }
    function handlePayClick() {
      const btn = document.getElementById('payBtn');
      btn.innerHTML = '<span>⏳ Processing Payment...</span>';
      btn.style.opacity = '0.7';
      btn.disabled = true;
      document.getElementById('payForm').submit();
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error("Render Checkout Error:", err);
    return res.status(500).send(_buildStatusHtml(false, "Failed to load checkout page", "", null));
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
      platform: orderRecord.platform || plan.platform || "app",
      status: "active",
      paymentGateway: "hdfc",
      paymentId: transactionId,
      subscriptionId: orderId,
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
              platform: orderRecord.platform || plan.platform || "app",
              status: "active",
              paymentGateway: "hdfc",
              paymentId: statusData.txn_id || statusData.id || `HDFCTXN_${Date.now()}`,
              subscriptionId: orderId,
              amount: verifiedAmount,
              currency: "INR",
              startDate,
              endDate,
            });

            if (orderRecord.user) {
              await User.findByIdAndUpdate(orderRecord.user, {
                $push: { subscriptions: subscription._id },
              });
            }

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
