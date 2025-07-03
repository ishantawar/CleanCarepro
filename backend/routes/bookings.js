const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");

const router = express.Router();

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

// Create a new booking
router.post("/", async (req, res) => {
  try {
    console.log("📝 Booking creation request received:", {
      customer_id: req.body.customer_id,
      service: req.body.service,
      service_type: req.body.service_type,
      services: req.body.services,
      total_price: req.body.total_price,
      scheduled_date: req.body.scheduled_date,
      scheduled_time: req.body.scheduled_time,
      provider_name: req.body.provider_name,
      address: req.body.address
        ? typeof req.body.address === "string"
          ? `${req.body.address.substring(0, 50)}...`
          : `${JSON.stringify(req.body.address).substring(0, 50)}...`
        : "missing",
    });

    const {
      customer_id,
      service,
      service_type,
      services,
      scheduled_date,
      scheduled_time,
      provider_name,
      address,
      coordinates,
      additional_details,
      total_price,
      discount_amount,
      final_amount,
      special_instructions,
      charges_breakdown,
    } = req.body;

    // Validation
    const requiredFields = {
      customer_id,
      service,
      service_type,
      services,
      scheduled_date,
      scheduled_time,
      provider_name,
      address,
      total_price,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.log("❌ Missing required fields:", missingFields);
      return res.status(400).json({
        error: "Missing required fields",
        missing: missingFields,
        received: Object.keys(req.body),
      });
    }

    if (!Array.isArray(services) || services.length === 0) {
      console.log("❌ Services validation failed:", {
        services,
        type: typeof services,
      });
      return res.status(400).json({
        error: "At least one service must be selected",
        servicesReceived: services,
        servicesType: typeof services,
      });
    }

    if (isNaN(total_price) || total_price <= 0) {
      console.log("❌ Total price validation failed:", {
        total_price,
        type: typeof total_price,
      });
      return res.status(400).json({
        error: "Total price must be greater than 0",
        totalPriceReceived: total_price,
        totalPriceType: typeof total_price,
      });
    }

    // Validate and sanitize address
    let sanitizedAddress = address;
    if (typeof address === "object") {
      // If address is an object, create a readable string
      sanitizedAddress = [
        address.flatNo,
        address.street,
        address.landmark,
        address.village,
        address.city,
        address.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      console.log("📍 Converted address object to string:", sanitizedAddress);
    }

    // Verify customer exists - handle both ObjectId and phone-based lookup
    let customer;
    let actualCustomerId = customer_id;

    // Handle user_ prefix format (e.g., user_9717619183)
    if (typeof customer_id === "string" && customer_id.startsWith("user_")) {
      const phone = customer_id.replace("user_", "");
      if (phone.match(/^\d{10,}$/)) {
        actualCustomerId = phone;
        console.log(`📞 Extracted phone from user ID: ${phone}`);
      }
    }

    // Try to find by ObjectId first
    if (mongoose.Types.ObjectId.isValid(actualCustomerId)) {
      customer = await User.findById(actualCustomerId);
    }

    // If not found and actualCustomerId looks like a phone number, try to find by phone
    if (
      !customer &&
      typeof actualCustomerId === "string" &&
      actualCustomerId.match(/^\d{10,}$/)
    ) {
      customer = await User.findOne({ phone: actualCustomerId });
      console.log(
        `🔍 Looking for customer by phone: ${actualCustomerId}, found: ${!!customer}`,
      );
    }

    // If still not found, try to find user in CleanCareUser collection
    if (!customer) {
      try {
        const CleanCareUser = mongoose.model("CleanCareUser");
        const cleanCareUser = await CleanCareUser.findById(customer_id);
        if (cleanCareUser) {
          // Check if User record already exists for this CleanCareUser
          const existingUser = await User.findOne({
            $or: [
              { phone: cleanCareUser.phone },
              {
                email:
                  cleanCareUser.email || `${cleanCareUser.phone}@cleancare.com`,
              },
            ],
          });

          if (existingUser) {
            customer = existingUser;
            console.log(
              "✅ Found existing User record for CleanCareUser:",
              customer._id,
            );
          } else {
            // Create corresponding User record for booking
            customer = new User({
              phone: cleanCareUser.phone,
              name: cleanCareUser.name || `User ${cleanCareUser.phone}`,
              full_name: cleanCareUser.name || `User ${cleanCareUser.phone}`,
              user_type: "customer",
              is_verified: cleanCareUser.isVerified || false,
              phone_verified: cleanCareUser.isVerified || false,
            });

            try {
              await customer.save();
              console.log(
                "✅ Created User record from CleanCareUser:",
                customer._id,
              );
            } catch (saveError) {
              if (saveError.code === 11000) {
                // Duplicate key - try to find existing user
                if (saveError.keyValue?.phone) {
                  customer = await User.findOne({
                    phone: saveError.keyValue.phone,
                  });
                }

                if (customer) {
                  console.log(
                    "✅ Found existing User after duplicate error:",
                    customer._id,
                  );
                } else {
                  throw saveError;
                }
              } else {
                throw saveError;
              }
            }
          }
        }
      } catch (cleanCareError) {
        console.warn("Failed to lookup CleanCareUser:", cleanCareError);
      }
    }

    // If customer not found, create a basic customer record
    if (!customer && actualCustomerId.match(/^\d{10,}$/)) {
      console.log(`👤 Creating new customer with phone: ${actualCustomerId}`);

      // Check if user already exists with this phone
      const existingUserByPhone = await User.findOne({
        phone: actualCustomerId,
      });

      if (existingUserByPhone) {
        customer = existingUserByPhone;
        console.log("✅ Found existing customer by phone:", customer._id);
      } else {
        customer = new User({
          phone: actualCustomerId,
          name: `User ${actualCustomerId.slice(-4)}`,
          full_name: `User ${actualCustomerId.slice(-4)}`,
          user_type: "customer",
          is_verified: true,
          phone_verified: true,
        });

        try {
          await customer.save();
          console.log("✅ Auto-created customer:", customer._id);
        } catch (createError) {
          console.error("Failed to auto-create customer:", createError);
          // Check if it's a duplicate key error - in that case, try to find the existing user
          if (createError.code === 11000) {
            if (createError.keyValue?.phone) {
              customer = await User.findOne({
                phone: createError.keyValue.phone,
              });
            }

            if (customer) {
              console.log(
                "✅ Found existing customer after duplicate error:",
                customer._id,
              );
            } else {
              return res
                .status(500)
                .json({ error: "Failed to create customer record" });
            }
          } else {
            return res
              .status(500)
              .json({ error: "Failed to create customer record" });
          }
        }
      }
    }

    if (!customer) {
      return res
        .status(404)
        .json({ error: "Customer not found and could not be created" });
    }

    // Prepare item prices for storage
    let item_prices = [];
    if (Array.isArray(services)) {
      item_prices = services.map((service) => {
        const serviceName =
          typeof service === "object"
            ? service.name || service.service
            : service;
        const quantity =
          typeof service === "object" ? service.quantity || 1 : 1;
        const price = typeof service === "object" ? service.price || 50 : 50;

        return {
          service_name: serviceName,
          quantity: quantity,
          unit_price: price,
          total_price: price * quantity,
        };
      });
    }

    // Create booking with proper customer_id as ObjectId
    const booking = new Booking({
      customer_id: customer._id, // Use the actual customer ObjectId from database
      service,
      service_type,
      services,
      scheduled_date,
      scheduled_time,
      provider_name,
      address,
      coordinates,
      additional_details,
      total_price,
      discount_amount: discount_amount || 0,
      final_amount: final_amount || total_price - (discount_amount || 0),
      special_instructions,
      charges_breakdown,
      item_prices, // Store individual service prices
    });

    await booking.save();
    console.log("✅ Booking saved to database:", booking._id);

    // Populate customer data
    await booking.populate("customer_id", "full_name phone email");
    console.log("✅ Booking populated with customer data");

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bookings for a customer
router.get("/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Handle different customer ID formats
    let customerIds = [];

    // If it's a valid ObjectId, add it
    if (mongoose.Types.ObjectId.isValid(customerId)) {
      customerIds.push(customerId);
    }

    // If it looks like a phone number, find corresponding user IDs
    if (typeof customerId === "string" && customerId.match(/^\d{10,}$/)) {
      try {
        const usersWithPhone = await User.find({ phone: customerId });
        customerIds.push(...usersWithPhone.map((u) => u._id));

        // Also check CleanCareUser collection
        try {
          const CleanCareUser = mongoose.model("CleanCareUser");
          const cleanCareUsers = await CleanCareUser.find({
            phone: customerId,
          });
          customerIds.push(...cleanCareUsers.map((u) => u._id));
        } catch (cleanCareError) {
          console.warn("CleanCareUser lookup failed:", cleanCareError);
        }
      } catch (phoneError) {
        console.warn("Phone lookup failed:", phoneError);
      }
    }

    // If customerId starts with "user_", extract phone number
    if (typeof customerId === "string" && customerId.startsWith("user_")) {
      const phone = customerId.replace("user_", "");
      if (phone.match(/^\d{10,}$/)) {
        try {
          const usersWithPhone = await User.find({ phone: phone });
          customerIds.push(...usersWithPhone.map((u) => u._id));

          // Also check CleanCareUser collection
          try {
            const CleanCareUser = mongoose.model("CleanCareUser");
            const cleanCareUsers = await CleanCareUser.find({ phone: phone });
            customerIds.push(...cleanCareUsers.map((u) => u._id));
          } catch (cleanCareError) {
            console.warn("CleanCareUser lookup failed:", cleanCareError);
          }
        } catch (phoneError) {
          console.warn("Phone lookup failed:", phoneError);
        }
      }
    }

    // Remove duplicates
    customerIds = [...new Set(customerIds.map((id) => id.toString()))];

    console.log("Looking for bookings with customer IDs:", customerIds);

    if (customerIds.length === 0) {
      return res.json({ bookings: [] });
    }

    let query = { customer_id: { $in: customerIds } };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone")
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    console.log("Found bookings:", bookings.length);
    res.json({ bookings });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get pending bookings for riders (within 10km range)
router.get("/pending/:riderLat/:riderLng", async (req, res) => {
  try {
    const { riderLat, riderLng } = req.params;
    const lat = parseFloat(riderLat);
    const lng = parseFloat(riderLng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Get all pending bookings
    const bookings = await Booking.find({
      status: "pending",
      rider_id: null,
    })
      .populate("customer_id", "full_name phone email")
      .sort({ created_at: -1 });

    // Filter bookings within 10km range
    const nearbyBookings = bookings.filter((booking) => {
      if (
        !booking.coordinates ||
        !booking.coordinates.lat ||
        !booking.coordinates.lng
      ) {
        return false; // Skip bookings without coordinates
      }

      const distance = calculateDistance(
        lat,
        lng,
        booking.coordinates.lat,
        booking.coordinates.lng,
      );

      return distance <= 10; // 10km range
    });

    res.json({ bookings: nearbyBookings });
  } catch (error) {
    console.error("Pending bookings fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bookings for a rider
router.get("/rider/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = { rider_id: riderId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone")
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json({ bookings });
  } catch (error) {
    console.error("Rider bookings fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept a booking (rider claims it)
router.put("/:bookingId/accept", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rider_id } = req.body;

    if (!rider_id) {
      return res.status(400).json({ error: "Rider ID is required" });
    }

    // Check if rider exists
    const rider = await User.findById(rider_id);
    if (!rider) {
      return res.status(404).json({ error: "Rider not found" });
    }

    // Find and update booking atomically
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: "pending",
        rider_id: null,
      },
      {
        rider_id,
        status: "confirmed",
        updated_at: new Date(),
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone");

    if (!booking) {
      return res.status(409).json({
        error: "Booking not found or is no longer available",
      });
    }

    res.json({
      message: "Booking accepted successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking acceptance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update booking status
router.put("/:bookingId/status", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, rider_id, user_id, user_type } = req.body;

    console.log("📝 Booking status update request:", {
      bookingId,
      status,
      rider_id,
      user_id,
      user_type,
    });

    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Validate bookingId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      console.error("❌ Invalid booking ID format:", bookingId);
      return res.status(400).json({ error: "Invalid booking ID format" });
    }

    let query = { _id: bookingId };

    // If rider_id is provided, make sure only that rider can update
    if (rider_id) {
      query.rider_id = rider_id;
    }

    let updateData = {
      status,
      updated_at: new Date(),
    };

    // Add completion timestamp if completing
    if (status === "completed") {
      updateData.completed_at = new Date();
    }

    console.log("🔍 Looking for booking with query:", query);

    const booking = await Booking.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone");

    if (!booking) {
      console.error("❌ Booking not found with ID:", bookingId);

      // Check if booking exists at all
      const existingBooking = await Booking.findById(bookingId);
      if (!existingBooking) {
        console.error("❌ Booking does not exist in database");
      } else {
        console.error("❌ Booking exists but query failed. Current booking:", {
          id: existingBooking._id,
          status: existingBooking.status,
          rider_id: existingBooking.rider_id,
        });
      }

      return res
        .status(404)
        .json({ error: "Booking not found or access denied" });
    }

    console.log("✅ Booking status updated successfully:", booking._id);

    res.json({
      message: "Booking status updated successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking status update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get booking by ID
router.get("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ booking });
  } catch (error) {
    console.error("Booking fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel booking
router.delete("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { user_id, user_type } = req.body;

    // Get booking details first
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user has permission to cancel
    const canCancel =
      (user_type === "customer" &&
        booking.customer_id.toString() === user_id) ||
      (user_type === "rider" &&
        booking.rider_id &&
        booking.rider_id.toString() === user_id);

    if (!canCancel) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Can't cancel if already completed
    if (booking.status === "completed") {
      return res.status(400).json({ error: "Cannot cancel completed booking" });
    }

    // Update booking status to cancelled
    booking.status = "cancelled";
    booking.updated_at = new Date();
    await booking.save();

    res.json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bookings (admin/statistics)
router.get("/", async (req, res) => {
  try {
    const {
      status,
      customer_id,
      rider_id,
      limit = 50,
      offset = 0,
      start_date,
      end_date,
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (customer_id) query.customer_id = customer_id;
    if (rider_id) query.rider_id = rider_id;

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const bookings = await Booking.find(query)
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone")
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
