const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    title: {
      type: String,
      required: [true, "Address title is required"],
      trim: true,
    },
    full_address: {
      type: String,
      required: [true, "Full address is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
      match: [/^\d{6}$/, "Please enter a valid 6-digit pincode"],
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    coordinates: {
      lat: {
        type: Number,
        required: false,
      },
      lng: {
        type: Number,
        required: false,
      },
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    address_type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
    contact_person: {
      type: String,
      trim: true,
      default: "",
    },
    contact_phone: {
      type: String,
      trim: true,
      default: "",
    },
    delivery_instructions: {
      type: String,
      trim: true,
      default: "",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Update the updated_at field before saving
addressSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.is_default) {
    await this.constructor.updateMany(
      { user_id: this.user_id, _id: { $ne: this._id } },
      { is_default: false },
    );
  }
  next();
});

// Create indexes
addressSchema.index({ user_id: 1 });
addressSchema.index({ user_id: 1, is_default: 1 });
addressSchema.index({ pincode: 1 });
addressSchema.index({ created_at: -1 });
addressSchema.index({ "coordinates.lat": 1, "coordinates.lng": 1 });

// Static method to get user's default address
addressSchema.statics.getDefaultAddress = function (userId) {
  return this.findOne({ user_id: userId, is_default: true });
};

// Static method to get all user addresses
addressSchema.statics.getUserAddresses = function (userId) {
  return this.find({ user_id: userId }).sort({
    is_default: -1,
    created_at: -1,
  });
};

module.exports = mongoose.model("Address", addressSchema);
