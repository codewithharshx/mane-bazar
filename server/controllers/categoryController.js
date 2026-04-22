const Category = require("../models/Category");
const asyncHandler = require("../middleware/asyncHandler");

const normalizeCategoryPayload = (payload = {}) => ({
  ...payload,
  urlKey: payload.urlKey || payload.slug
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(normalizeCategoryPayload(req.body));
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, normalizeCategoryPayload(req.body), {
    new: true,
    runValidators: true
  });

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  res.json(category);
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory
};
