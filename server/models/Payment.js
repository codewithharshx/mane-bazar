const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    razorpayOrderId: {
      type: String,
      default: ""
    },
    razorpayPaymentId: {
      type: String,
      default: ""
    },
    razorpaySignature: {
      type: String,
      default: ""
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refund_pending", "refunded"],
      default: "pending"
    },
    // Webhook event tracking
    webhookEventId: { type: String, default: "" },
    refundId: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

paymentSchema.index({ order: 1 });
paymentSchema.index({ razorpayOrderId: 1 }, { sparse: true });

module.exports = mongoose.model("Payment", paymentSchema);
