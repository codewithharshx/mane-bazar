const express = require("express");
const {
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
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validateOptionalRefreshToken,
  validateUpdateProfile,
  validateAddressIdParam,
  validateAddAddress,
  validatePasswordReset
} = require("../middleware/validators");
const {
  loginRateLimiter,
  passwordResetRateLimiter
} = require("../middleware/rateLimiter");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC AUTHENTICATION ROUTES (No authentication required)
// ═══════════════════════════════════════════════════════════════════════════════

// User Registration
router.post("/register", validateRegister, register);

// Email & Password Login
router.post("/login", loginRateLimiter, validateLogin, login);

// Password Reset Request
router.post(
  "/request-password-reset",
  passwordResetRateLimiter,
  validatePasswordResetRequest,
  requestPasswordReset
);

// Password Reset
router.post("/reset-password", validatePasswordReset, resetPassword);

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Refresh Access Token
router.post("/refresh-token", validateOptionalRefreshToken, refreshToken);

// Logout (Invalidate Refresh Token)
router.post("/logout", validateOptionalRefreshToken, logout);

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (Authentication required with valid JWT)
// ═══════════════════════════════════════════════════════════════════════════════

// Get Current User Profile
router.get("/me", protect, getMe);

// Update User Profile
router.put("/profile", protect, validateUpdateProfile, updateProfile);

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS MANAGEMENT ROUTES (Protected)
// ═══════════════════════════════════════════════════════════════════════════════

// Add New Address
router.post("/addresses", protect, validateAddAddress, addAddress);

// Update Address
router.put(
  "/addresses/:addressId",
  protect,
  validateAddressIdParam,
  validateAddAddress,
  updateAddress
);

// Delete Address
router.delete("/addresses/:addressId", protect, validateAddressIdParam, deleteAddress);

module.exports = router;
