const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Load environment variables
dotenv.config();

// Load production configuration
const productionConfig = require("./config/production");

// Validate configuration
try {
  productionConfig.validateConfig();
} catch (error) {
  console.error("❌ Configuration Error:", error.message);
  process.exit(1);
}

const app = express();
const PORT = productionConfig.PORT;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false,
  }),
);

// Compression middleware
app.use(compression());

// Logging middleware
if (productionConfig.isProduction()) {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: productionConfig.RATE_LIMIT.WINDOW_MS,
  max: productionConfig.RATE_LIMIT.MAX_REQUESTS,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: productionConfig.RATE_LIMIT.AUTH_WINDOW_MS,
  max: productionConfig.RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: {
    error: "Too many authentication attempts, please try again later",
  },
});

app.use(generalLimiter);
app.use("/api/auth", authLimiter);

// CORS configuration
app.use(
  cors({
    origin: productionConfig.ALLOWED_ORIGINS,
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "user-id"],
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB connection with production configuration
const connectDB = async () => {
  try {
    // Use production MongoDB URI
    const mongoURI = productionConfig.MONGODB_URI;
    ("mongodb+srv://sunflower110001:fV4LhLpWlKj5Vx87@cluster0.ic8p792.mongodb.net/cleancare_pro?retryWrites=true&w=majority");

    await mongoose.connect(mongoURI);

    console.log(
      "✅ MongoDB connected successfully to:",
      mongoURI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"),
    );
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("⚠️ Running in mock mode without database");
  }
};

// Connect to database
connectDB();

// Import routes with error handling
let otpAuthRoutes, bookingRoutes, locationRoutes;

try {
  otpAuthRoutes = require("./routes/otp-auth");
  console.log("✅ OTP Auth routes loaded");
} catch (error) {
  console.error("❌ Failed to load OTP Auth routes:", error.message);
}

try {
  bookingRoutes = require("./routes/bookings");
  console.log("✅ Booking routes loaded");
} catch (error) {
  console.error("❌ Failed to load Booking routes:", error.message);
}

try {
  locationRoutes = require("./routes/location");
  console.log("✅ Location routes loaded");
} catch (error) {
  console.error("❌ Failed to load Location routes:", error.message);
}

// API Routes with error handling
if (otpAuthRoutes) {
  app.use("/api/auth", otpAuthRoutes);
  console.log("🔗 Auth routes registered at /api/auth");
}

if (bookingRoutes) {
  app.use("/api/bookings", bookingRoutes);
  console.log("🔗 Booking routes registered at /api/bookings");
}

if (locationRoutes) {
  app.use("/api/location", locationRoutes);
  console.log("🔗 Location routes registered at /api/location");
}

// WhatsApp Auth routes
try {
  const whatsappAuthRoutes = require("./routes/whatsapp-auth");
  app.use("/api/whatsapp", whatsappAuthRoutes);
  console.log("🔗 WhatsApp Auth routes registered at /api/whatsapp");
} catch (error) {
  console.error("❌ Failed to load WhatsApp Auth routes:", error.message);
}

// Addresses routes
try {
  const addressRoutes = require("./routes/addresses");
  app.use("/api/addresses", addressRoutes);
  console.log("🔗 Address routes registered at /api/addresses");
} catch (error) {
  console.error("❌ Failed to load Address routes:", error.message);
}

// Google Sheets integration endpoint
app.post("/api/sheets/order", async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    if (
      !orderData.orderId ||
      !orderData.customerName ||
      !orderData.customerPhone
    ) {
      return res.status(400).json({ error: "Missing required order data" });
    }

    // Prepare data for Google Sheets
    const sheetData = {
      sheetName: "Orders",
      data: {
        orderId: orderData.orderId,
        timestamp: new Date().toISOString(),
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress || "",
        services: Array.isArray(orderData.services)
          ? orderData.services.join(", ")
          : orderData.services || "",
        totalAmount: orderData.totalAmount || 0,
        pickupDate: orderData.pickupDate || "",
        pickupTime: orderData.pickupTime || "",
        status: orderData.status || "pending",
        paymentStatus: orderData.paymentStatus || "pending",
        coordinates: orderData.coordinates
          ? `${orderData.coordinates.lat},${orderData.coordinates.lng}`
          : "",
        city: orderData.city || "",
        pincode: orderData.pincode || "",
      },
    };

    // Send to Google Apps Script (if URL is configured)
    const webAppUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbxQ7vKLJ8PQnZ9Yr3tXhj2mxbUCc5k1wFz8H3rGt4pJ7nN6VvwT8/exec";

    if (process.env.GOOGLE_SHEETS_ENABLED !== "false") {
      try {
        const response = await fetch(webAppUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sheetData),
        });

        console.log("📊 Order data sent to Google Sheets:", orderData.orderId);
      } catch (sheetError) {
        console.error("❌ Failed to send to Google Sheets:", sheetError);
        // Don't fail the request if Google Sheets fails
      }
    }

    res.json({
      data: { message: "Order processed successfully" },
      error: null,
    });
  } catch (error) {
    console.error("Google Sheets endpoint error:", error);
    res.status(500).json({ error: "Failed to process order data" });
  }
});

// Push notification endpoints
app.post("/api/push/subscribe", (req, res) => {
  // Store push subscription in database
  // In production, save this to your user's profile
  console.log("Push subscription received:", req.body);
  res.json({ success: true });
});

app.post("/api/push/unsubscribe", (req, res) => {
  // Remove push subscription from database
  console.log("Push unsubscribe request");
  res.json({ success: true });
});

// Health check endpoint with comprehensive monitoring
app.get("/api/health", async (req, res) => {
  const healthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "CleanCare Pro API",
    version: "1.0.0",
    environment: productionConfig.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "unknown",
    features: productionConfig.FEATURES,
  };

  // Check database connection
  try {
    if (mongoose.connection.readyState === 1) {
      healthCheck.database = "connected";
    } else {
      healthCheck.database = "disconnected";
      healthCheck.status = "degraded";
    }
  } catch (error) {
    healthCheck.database = "error";
    healthCheck.status = "unhealthy";
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.heapUsed > productionConfig.MEMORY_THRESHOLD) {
    healthCheck.status = "degraded";
    healthCheck.warning = "High memory usage";
  }

  const statusCode =
    healthCheck.status === "ok"
      ? 200
      : healthCheck.status === "degraded"
        ? 200
        : 503;

  res.status(statusCode).json(healthCheck);
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "CleanCare Pro API is working!",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CleanCare Pro server running on port ${PORT}`);
  console.log(`📱 API available at: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
