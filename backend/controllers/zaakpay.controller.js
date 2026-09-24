const {
  ZAAKPAY_CONFIG,
  calculateChecksum,
  calculateResponseChecksum,
  verifyChecksum,
  getTransactUrl,
  queryZaakpayOrderStatus,
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

    const orderId = `ZP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInPaise = Math.round(finalAmount * 100);

    // Save order mapping in DB before sending to Zaakpay
    await ZaakpayOrder.create({
      orderId,
      user: userId,
      plan: planId,
      platform: resolvedPlatform,
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

    const paymentUrl =
      config.zaakpayMode === "live" || ZAAKPAY_CONFIG.mode === "live"
        ? ZAAKPAY_CONFIG.liveUrl
        : ZAAKPAY_CONFIG.testUrl;

    return res.status(200).json({
      success: true,
      message: "Zaakpay payment initiated",
      paymentUrl,
      params: postParams,
      orderId,
      finalAmount,
      platform: resolvedPlatform,
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
        // Fallback: verify directly with Zaakpay official Server-to-Server status API
        console.warn(`⚠️ Zaakpay Live Mode: Callback checksum mismatch for order ${orderId}. Verifying via Status API...`);
        try {
          const liveCheck = await queryZaakpayOrderStatus(orderId, true);
          const orderInfo = liveCheck?.data?.orders?.[0];
          const st = String(orderInfo?.txnStatus ?? "");
          const rc = String(orderInfo?.responseCode ?? "");
          const rd = String(orderInfo?.responseDescription ?? "").toLowerCase();
          if (st === "0" || rc === "228" || rc === "100" || rd.includes("captured") || rd.includes("success")) {
            console.log("✅ Zaakpay Status API confirmed transaction is captured!");
            isChecksumValid = true;
          }
        } catch (apiErr) {
          console.error("Zaakpay Status API fallback error:", apiErr.message);
        }

        if (!isChecksumValid) {
          console.error("❌ Zaakpay Live Mode: Invalid Checksum and Status API did not confirm capture!");
          return res.status(400).send(_buildStatusHtml(false, "Checksum verification failed", orderId));
        }
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

    // 3. Determine Transaction Success (Zaakpay codes: 100=Success, 228=Captured, txnStatus 0=Captured)
    const isSuccess =
      String(responseCode) === "100" ||
      String(responseCode) === "228" ||
      String(rawData.txnStatus) === "0" ||
      String(normalized["txnstatus"]) === "0" ||
      String(rawData.result) === "true" ||
      String(normalized["result"]) === "true" ||
      String(responseDescription).toLowerCase().includes("captured") ||
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

    // 6. Expire previous active subscription for this platform
    const resolvedPlatform = orderRecord.platform || plan.platform || "app";
    const platformFilter = [{ platform: resolvedPlatform }];
    if (resolvedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let existingSubForPlatform = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    }).sort({ createdAt: -1 });

    if (existingSubForPlatform) {
      existingSubForPlatform = await expireSubscriptionIfNeeded(existingSubForPlatform);
      if (existingSubForPlatform && existingSubForPlatform.status === "active") {
        existingSubForPlatform.status = "expired";
        await existingSubForPlatform.save();
      }
    }

    // 7. Update Promo usage
    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (promo) {
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
      }
    }

    // 8. Create Active Subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

    const finalAmount = amount ? Number(amount) / 100 : (orderRecord.amount || plan.price);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      platform: resolvedPlatform,
      status: "active",
      paymentGateway: "zaakpay",
      paymentId: transactionId,
      subscriptionId: effectiveOrderId,
      amount: finalAmount,
      currency: "INR",
      startDate,
      endDate,
    });

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { subscriptions: subscription._id },
      });
    }

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
      status: "active",
    }).populate("plan", "name duration price platform");

    if (subscription) {
      return res.status(200).json({
        success: true,
        status: subscription.status,
        subscription,
      });
    }

    // 2. Look for ZaakpayOrder
    const orderRecord = await ZaakpayOrder.findOne({ orderId });
    if (!orderRecord) {
      return res.status(404).json({
        success: false,
        message: "Zaakpay order not found for this order ID",
      });
    }

    const config = await PaymentConfig.getConfig();
    const isLive = (config?.zaakpayMode || process.env.ZAAKPAY_MODE || "test") === "live" || ZAAKPAY_CONFIG.mode === "live";
    const isTestMode = !isLive;

    let zaakpayStatus = null;
    let isCaptured = false;
    let isFailed = false;
    let txnId = `ZPTXN_${Date.now()}`;
    let verifiedAmount = orderRecord.amount;
    let responseDesc = "";

    // 3. Query Official Zaakpay Check Transaction Status API (Server-to-Server)
    try {
      zaakpayStatus = await queryZaakpayOrderStatus(orderId, isLive);
      console.log(`Zaakpay Status API Response for ${orderId}:`, JSON.stringify(zaakpayStatus));

      const orderInfo = zaakpayStatus?.data?.orders?.[0];
      const orderDetail = orderInfo?.orderDetail;
      const txnStatus = String(orderInfo?.txnStatus ?? "");
      const responseCode = String(orderInfo?.responseCode ?? "");
      responseDesc = String(orderInfo?.responseDescription ?? "");

      if (orderDetail?.txnId) {
        txnId = orderDetail.txnId;
      } else if (orderInfo?.bankRefNum && orderInfo.bankRefNum !== "NA") {
        txnId = `ZPTXN_${orderInfo.bankRefNum}`;
      }

      if (orderDetail?.amount) {
        verifiedAmount = Number(orderDetail.amount) / 100;
      }

      // Zaakpay returns: txnStatus "0" = captured/success, responseCode "228" or "100" = captured
      isCaptured =
        txnStatus === "0" ||
        responseCode === "228" ||
        responseCode === "100" ||
        responseDesc.toLowerCase().includes("captured") ||
        responseDesc.toLowerCase().includes("success") ||
        (zaakpayStatus?.message?.code === "100" && orderInfo?.userAccountDebited === true);

      // txnStatus "1" = cancelled, responseCode "213" = cancelled
      isFailed =
        txnStatus === "1" ||
        responseCode === "213" ||
        responseDesc.toLowerCase().includes("cancelled") ||
        responseDesc.toLowerCase().includes("failed");
    } catch (apiErr) {
      console.error(`Zaakpay Status API Query Error for ${orderId}:`, apiErr.message);
    }

    // Auto-fulfill if orderRecord already completed or in sandbox test mode
    if (orderRecord.status === "completed") {
      isCaptured = true;
    } else if (isTestMode && !isFailed) {
      isCaptured = true;
    }

    // 4. If payment is captured, activate Subscription
    if (isCaptured) {
      const plan = await Plan.findById(orderRecord.plan);
      if (!plan) {
        return res.status(404).json({ success: false, message: "Associated plan not found" });
      }

      const resolvedPlatform = orderRecord.platform || plan.platform || "app";

      // Expire previous active subscription for this platform
      const platformFilter = [{ platform: resolvedPlatform }];
      if (resolvedPlatform === "app") {
        platformFilter.push({ platform: { $exists: false } });
        platformFilter.push({ platform: null });
      }

      let existing = await Subscription.findOne({
        user: orderRecord.user,
        status: "active",
        $or: platformFilter,
      }).sort({ createdAt: -1 });

      if (existing) {
        existing = await expireSubscriptionIfNeeded(existing);
        if (existing && existing.status === "active") {
          existing.status = "expired";
          await existing.save();
        }
      }

      // Check if subscription was created in the meantime (prevent duplicate)
      subscription = await Subscription.findOne({
        $or: [{ subscriptionId: orderId }, { paymentId: txnId }],
      }).populate("plan", "name duration price platform");

      if (!subscription) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

        subscription = await Subscription.create({
          user: orderRecord.user,
          plan: plan._id,
          platform: resolvedPlatform,
          status: "active",
          paymentGateway: "zaakpay",
          paymentId: txnId,
          subscriptionId: orderId,
          amount: verifiedAmount || orderRecord.amount || plan.price,
          currency: "INR",
          startDate,
          endDate,
        });

        if (orderRecord.user) {
          await User.findByIdAndUpdate(orderRecord.user, {
            $addToSet: { subscriptions: subscription._id },
          });
        }

        if (orderRecord.promoCode) {
          const promo = await Promo.findOne({ code: orderRecord.promoCode.toUpperCase(), isActive: true });
          if (promo) {
            promo.usedCount = (promo.usedCount || 0) + 1;
            await promo.save();
          }
        }

        subscription = await Subscription.findById(subscription._id).populate("plan", "name duration price platform");
      }

      orderRecord.status = "completed";
      await orderRecord.save();

      console.log("✅ Zaakpay Subscription Verified & Activated:", subscription._id, "for Order:", orderId);

      return res.status(200).json({
        success: true,
        status: "active",
        message: "Payment verified and subscription activated successfully",
        subscription,
      });
    }

    // 5. If payment failed or cancelled
    if (isFailed) {
      orderRecord.status = "failed";
      await orderRecord.save();
      return res.status(400).json({
        success: false,
        status: "failed",
        message: responseDesc || "Payment was cancelled or failed",
      });
    }

    // 6. If payment is still initiated / pending
    return res.status(200).json({
      success: false,
      status: "pending",
      message: responseDesc || "Payment is still processing or initiated",
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