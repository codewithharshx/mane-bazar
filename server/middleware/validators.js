/**
 * Production-grade input validation utilities
 * Validates all critical inputs across the application
 */

const { body, param, validationResult } = require("express-validator");

// ─── Email Validation ─────────────────────────────────────────────────────

const validateEmail = () =>
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Invalid email address");

// ─── Password Validation ──────────────────────────────────────────────────
const validatePassword = () =>
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number");

// ─── Name Validation ─────────────────────────────────────────────────────
const validateName = () =>
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Name can only contain letters, spaces, hyphens, and apostrophes");

const buildFieldPath = (prefix, field) => (prefix ? `${prefix}.${field}` : field);

// ─── Phone Number Validation ────────────────────────────────────────────
const validatePhoneNumber = (field = "phoneNumber") =>
  body(field)
    .trim()
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage("Phone number must contain 10 to 15 digits");

// ─── Pincode Validation ────────────────────────────────────────────────
const validatePincode = (field = "pincode") =>
  body(field)
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage("Pincode must be exactly 6 digits");

// ─── Address Validation ───────────────────────────────────────────────
const validateAddress = (prefix = "") => [
  body(buildFieldPath(prefix, "label"))
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Label must be 2-50 characters"),
  body(buildFieldPath(prefix, "fullName"))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be 2-100 characters"),
  validatePhoneNumber(buildFieldPath(prefix, "phoneNumber")),
  body(buildFieldPath(prefix, "addressLine1"))
    .trim()
    .isLength({ min: 5, max: 120 })
    .withMessage("Address line 1 must be 5-120 characters"),
  body(buildFieldPath(prefix, "addressLine2"))
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage("Address line 2 must be 120 characters or less"),
  body(buildFieldPath(prefix, "landmark"))
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage("Landmark must be 120 characters or less"),
  body(buildFieldPath(prefix, "city"))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be 2-50 characters"),
  body(buildFieldPath(prefix, "state"))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("State must be 2-50 characters"),
  validatePincode(buildFieldPath(prefix, "pincode")),
  body(buildFieldPath(prefix, "isDefault"))
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean")
];

// ─── Product Quantity Validation ──────────────────────────────────────
const validateProductQty = () =>
  body("qty")
    .isInt({ min: 1, max: 999 })
    .withMessage("Quantity must be between 1 and 999");
 
const validateImageUrl = (fieldName = "image") =>
  body(fieldName)
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage(`${fieldName} must be a valid URL`);

// ─── Coupon Code Validation ───────────────────────────────────────────
const validateCouponCode = () =>
  body("couponCode")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Invalid coupon code")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Coupon code must contain only uppercase letters and numbers");

// ─── Payment Status Validation ────────────────────────────────────────
const validatePaymentStatus = () =>
  body("paymentStatus")
    .isIn(["pending", "paid", "failed", "cancelled"])
    .withMessage("Invalid payment status");

// ─── Order Status Validation ──────────────────────────────────────────
const validateOrderStatus = () =>
  body("status")
    .isIn(["placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"])
    .withMessage("Invalid order status");

// ─── Validation Error Handler ────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

// ─── Combined Validators ──────────────────────────────────────────────

const validateRegister = [
  validateName(),
  validateEmail(),
  validatePassword(),
  handleValidationErrors
];

const validateLogin = [
  validateEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors
];

const validatePasswordResetRequest = [
  validateEmail(),
  handleValidationErrors
];

const validateOptionalRefreshToken = [
  body("refreshToken")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("refreshToken must be a non-empty string"),
  handleValidationErrors
];

const validateUpdateProfile = [
  validateName(),
  body("avatar")
    .optional()
    .isURL()
    .withMessage("Avatar must be a valid URL"),
  handleValidationErrors
];

const validateAddAddress = [
  ...validateAddress(),
  handleValidationErrors
];

const validateAddressIdParam = [
  param("addressId").isMongoId().withMessage("Invalid address id"),
  handleValidationErrors
];

const validateCreateOrder = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),
  body("items.*.productId")
    .isMongoId()
    .withMessage("Invalid product ID"),
  body("items.*.qty")
    .isInt({ min: 1, max: 999 })
    .withMessage("Invalid quantity"),
  body("deliveryAddress").isObject().withMessage("Delivery address is required"),
  ...validateAddress("deliveryAddress"),
  body("deliverySlot")
    .isObject()
    .withMessage("Delivery slot is required"),
  body("deliverySlot.date")
    .isISO8601()
    .withMessage("Invalid delivery date"),
  body("deliverySlot.timeSlot")
    .matches(/^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$/)
    .withMessage("Invalid time slot format"),
  validateCouponCode(),
  handleValidationErrors
];

const validatePasswordReset = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 32 })
    .withMessage("Invalid reset token"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  handleValidationErrors
];

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validatePhoneNumber,
  validatePincode,
  validateAddress,
  validateProductQty,
  validateImageUrl,
  validateCouponCode,
  validatePaymentStatus,
  validateOrderStatus,
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validateOptionalRefreshToken,
  validateUpdateProfile,
  validateAddressIdParam,
  validateAddAddress,
  validateCreateOrder,
  validatePasswordReset
};
