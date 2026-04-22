export const emptyAddress = {
  label: "Home",
  fullName: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false
};

export const normalizeAddress = (address = {}) => ({
  label: address.label || "Home",
  fullName: address.fullName || address.name || "",
  phoneNumber: address.phoneNumber || address.phone || "",
  addressLine1: address.addressLine1 || address.street || "",
  addressLine2: address.addressLine2 || "",
  landmark: address.landmark || "",
  city: address.city || "",
  state: address.state || "",
  pincode: address.pincode || "",
  isDefault: Boolean(address.isDefault)
});

export const getPrimaryAddress = (addresses = []) =>
  addresses.find((address) => address?.isDefault) || addresses[0] || null;

export const formatAddressSummary = (address = {}) => {
  const cityLine = [address.city, address.state].filter(Boolean).join(", ");
  const locationLine = [cityLine, address.pincode].filter(Boolean).join(" - ");
  const details = [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.landmark ? `Landmark: ${address.landmark}` : "",
    locationLine,
    address.phoneNumber ? `Phone: ${address.phoneNumber}` : ""
  ].filter(Boolean);

  return details.join("\n");
};