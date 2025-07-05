// Production configuration for CleanCare Pro Backend
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT: process.env.PORT || 3001,

  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_USERNAME: process.env.MONGODB_USERNAME,
  MONGODB_PASSWORD: process.env.MONGODB_PASSWORD,
  MONGODB_CLUSTER: process.env.MONGODB_CLUSTER,

  // Authentication
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: "7d",

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["https://cleancarepro-1-p2oc.onrender.com"],

  // SMS Service
  DVHOSTING_API_KEY: process.env.DVHOSTING_API_KEY,
  DVHOSTING_BASE_URL: "https://api.dvhostingg.com/api/v1",

  // Google Sheets integration removed

  // Security
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: process.env.NODE_ENV === "development" ? 2000 : 500, // More generous for normal usage
    AUTH_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
    AUTH_MAX_REQUESTS: process.env.NODE_ENV === "development" ? 100 : 30, // Allow more auth attempts
  },

  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "image/webp"],

  // Logging
  LOG_LEVEL: process.env.NODE_ENV === "production" ? "info" : "debug",

  // Cache
  REDIS_URL: process.env.REDIS_URL, // Optional Redis for caching
  CACHE_TTL: 5 * 60, // 5 minutes

  // Monitoring
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  MEMORY_THRESHOLD: 500 * 1024 * 1024, // 500MB

  // Feature Flags
  FEATURES: {
    SMS_VERIFICATION: true,
    EMAIL_VERIFICATION: false, // Not implemented yet
    PUSH_NOTIFICATIONS: true,
    GEOLOCATION_TRACKING: true,
    ADMIN_PANEL: false, // Future feature
    ANALYTICS: false, // Future feature
  },
};

// Validation function
const validateConfig = () => {
  const required = ["MONGODB_URI", "JWT_SECRET", "DVHOSTING_API_KEY"];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // Validate MongoDB URI format
  if (!config.MONGODB_URI.startsWith("mongodb")) {
    throw new Error("Invalid MongoDB URI format");
  }

  // Validate JWT secret length
  if (config.JWT_SECRET.length < 32) {
    throw new Error("JWT secret must be at least 32 characters long");
  }

  console.log("✅ Configuration validation passed");
};

// Helper functions
const isProduction = () => config.NODE_ENV === "production";
const isDevelopment = () => config.NODE_ENV === "development";

// Export configuration
module.exports = {
  ...config,
  validateConfig,
  isProduction,
  isDevelopment,
};
