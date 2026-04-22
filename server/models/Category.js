const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    urlKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    icon: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Backward compatibility for clients still sending/reading `slug`.
categorySchema.virtual("slug")
  .get(function getSlugAlias() {
    return this.urlKey;
  })
  .set(function setSlugAlias(value) {
    this.urlKey = value;
  });

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

categorySchema.pre("validate", function syncUrlKey(next) {
  if (!this.urlKey && this.slug) {
    this.urlKey = this.slug;
  }
  next();
});

module.exports = mongoose.model("Category", categorySchema);
