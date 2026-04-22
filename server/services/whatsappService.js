const { formatAddressBlock } = require("../utils/address");

const normalizePhone = (rawPhone) => {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
};

const getWhatsappConfig = () => ({
  enabled: String(process.env.WHATSAPP_ENABLED || "false").toLowerCase() === "true",
  apiUrl: (process.env.WHATSAPP_API_URL || "").trim(),
  apiKey: (process.env.WHATSAPP_API_KEY || "").trim(),
  adminNumber: normalizePhone(process.env.WHATSAPP_ADMIN_NUMBER || "")
});

const buildOrderText = ({ order, customerName, upiDetails }) => {
  const lines = [
    `Mane Bazar Order Confirmation`,
    `Order ID: ${order.orderId}`,
    `Customer: ${customerName || "Customer"}`,
    `Customer Phone: ${normalizePhone(order.deliveryAddress?.phoneNumber || order.deliveryAddress?.phone || "") || "Not provided"}`,
    `Amount: INR ${order.pricing.total.toFixed(2)}`,
    `Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})`,
    `Status: ${order.status}`,
    `Invoice: ${order.invoicePath ? "Generated" : "Pending"}`
  ];

  if (order.deliveryAddress) {
    lines.push(`Delivery Address:\n${formatAddressBlock(order.deliveryAddress)}`);
  }

  if (upiDetails?.upiUri) {
    lines.push(`UPI Payment Link: ${upiDetails.upiUri}`);
  }

  return lines.join("\n");
};

const sendWhatsAppPayload = async ({ to, text, order, upiDetails }) => {
  const config = getWhatsappConfig();
  if (!to) return;

  const payload = {
    to,
    type: "order_update",
    orderId: order.orderId,
    text,
    metadata: {
      amount: order.pricing.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      invoicePath: order.invoicePath || "",
      upi: upiDetails
        ? {
            upiId: upiDetails.upiId,
            merchantName: upiDetails.merchantName,
            upiUri: upiDetails.upiUri,
            qrDataUrl: upiDetails.qrDataUrl
          }
        : null
    }
  };

  if (!config.enabled || !config.apiUrl || !config.apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev-whatsapp] to=${to} payload=${JSON.stringify(payload).slice(0, 180)}...`);
    }
    return;
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp API failed (${response.status}): ${details}`);
  }
};

const notifyOrderWhatsApp = async ({ order, customerName, customerPhone }) => {
  const config = getWhatsappConfig();
  const upiDetails = order.upiDetails || null;
  const text = buildOrderText({ order, customerName, upiDetails });

  const customerTo = normalizePhone(customerPhone);
  const targets = [customerTo, config.adminNumber].filter(Boolean);

  await Promise.all(
    targets.map((to) =>
      sendWhatsAppPayload({
        to,
        text,
        order,
        upiDetails
      })
    )
  );
};

module.exports = {
  notifyOrderWhatsApp,
  normalizePhone
};
