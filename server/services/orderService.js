/**
 * orderService.js
 *
 * Core order business logic — extracted from orderController to break the
 * controller→controller import anti-pattern.
 *
 * Consumed by: orderController, paymentController, webhookController
 */

const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const User = require("../models/User");
const { generateInvoice } = require("./invoiceService");
const { normalizeAddressPayload } = require("../utils/address");
const {
  calculatePricing,
  generateOrderId,
  normalizeDeliverySlot
} = require("../utils/order");
const {
  queueOrderConfirmationEmail
} = require("./emailService");
const { generateUpiQrForOrder } = require("./upiService");
const { notifyOrderWhatsApp } = require("./whatsappService");

const SLOT_LIMIT = 20;
// Minutes before a pending_payment order auto-expires
const PENDING_PAYMENT_TTL_MIN = 30;

const dispatchOrderNotifications = async ({ order, user }) => {
  const upiDetails = await generateUpiQrForOrder({
    orderId: order.orderId,
    amount: order.pricing.total
  });

  queueOrderConfirmationEmail({
    to: user.email,
    name: user.name,
    orderId: order.orderId,
    orderTotal: `INR ${order.pricing.total.toFixed(2)}`
  }).catch((error) => {
    console.error("Failed to queue order confirmation email:", error.message);
  });

  notifyOrderWhatsApp({
    order: {
      ...order.toObject(),
      upiDetails
    },
    customerName: user.name,
    customerPhone: order.deliveryAddress?.phoneNumber || ""
  }).catch((error) => {
    console.error("Failed to send WhatsApp order notification:", error.message);
  });
};

// ─── Internal helpers ────────────────────────────────────────────────────────

const validateDeliverySlot = async ({ date, timeSlot }) => {
  const ordersInSlot = await Order.countDocuments({
    "deliverySlot.date": date,
    "deliverySlot.timeSlot": timeSlot,
    status: { $nin: ["cancelled", "pending_payment"] }
  });

  if (ordersInSlot >= SLOT_LIMIT) {
    throw new Error("Selected delivery slot is full. Please choose another one.");
  }
};

const normalizeItemsFromProducts = (items, productsMap) =>
  items.map((item) => {
    const product = productsMap.get(item.productId);
    return {
      product: product._id,
      name: product.name,
      price: product.price,
      qty: Number(item.qty),
      image: product.images?.[0] || ""
    };
  });

/**
 * Atomically decrement stock for each item.
 * Uses $inc with a floor guard to prevent negative stock.
 */
const adjustStock = async (items, mode = "decrement") => {
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: {
        _id: item.product,
        ...(mode === "decrement" ? { stock: { $gte: item.qty } } : {})
      },
      update: {
        $inc: { stock: mode === "decrement" ? -item.qty : item.qty }
      }
    }
  }));

  const result = await Product.bulkWrite(bulkOps);

  if (mode === "decrement" && result.modifiedCount < items.length) {
    throw new Error(
      "Stock adjustment failed: one or more products ran out of stock during checkout."
    );
  }
};

// ─── Exported service functions ──────────────────────────────────────────────

/**
 * Validate and build an order payload object (does NOT persist to DB).
 * Used before creating a Razorpay order or a COD order.
 */
const buildOrderPayload = async ({
  userId,
  items,
  deliveryAddress,
  deliverySlot,
  paymentMethod,
  paymentStatus,
  razorpayMeta = {},
  couponCode = "",
  forcedOrderId = ""
}) => {
  if (!items?.length) {
    throw new Error("At least one cart item is required");
  }

  const normalizedDeliveryAddress = normalizeAddressPayload(deliveryAddress);
  const requiredAddressFields = ["fullName", "phoneNumber", "addressLine1", "city", "state", "pincode"];
  const missingAddressField = requiredAddressFields.find((field) => !normalizedDeliveryAddress[field]);

  if (missingAddressField) {
    throw new Error("Please provide a complete delivery address");
  }

  if (!/^[0-9]{6}$/.test(normalizedDeliveryAddress.pincode)) {
    throw new Error("Pincode must be exactly 6 digits");
  }

  const normalizedTimeSlot = normalizeDeliverySlot(deliverySlot?.timeSlot);
  if (!normalizedTimeSlot) {
    throw new Error("Invalid delivery slot");
  }

  const normalizedDeliverySlot = {
    ...deliverySlot,
    timeSlot: normalizedTimeSlot
  };

  await validateDeliverySlot(normalizedDeliverySlot);

  // Fetch products and validate availability
  const productIds = items.map((item) => item.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products are no longer available");
  }

  const productsMap = new Map(products.map((product) => [product._id.toString(), product]));

  // Stock validation
  items.forEach((item) => {
    const product = productsMap.get(item.productId);
    if (!product) throw new Error("One or more products are no longer available");
    if (product.stock < Number(item.qty)) {
      throw new Error(`"${product.name}" does not have enough stock`);
    }
  });

  // Pricing
  const normalizedItems = normalizeItemsFromProducts(items, productsMap);
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryCharge = subtotal >= 499 ? 0 : 40;

  let appliedCoupon = null;
  let couponDiscount = 0;
  if (couponCode) {
    const { coupon, discount } = await validateCouponCode({ code: couponCode, subtotal });
    appliedCoupon = coupon;
    couponDiscount = discount;
  }

  const pricing = calculatePricing({ items: normalizedItems, couponDiscount, deliveryCharge });

  return {
    orderId: forcedOrderId || generateOrderId(),
    user: userId,
    items: normalizedItems,
    pricing,
    couponCode: appliedCoupon?.code || "",
    paymentMethod,
    paymentStatus,
    razorpayOrderId: razorpayMeta.razorpayOrderId || "",
    razorpayPaymentId: razorpayMeta.razorpayPaymentId || "",
    razorpaySignature: razorpayMeta.razorpaySignature || "",
    deliveryAddress: normalizedDeliveryAddress,
    deliverySlot: normalizedDeliverySlot,
    status: paymentMethod === "razorpay" && paymentStatus === "pending"
      ? "pending_payment"
      : "placed",
    statusHistory: [
      {
        status: paymentMethod === "razorpay" && paymentStatus === "pending"
          ? "pending_payment"
          : "placed",
        updatedAt: new Date(),
        note:
          paymentMethod === "razorpay" && paymentStatus === "pending"
            ? "Stock reserved, awaiting payment"
            : "Order placed successfully"
      }
    ],
    appliedCoupon
  };
};

/**
 * Persist a confirmed order to the database.
 * Decrements stock, redeems coupon, generates invoice, queues email, creates Payment record.
 */
const persistSuccessfulOrder = async (orderPayload) => {
  const { appliedCoupon, ...payload } = orderPayload;
  const order = await Order.create(payload);
  await adjustStock(order.items, "decrement");

  if (appliedCoupon) {
    appliedCoupon.usedCount += 1;
    await appliedCoupon.save();
  }

  const user = await User.findById(order.user);
  const invoicePath = await generateInvoice(order, user);
  order.invoicePath = invoicePath;
  await order.save();

  await dispatchOrderNotifications({ order, user });

  await Payment.create({
    order: order._id,
    user: order.user,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    razorpaySignature: order.razorpaySignature,
    amount: order.pricing.total,
    currency: "INR",
    status: order.paymentStatus
  });

  return { order };
};

/**
 * Reserve stock and create a pending_payment order in the DB.
 * Called before opening the Razorpay payment dialog to avoid race conditions.
 */
const createPendingPaymentOrder = async (orderPayload) => {
  const { appliedCoupon, ...payload } = orderPayload;

  // Set 30-minute TTL expiry for auto-cleanup
  payload.pendingPaymentExpiry = new Date(Date.now() + PENDING_PAYMENT_TTL_MIN * 60 * 1000);

  const order = await Order.create(payload);

  // Reserve stock atomically
  await adjustStock(order.items, "decrement");

  if (appliedCoupon) {
    appliedCoupon.usedCount += 1;
    await appliedCoupon.save();
  }

  return { order };
};

/**
 * Confirm a pending_payment order after successful Razorpay payment.
 */
const confirmPendingOrder = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const order = await Order.findOne({
    razorpayOrderId,
    status: "pending_payment"
  });

  if (!order) {
    // Already confirmed (webhook vs. client race) — find and return
    const existing = await Order.findOne({ razorpayOrderId });
    if (existing) return { order: existing, alreadyConfirmed: true };
    throw new Error("Pending payment order not found");
  }

  order.status = "placed";
  order.paymentStatus = "paid";
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  order.pendingPaymentExpiry = null;
  order.statusHistory.push({
    status: "placed",
    updatedAt: new Date(),
    note: "Payment confirmed"
  });

  await order.save();

  // Generate invoice + notify
  const user = await User.findById(order.user);
  const invoicePath = await generateInvoice(order, user);
  order.invoicePath = invoicePath;
  await order.save();

  await dispatchOrderNotifications({ order, user });

  await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      razorpayPaymentId,
      razorpaySignature,
      status: "paid"
    }
  );

  return { order, alreadyConfirmed: false };
};

/**
 * Cancel a pending_payment order and restore stock.
 * Called on payment failure or user abandonment.
 */
const cancelPendingOrder = async ({ razorpayOrderId, reason = "Payment failed or cancelled" }) => {
  const order = await Order.findOne({
    razorpayOrderId,
    status: "pending_payment"
  });

  if (!order) return null; // Already cancelled or confirmed

  order.status = "cancelled";
  order.statusHistory.push({
    status: "cancelled",
    updatedAt: new Date(),
    note: reason
  });

  await order.save();

  // Restore reserved stock
  await adjustStock(order.items, "increment");

  // Restore coupon usage
  if (order.couponCode) {
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (coupon && coupon.usedCount > 0) {
      coupon.usedCount -= 1;
      await coupon.save();
    }
  }

  return order;
};

// ─── Coupon validation (moved from couponController) ─────────────────────────

const validateCouponCode = async ({ code, subtotal }) => {
  const coupon = await Coupon.findOne({ code, isActive: true });

  if (!coupon) throw new Error("Invalid or expired coupon code");

  const now = new Date();
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new Error("This coupon has expired");
  }

  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    throw new Error(
      `Minimum order value of INR ${coupon.minOrderValue} required for this coupon`
    );
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("This coupon has reached its usage limit");
  }

  const discount =
    coupon.discountType === "percentage"
      ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
      : coupon.discountValue;

  return { coupon, discount: Number(discount.toFixed(2)) };
};

module.exports = {
  buildOrderPayload,
  persistSuccessfulOrder,
  createPendingPaymentOrder,
  confirmPendingOrder,
  cancelPendingOrder,
  adjustStock,
  validateCouponCode
};
