const fs = require("fs");
const path = require("path");
const { Juspay } = require("expresscheckout-nodejs");

const HDFC_CONFIG = {
  get merchantId() {
    return process.env.HDFC_MERCHANT_ID || "HDFC000136707309";
  },
  get keyId() {
    return process.env.HDFC_KEY_ID || "8352000";
  },
  get paymentPageClientId() {
    return process.env.HDFC_PAYMENT_PAGE_CLIENT_ID || "hdfcmaster";
  },
  get vpa() {
    return process.env.HDFC_VPA || "roccoplaywork@hdfcbank";
  },
  get storeName() {
    return process.env.HDFC_STORE_NAME || "ROCCOPLAY MEDIA";
  },
  get mode() {
    return process.env.HDFC_MODE || "test";
  },
  get baseUrl() {
    const testUrl = process.env.HDFC_TEST_URL ? process.env.HDFC_TEST_URL.replace(/\/session$/, "") : "https://smartgateway.hdfcuat.bank.in";
    const liveUrl = process.env.HDFC_LIVE_URL ? process.env.HDFC_LIVE_URL.replace(/\/session$/, "") : "https://smartgateway.hdfc.bank.in";
    return this.mode === "live" ? liveUrl : testUrl;
  },
  get returnUrl() {
    return process.env.HDFC_RETURN_URL;
  },
  get privateKeyPath() {
    return process.env.PRIVATE_KEY_PATH || "./keys/privateKey.pem";
  },
  get publicKeyPath() {
    return process.env.PUBLIC_KEY_PATH || "./keys/key_056f0ec231c745f899ca852b5c406777.pem";
  },
};

let juspay = null;

try {
  const pubKeyPath = path.resolve(process.cwd(), HDFC_CONFIG.publicKeyPath);
  const privKeyPath = path.resolve(process.cwd(), HDFC_CONFIG.privateKeyPath);

  // 🔍 Debug: confirm exactly which values are active at runtime (catches dotenv-order / stale-env bugs)
  console.log("HDFC Runtime Config → merchantId:", HDFC_CONFIG.merchantId, "| keyId:", HDFC_CONFIG.keyId, "| baseUrl:", HDFC_CONFIG.baseUrl);
  console.log("HDFC Key Paths → public:", pubKeyPath, "| private:", privKeyPath);

  if (fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath)) {
    const publicKey = fs.readFileSync(pubKeyPath, "utf8");
    const privateKey = fs.readFileSync(privKeyPath, "utf8");

    juspay = new Juspay({
      merchantId: HDFC_CONFIG.merchantId,
      baseUrl: HDFC_CONFIG.baseUrl,
      jweAuth: {
        keyId: HDFC_CONFIG.keyId,
        publicKey,
        privateKey,
      },
    });
    console.log(`✅ HDFC Bank Gateway (JWE) configured successfully [Mode: ${HDFC_CONFIG.mode}]`);
  } else {
    console.warn("⚠️ HDFC Gateway JWE keys not found at specified paths.");
  }
} catch (err) {
  console.error("⚠️ Failed to initialize HDFC SDK:", err.message);
}

// Server-to-server: create HDFC payment session
async function createHdfcSession({ orderId, amount, customerId, customerEmail, customerPhone, firstName, lastName, description, returnUrl }) {
  if (!juspay) throw new Error("HDFC Gateway SDK not initialized (missing keys)");

  const payload = {
    order_id: orderId,
    amount: Number(amount),
    customer_id: customerId ? String(customerId) : "",
    customer_email: customerEmail,
    customer_phone: customerPhone,
    payment_page_client_id: HDFC_CONFIG.paymentPageClientId,
    action: "paymentPage",
    currency: "INR",
    return_url: returnUrl,
    description: description || "Subscription Payment",
    first_name: firstName || "Customer",
    last_name: lastName || "",
  };

  try {
    const response = await juspay.orderSession.create(payload);
    return response; // Contains payment_links, sdk_payload, etc.
  } catch (err) {
    console.error("HDFC Session Create Failed:", err);
    throw new Error(err.message || "HDFC session creation failed");
  }
}

// Server-to-server: check real order status (source of truth)
async function getHdfcOrderStatus(orderId) {
  if (!juspay) throw new Error("HDFC Gateway SDK not initialized (missing keys)");

  try {
    const response = await juspay.order.status(orderId);
    return response;
  } catch (err) {
    console.error("HDFC Order Status Error:", err);
    throw new Error(err.message || "Failed to fetch HDFC order status");
  }
}

module.exports = {
  HDFC_CONFIG,
  juspay,
  createHdfcSession,
  getHdfcOrderStatus,
};