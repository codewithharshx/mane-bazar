const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const { getPrimaryAddress, normalizeAddressPayload } = require("../utils/address");
const { getRuntimeConfig } = require("../config/env");
const { queuePasswordResetEmail } = require("../services/emailService");
const {
  clearRefreshTokenCookie,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie
} = require("../utils/tokens");

/**
 * Get refresh token from request (cookie or body, depending on config)
 */
const getRefreshTokenFromRequest = (req) => {
  if (req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }

  const config = getRuntimeConfig();
  if (config.allowRefreshTokenBody && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  return "";
};

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Sanitize user data for API responses
 */
const sanitizeAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  addresses: user.addresses,
  createdAt: user.createdAt
});

/**
 * Build comprehensive auth response with tokens and refresh cookie
 */
const buildAuthResponse = async (user, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = hashToken(refreshToken);
  await user.save();
  setRefreshTokenCookie(res, refreshToken);

  return {
    accessToken,
    user: sanitizeAuthUser(user)
  };
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail, isActive: true });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already registered. Please login or use a different email.");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password
  });

  const payload = await buildAuthResponse(user, res);
  res.status(201).json({
    ...payload,
    message: "Account created successfully"
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user || !user.isActive || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const payload = await buildAuthResponse(user, res);
  res.json(payload);
});

const refreshToken = asyncHandler(async (req, res) => {
  const token = getRefreshTokenFromRequest(req);

  if (!token) {
    res.status(401);
    throw new Error("Refresh token missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  const user = await User.findById(decoded.id);
  const incomingTokenHash = hashToken(token);
  const hasValidStoredToken =
    user && (user.refreshToken === incomingTokenHash || user.refreshToken === token);

  if (!user || !user.isActive || !hasValidStoredToken) {
    res.status(401);
    throw new Error("Refresh token has been rotated or revoked");
  }

  const payload = await buildAuthResponse(user, res);
  res.json(payload);
});

const logout = asyncHandler(async (req, res) => {
  const token = getRefreshTokenFromRequest(req);

  if (token) {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      $or: [{ refreshToken: tokenHash }, { refreshToken: token }]
    });

    if (user) {
      user.refreshToken = "";
      await user.save();
    }
  }

  clearRefreshTokenCookie(res);
  res.json({ message: "Logged out successfully" });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User account is inactive");
  }
  res.json(user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User account is inactive");
  }
  user.name = req.body.name || user.name;

  if (req.body.avatar !== undefined) {
    user.avatar = req.body.avatar;
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  await user.save();
  res.json({
    message: "Profile updated successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      addresses: user.addresses
    }
  });
});

const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User account is inactive");
  }
  const address = normalizeAddressPayload(req.body);

  if (!user.addresses.length || address.isDefault) {
    user.addresses.forEach((item) => {
      item.isDefault = false;
    });
    address.isDefault = true;
  }

  if (!user.addresses.some((item) => item.isDefault) && !address.isDefault) {
    address.isDefault = true;
  }

  user.addresses.push(address);
  await user.save();

  res.status(201).json({
    message: "Address added successfully",
    address: user.addresses[user.addresses.length - 1],
    addresses: user.addresses
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User account is inactive");
  }
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  const normalizedAddress = normalizeAddressPayload({ ...address.toObject(), ...req.body });

  if (normalizedAddress.isDefault) {
    user.addresses.forEach((item) => {
      item.isDefault = false;
    });
  }

  Object.assign(address, normalizedAddress);

  if (!user.addresses.some((item) => item.isDefault)) {
    const primaryAddress = getPrimaryAddress(user.addresses);
    if (primaryAddress) {
      primaryAddress.isDefault = true;
    }
  }
  await user.save();

  res.json({
    message: "Address updated successfully",
    address,
    addresses: user.addresses
  });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User account is inactive");
  }
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length) {
    const primaryAddress = getPrimaryAddress(user.addresses);
    if (primaryAddress) {
      primaryAddress.isDefault = true;
    }
  }

  await user.save();
  res.json({
    message: "Address deleted successfully",
    addressId: req.params.addressId,
    addresses: user.addresses
  });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const config = getRuntimeConfig();
  const safeMessage =
    "If an account exists with this email, a password reset link has been sent. Please check your inbox.";

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  
  if (!user || !user.isActive) {
    return res.json({ message: safeMessage });
  }

  // Generate password reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = hashVerificationToken(resetToken);
  user.passwordResetTokenExpires = new Date(
    Date.now() + config.passwordResetTokenTtlMinutes * 60 * 1000
  );
  await user.save();

  await queuePasswordResetEmail({
    to: user.email,
    name: user.name,
    resetToken,
    expiresMinutes: config.passwordResetTokenTtlMinutes
  });

  res.json({
    message: safeMessage
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400);
    throw new Error("Password reset token is required");
  }

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const hashedToken = hashVerificationToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: hashedToken,
    passwordResetTokenExpires: { $gt: new Date() }
  });

  if (!user) {
    res.status(400);
    throw new Error("Password reset link is invalid or has expired");
  }

  user.password = password;
  user.passwordResetTokenHash = "";
  user.passwordResetTokenExpires = null;
  user.refreshToken = "";
  await user.save();

  res.json({
    message: "Password reset successful. Please login with your new password."
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  requestPasswordReset,
  resetPassword
};
