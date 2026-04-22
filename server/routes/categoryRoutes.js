const express = require("express");
const { body, param } = require("express-validator");
const {
  createCategory,
  getCategories,
  updateCategory
} = require("../controllers/categoryController");
const { adminOnly, protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.get("/", getCategories);
router.post(
  "/",
  protect,
  adminOnly,
  [
    body("name").trim().notEmpty().withMessage("Category name is required"),
    body("urlKey")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("urlKey must be non-empty when provided"),
    body("slug")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("slug must be non-empty when provided"),
    body()
      .custom((value) => Boolean(value.urlKey || value.slug))
      .withMessage("Category urlKey is required")
  ],
  validateRequest,
  createCategory
);
router.put(
  "/:id",
  protect,
  adminOnly,
  [param("id").isMongoId().withMessage("Invalid category id")],
  validateRequest,
  updateCategory
);

module.exports = router;
