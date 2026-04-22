const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home", trim: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    landmark: { type: String, default: "", trim: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    isDefault: { type: Boolean, default: false }
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      default: ""
    },
    avatar: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    addresses: {
      type: [addressSchema],
      default: []
    },
    refreshToken: {
      type: String,
      default: ""
    },
    passwordResetTokenHash: {
      type: String,
      default: ""
    },
    passwordResetTokenExpires: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre("save", function ensureDefaultAddress(next) {
  if (!Array.isArray(this.addresses) || !this.addresses.length) {
    return next();
  }

  let defaultSeen = false;
  this.addresses.forEach((address, index) => {
    if (address.isDefault && !defaultSeen) {
      defaultSeen = true;
      return;
    }

    if (address.isDefault && defaultSeen) {
      address.isDefault = false;
      return;
    }

    if (!defaultSeen && index === this.addresses.length - 1) {
      address.isDefault = true;
    }
  });

  next();
});

// Compare plain-text password with hashed password
userSchema.methods.matchPassword = async function matchPassword(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Mask sensitive fields from JSON output
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetTokenExpires;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);