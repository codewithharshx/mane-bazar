/**
 * webhookController.js
 *
 * Handles Razorpay webhook events for reliable payment processing.
 * This is the server-side safety net — if the client fails to call /verify,
 * this webhook catches the payment.captured event and confirms the order.
 *
 * SETUP REQUIRED:
 *   1. In Razorpay Dashboard → Webhooks → Add new webhook
 *   2. URL: https://your-domain.com/api/payment/webhook
 *   3. Events: payment.captured, payment.failed
 *   4. Add RAZORPAY_WEBHOOK_SECRET to your .env
 */

const crypto = require("crypto");
const asyncHandler = require("../middleware/asyncHandler");
const { confirmPendingOrder, cancelPendingOrder } = require("../services/orderService");
const Payment = require("../models/Payment");

const verifyWebhookSignature = (rawBody, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn("[webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification");
    return true; // Allow in dev without secret; block in prod via env validation
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(signature, "hex")
  );
};

const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    res.status(400);
    throw new Error("Missing webhook signature");
  }

  // req.body is a Buffer (raw body) — needed for signature verification
  const rawBody = req.body.toString("utf8");

  if (!verifyWebhookSignature(rawBody, signature)) {
    res.status(401);
    throw new Error("Invalid webhook signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400);
    throw new Error("Invalid JSON in webhook body");
  }

  const eventId = event.id;
  const eventType = event.event;
  const payload = event.payload?.payment?.entity || {};

  console.log(`[webhook] Received event: ${eventType} (id=${eventId})`);

  switch (eventType) {
    case "payment.captured": {
      const razorpayOrderId = payload.order_id;
      const razorpayPaymentId = payload.id;

      if (!razorpayOrderId || !razorpayPaymentId) {
        console.warn("[webhook] payment.captured missing order_id or payment id");
        return res.status(200).json({ received: true });
      }

      // Idempotency: check if already processed via this webhook event
      const existingPayment = await Payment.findOne({ razorpayOrderId });
      if (existingPayment?.status === "paid") {
        console.log(`[webhook] Order ${razorpayOrderId} already confirmed — skipping`);
        return res.status(200).json({ received: true });
      }

      try {
        const { order, alreadyConfirmed } = await confirmPendingOrder({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: "" // Webhook doesn't provide signature; we verified the webhook itself
        });

        console.log(
          `[webhook] payment.captured: Order ${order.orderId} ${
            alreadyConfirmed ? "was already confirmed" : "confirmed via webhook"
          }`
        );
      } catch (error) {
        console.error("[webhook] Failed to confirm order:", error.message);
        // Return 200 to prevent Razorpay from retrying if it's a logic error, not infra
        return res.status(200).json({ received: true, error: error.message });
      }
      break;
    }

    case "payment.failed": {
      const razorpayOrderId = payload.order_id;

      if (!razorpayOrderId) {
        return res.status(200).json({ received: true });
      }

      try {
        await cancelPendingOrder({
          razorpayOrderId,
          reason: `Payment failed via webhook: ${payload.error_description || "unknown reason"}`
        });
        console.log(`[webhook] payment.failed: pending order for ${razorpayOrderId} cancelled`);
      } catch (error) {
        console.error("[webhook] Failed to cancel order:", error.message);
      }
      break;
    }

    default:
      console.log(`[webhook] Unhandled event type: ${eventType}`);
  }

  // Always return 200 to Razorpay to prevent retries
  return res.status(200).json({ received: true });
});

module.exports = { handleWebhook };
