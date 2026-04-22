const express = require("express");
const { body } = require("express-validator");
const { createOrder, verifyPayment, handlePaymentFailed } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { checkoutRateLimiter } = require("../middleware/rateLimiter");
const validateRequest = require("../middleware/validateRequest");
const { validateAddress } = require("../middleware/validators");
const { normalizeDeliverySlot } = require("../utils/order");

const router = express.Router();

// ─── Razorpay Webhook ─────────────────────────────────────────────────────────
// IMPORTANT: This route uses raw body (not JSON) for signature verification.
// It is mounted with express.raw() in server.js BEFORE express.json() middleware.

// ─── Validation ───────────────────────────────────────────────────────────────
const paymentOrderValidation = [
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("items.*.productId").isMongoId().withMessage("Product id is invalid"),
  body("items.*.qty").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ...validateAddress("deliveryAddress"),
  body("deliverySlot.date").trim().notEmpty().withMessage("Delivery date is required"),
  body("deliverySlot.timeSlot")
    .custom((value) => Boolean(normalizeDeliverySlot(value)))
    .withMessage("Invalid delivery slot")
];

// ─── Create Razorpay Order (reserves stock) ───────────────────────────────────
router.post(
  "/create-order",
  checkoutRateLimiter,
  protect,
  paymentOrderValidation,
  validateRequest,
  createOrder
);

// ─── Verify Payment (confirms order) ──────────────────────────────────────────
router.post(
  "/verify",
  checkoutRateLimiter,
  protect,
  [
    body("razorpayOrderId").trim().notEmpty().withMessage("Razorpay order id is required"),
    body("razorpayPaymentId").trim().notEmpty().withMessage("Razorpay payment id is required"),
    body("razorpaySignature").trim().notEmpty().withMessage("Razorpay signature is required")
  ],
  validateRequest,
  verifyPayment
);

// ─── Payment Failed / Cancelled ───────────────────────────────────────────────
// Client calls this when user dismisses Razorpay modal or payment fails
router.post(
  "/payment-failed",
  protect,
  [body("razorpayOrderId").trim().notEmpty().withMessage("razorpayOrderId is required")],
  validateRequest,
  handlePaymentFailed
);

module.exports = router;
