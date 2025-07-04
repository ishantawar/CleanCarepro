const express = require("express");
const Address = require("../models/Address");
const User = require("../models/User");

const router = express.Router();

// Middleware to verify user (simple version - you may want to add JWT verification)
const verifyUser = async (req, res, next) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Get all addresses for a user
router.get("/", verifyUser, async (req, res) => {
  try {
    const addresses = await Address.getUserAddresses(req.userId);
    res.json({ data: addresses, error: null });
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

// Get user's default address
router.get("/default", verifyUser, async (req, res) => {
  try {
    const address = await Address.getDefaultAddress(req.userId);
    res.json({ data: address, error: null });
  } catch (error) {
    console.error("Get default address error:", error);
    res.status(500).json({ error: "Failed to fetch default address" });
  }
});

// Create new address
router.post("/", verifyUser, async (req, res) => {
  try {
    // Get user's customer_id
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressData = {
      ...req.body,
      user_id: req.userId,
      customer_id: user.customer_id,
    };

    const address = new Address(addressData);
    await address.save();

    res.status(201).json({ data: address, error: null });
  } catch (error) {
    console.error("Create address error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: errors.join(", ") });
    }

    res.status(500).json({ error: "Failed to create address" });
  }
});

// Update address
router.put("/:addressId", verifyUser, async (req, res) => {
  try {
    const address = await Address.findOneAndUpdate(
      { _id: req.params.addressId, user_id: req.userId },
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true },
    );

    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json({ data: address, error: null });
  } catch (error) {
    console.error("Update address error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: errors.join(", ") });
    }

    res.status(500).json({ error: "Failed to update address" });
  }
});

// Delete address
router.delete("/:addressId", verifyUser, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.addressId,
      user_id: req.userId,
    });

    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json({
      data: { message: "Address deleted successfully" },
      error: null,
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ error: "Failed to delete address" });
  }
});

// Set address as default
router.patch("/:addressId/set-default", verifyUser, async (req, res) => {
  try {
    // First, unset all other addresses as non-default
    await Address.updateMany({ user_id: req.userId }, { is_default: false });

    // Set the specified address as default
    const address = await Address.findOneAndUpdate(
      { _id: req.params.addressId, user_id: req.userId },
      { is_default: true, updated_at: new Date() },
      { new: true },
    );

    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json({ data: address, error: null });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({ error: "Failed to set default address" });
  }
});

// Get addresses by customer ID
router.get("/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const addresses = await Address.getUserAddressesByCustomerId(customerId);
    res.json({ data: addresses, error: null });
  } catch (error) {
    console.error("Get addresses by customer ID error:", error);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

// Get default address by customer ID
router.get("/customer/:customerId/default", async (req, res) => {
  try {
    const { customerId } = req.params;
    const address = await Address.getDefaultAddressByCustomerId(customerId);
    res.json({ data: address, error: null });
  } catch (error) {
    console.error("Get default address by customer ID error:", error);
    res.status(500).json({ error: "Failed to fetch default address" });
  }
});

module.exports = router;
