const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const {
  createOrder,
  verifyPayment,
  getActiveGateways,
} = require("../../controllers/payment.controller");

const {
  initiatePayment: initiateZaakpay,
  handleCallback: handleZaakpayCallback,
  checkPaymentStatus: checkZaakpayStatus,
} = require("../../controllers/zaakpay.controller");

const {
  initiatePayment: initiateHdfc,
  handleCallback: handleHdfcCallback,
  checkPaymentStatus: checkHdfcStatus,
} = require("../../controllers/hdfc.controller");

// Public / User Gateway Info
router.get("/gateways", getActiveGateways);

// ── Razorpay Routes ──
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

// ── Zaakpay Routes ──
router.post("/zaakpay/initiate", isAuth, initiateZaakpay);
router.post("/zaakpay/callback", handleZaakpayCallback);
router.get("/zaakpay/callback", handleZaakpayCallback);
router.get("/zaakpay/status/:orderId", isAuth, checkZaakpayStatus);

// ── HDFC Bank Routes ──
router.post("/hdfc/initiate", isAuth, initiateHdfc);
router.post("/hdfc/callback", handleHdfcCallback);
router.get("/hdfc/callback", handleHdfcCallback);
router.get("/hdfc/status/:orderId", isAuth, checkHdfcStatus);

module.exports = router;