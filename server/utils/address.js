const normalizeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalizeCoordinate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeAddressPayload = (address = {}) => ({
  label: normalizeText(address.label) || "Home",
  fullName: normalizeText(address.fullName || address.name),
  phoneNumber: normalizeText(address.phoneNumber || address.phone),
  addressLine1: normalizeText(address.addressLine1 || address.street),
  addressLine2: normalizeText(address.addressLine2),
  landmark: normalizeText(address.landmark),
  city: normalizeText(address.city),
  state: normalizeText(address.state),
  pincode: normalizeText(address.pincode),
  isDefault: Boolean(address.isDefault),
  lat: normalizeCoordinate(address.lat),
  lng: normalizeCoordinate(address.lng)
});

const getPrimaryAddress = (addresses = []) =>
  addresses.find((address) => address?.isDefault) || addresses[0] || null;

const formatAddressBlock = (address = {}) => {
  const locationLine = [address.city, address.state].filter(Boolean).join(", ");
  const addressLines = [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.landmark ? `Landmark: ${address.landmark}` : "",
    [locationLine, address.pincode].filter(Boolean).join(" - "),
    address.phoneNumber ? `Phone: ${address.phoneNumber}` : ""
  ].filter(Boolean);

  return addressLines.join("\n");
};

module.exports = {
  formatAddressBlock,
  getPrimaryAddress,
  normalizeAddressPayload
};