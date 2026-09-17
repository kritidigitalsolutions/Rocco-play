const crypto = require("crypto");

const ZAAKPAY_CONFIG = {
  get merchantIdentifier() {
    return process.env.ZAAKPAY_MERCHANT_ID;
  },
  get secretKey() {
    return process.env.ZAAKPAY_SECRET_KEY;
  },
  get apiKey() {
    return process.env.ZAAKPAY_API_KEY;
  },
  get keyId() {
    return process.env.ZAAKPAY_KEY_ID;
  },
  get encryptionKey() {
    return process.env.ZAAKPAY_ENCRYPTION_KEY;
  },
  get mode() {
    return (process.env.ZAAKPAY_MODE || "test").trim().toLowerCase();
  },
  get testUrl() {
    return process.env.ZAAKPAY_TEST_URL || "https://zaakstaging.zaakpay.com/api/paymentTransact/V13";
  },
  get liveUrl() {
    return process.env.ZAAKPAY_LIVE_URL || "https://api.zaakpay.com/api/paymentTransact/V13";
  },
  get returnUrl() {
    return process.env.ZAAKPAY_RETURN_URL || "https://api.roccoplay.in/api/payment/zaakpay/callback";
  },  
};

// ---- OUTGOING request checksum: alphabetical order, trailing & after EVERY pair ----
function calculateChecksum(params, secretKey = ZAAKPAY_CONFIG.secretKey) {
  if (!secretKey) throw new Error("Zaakpay secret key is missing");

  const keys = Object.keys(params)
    .filter(
      (k) =>
        k !== "checksum" &&
        params[k] !== undefined &&
        params[k] !== null &&
        params[k] !== ""
    )
    .sort();

  const dataString = keys.map((k) => `${k}=${params[k]}&`).join("");

  return crypto.createHmac("sha256", secretKey).update(dataString).digest("hex");
}

// ---- INCOMING callback checksum: Zaakpay's FIXED field order (not alphabetical) ----
const RESPONSE_FIELD_ORDER = [
  "amount", "bank", "bankid", "cardId", "cardScheme", "cardToken", "cardhashid",
  "doRedirect", "orderId", "paymentMethod", "paymentMode", "responseCode",
  "responseDescription", "productDescription", "product1Description",
  "product2Description", "product3Description", "product4Description",
  "pgTransId", "pgTransTime",
];

function calculateResponseChecksum(params, secretKey = ZAAKPAY_CONFIG.secretKey) {
  const dataString = RESPONSE_FIELD_ORDER
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${k}=${params[k]}&`)
    .join("");

  return crypto.createHmac("sha256", secretKey).update(dataString).digest("hex");
}

function verifyChecksum(responseParams, receivedChecksum, secretKey = ZAAKPAY_CONFIG.secretKey) {
  if (!receivedChecksum) return false;
  const calculated = calculateResponseChecksum(responseParams, secretKey);
  return calculated.toLowerCase() === receivedChecksum.trim().toLowerCase();
}

function getTransactUrl() {
  return ZAAKPAY_CONFIG.mode === "live" ? ZAAKPAY_CONFIG.liveUrl : ZAAKPAY_CONFIG.testUrl;
}

if (ZAAKPAY_CONFIG.merchantIdentifier && ZAAKPAY_CONFIG.secretKey) {
  console.log(`✅ Zaakpay configured successfully [Mode: ${ZAAKPAY_CONFIG.mode}]`);
} else {
  console.warn("⚠️ Zaakpay credentials missing in .env.");
}

module.exports = { ZAAKPAY_CONFIG, calculateChecksum, calculateResponseChecksum, verifyChecksum, getTransactUrl };