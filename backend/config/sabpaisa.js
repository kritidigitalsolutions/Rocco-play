const crypto = require("crypto");

// Default Shared Sandbox / Staging Credentials (moves no real money)
const SANDBOX_DEFAULTS = {
  merchantId: "SQUA102",
  apiKey: "sp_itOrld7Rm0SGjkqg_VSEXBtZXqi8T26-pMPfpUCxUQo",
  secretKey: "sec_lLao-1-yDLmV81YjExxgR00a8o7FgJ8-HLSJj9Od4hY",
  baseUrl: "https://staging-sb-merchant-api.sabpaisa.in",
  webhookSecret: "sec_lLao-1-yDLmV81YjExxgR00a8o7FgJ8-HLSJj9Od4hY",
};

// Production Live Defaults
const PRODUCTION_DEFAULTS = {
  baseUrl: "https://merchant-api.sabpaisa.in",
};

/**
 * Dynamically resolves SabPaisa configuration based on the requested mode ('test' or 'live').
 * @param {string} [mode] - 'test' | 'live'
 */
function getSabpaisaConfig(mode) {
  const resolvedMode = (mode || process.env.SABPAISA_MODE || "test").trim().toLowerCase();
  const isLive = resolvedMode === "live" || resolvedMode === "production";

  if (isLive) {
    const apiKey = process.env.SABPAISA_LIVE_API_KEY || (process.env.SABPAISA_MODE === "live" ? process.env.SABPAISA_API_KEY : null) || process.env.SABPAISA_API_KEY;
    const secretKey = process.env.SABPAISA_LIVE_SECRET_KEY || (process.env.SABPAISA_MODE === "live" ? process.env.SABPAISA_SECRET_KEY : null) || process.env.SABPAISA_SECRET_KEY;
    const merchantId = process.env.SABPAISA_LIVE_MERCHANT_ID || (process.env.SABPAISA_MODE === "live" ? process.env.SABPAISA_MERCHANT_ID : null) || process.env.SABPAISA_MERCHANT_ID || "XOZO1";
    const baseUrl = process.env.SABPAISA_LIVE_BASE_URL || (process.env.SABPAISA_MODE === "live" ? process.env.SABPAISA_BASE_URL : null) || PRODUCTION_DEFAULTS.baseUrl;
    const webhookSecret = process.env.SABPAISA_LIVE_WEBHOOK_SECRET || (process.env.SABPAISA_MODE === "live" ? process.env.SABPAISA_WEBHOOK_SECRET : null) || secretKey;
    const returnUrl = process.env.SABPAISA_RETURN_URL || "https://api.roccoplay.in/api/payment/sabpaisa/return";

    return {
      mode: "live",
      isLive: true,
      apiKey,
      secretKey,
      merchantId,
      baseUrl,
      webhookSecret,
      returnUrl,
    };
  }

  // Staging / Test mode
  const apiKey = process.env.SABPAISA_TEST_API_KEY || (process.env.SABPAISA_MODE === "test" ? process.env.SABPAISA_API_KEY : null) || SANDBOX_DEFAULTS.apiKey;
  const secretKey = process.env.SABPAISA_TEST_SECRET_KEY || (process.env.SABPAISA_MODE === "test" ? process.env.SABPAISA_SECRET_KEY : null) || SANDBOX_DEFAULTS.secretKey;
  const merchantId = process.env.SABPAISA_TEST_MERCHANT_ID || (process.env.SABPAISA_MODE === "test" ? process.env.SABPAISA_MERCHANT_ID : null) || SANDBOX_DEFAULTS.merchantId;
  const baseUrl = process.env.SABPAISA_TEST_BASE_URL || (process.env.SABPAISA_MODE === "test" ? process.env.SABPAISA_BASE_URL : null) || SANDBOX_DEFAULTS.baseUrl;
  const webhookSecret = process.env.SABPAISA_TEST_WEBHOOK_SECRET || (process.env.SABPAISA_MODE === "test" ? process.env.SABPAISA_WEBHOOK_SECRET : null) || secretKey || SANDBOX_DEFAULTS.webhookSecret;
  const returnUrl = process.env.SABPAISA_RETURN_URL || "https://api.roccoplay.in/api/payment/sabpaisa/return";

  return {
    mode: "test",
    isLive: false,
    apiKey,
    secretKey,
    merchantId,
    baseUrl,
    webhookSecret,
    returnUrl,
  };
}

function isSabpaisaConfigured(mode) {
  const config = getSabpaisaConfig(mode);
  return Boolean(config.apiKey && config.secretKey && config.merchantId && config.returnUrl);
}

// Backward-compatible SABPAISA_CONFIG singleton
const SABPAISA_CONFIG = {
  get mode() { return (process.env.SABPAISA_MODE || "test").trim().toLowerCase(); },
  get apiKey() { return getSabpaisaConfig().apiKey; },
  get secretKey() { return getSabpaisaConfig().secretKey; },
  get merchantId() { return getSabpaisaConfig().merchantId; },
  get baseUrl() { return getSabpaisaConfig().baseUrl; },
  get returnUrl() { return getSabpaisaConfig().returnUrl; },
  get webhookSecret() { return getSabpaisaConfig().webhookSecret; },
};

function createChecksum({ merchantId, merchantTxnId, amount, currency, timestamp }, customSecretKey) {
  const key = customSecretKey || SABPAISA_CONFIG.secretKey;
  const value = `${merchantId}|${merchantTxnId}|${amount}|${currency}|${timestamp}`;
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function timingSafeEqual(expected, actual) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function verifyReturnSignature(params, customSecretKey) {
  const { signature, ...unsigned } = params;
  const value = Object.keys(unsigned)
    .filter((key) => unsigned[key] !== undefined && unsigned[key] !== null)
    .sort()
    .map((key) => `${key}=${unsigned[key]}`)
    .join("|");

  if (customSecretKey) {
    const expected = crypto.createHmac("sha256", customSecretKey).update(value).digest("hex");
    if (timingSafeEqual(expected, String(signature || "").toLowerCase())) return true;
  }

  // Also check active config key and alternate key
  const activeExpected = crypto.createHmac("sha256", SABPAISA_CONFIG.secretKey).update(value).digest("hex");
  if (timingSafeEqual(activeExpected, String(signature || "").toLowerCase())) return true;

  // Check test and live keys as fallbacks
  const testCfg = getSabpaisaConfig("test");
  const liveCfg = getSabpaisaConfig("live");
  if (testCfg.secretKey) {
    const testExp = crypto.createHmac("sha256", testCfg.secretKey).update(value).digest("hex");
    if (timingSafeEqual(testExp, String(signature || "").toLowerCase())) return true;
  }
  if (liveCfg.secretKey) {
    const liveExp = crypto.createHmac("sha256", liveCfg.secretKey).update(value).digest("hex");
    if (timingSafeEqual(liveExp, String(signature || "").toLowerCase())) return true;
  }

  return false;
}

function verifyWebhookSignature(rawBody, header, customSecretKey) {
  const [timestamp, received] = String(header || "").split(".", 2);
  if (!timestamp || !received) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;

  const secretsToCheck = [];
  if (customSecretKey) secretsToCheck.push(customSecretKey);
  if (SABPAISA_CONFIG.webhookSecret) secretsToCheck.push(SABPAISA_CONFIG.webhookSecret);
  const testSecret = getSabpaisaConfig("test").webhookSecret;
  if (testSecret && !secretsToCheck.includes(testSecret)) secretsToCheck.push(testSecret);
  const liveSecret = getSabpaisaConfig("live").webhookSecret;
  if (liveSecret && !secretsToCheck.includes(liveSecret)) secretsToCheck.push(liveSecret);

  for (const secret of secretsToCheck) {
    const expected = crypto.createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("base64");
    if (timingSafeEqual(expected, received)) return true;
  }

  return false;
}

module.exports = {
  SANDBOX_DEFAULTS,
  PRODUCTION_DEFAULTS,
  getSabpaisaConfig,
  isSabpaisaConfigured,
  SABPAISA_CONFIG,
  createChecksum,
  verifyReturnSignature,
  verifyWebhookSignature,
};
