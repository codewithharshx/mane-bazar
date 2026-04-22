const QRCode = require("qrcode");

const getUpiConfig = () => ({
  upiId: (process.env.UPI_ID || "").trim(),
  merchantName: (process.env.UPI_MERCHANT_NAME || "Mane Bazar").trim()
});

const buildUpiUri = ({ upiId, merchantName, amount, orderId }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `Order ${orderId}`
  });

  return `upi://pay?${params.toString()}`;
};

const generateUpiQrForOrder = async ({ orderId, amount }) => {
  const { upiId, merchantName } = getUpiConfig();
  if (!upiId) {
    return null;
  }

  const upiUri = buildUpiUri({ upiId, merchantName, amount, orderId });
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320
  });

  return {
    upiId,
    merchantName,
    upiUri,
    qrDataUrl
  };
};

module.exports = {
  generateUpiQrForOrder
};
