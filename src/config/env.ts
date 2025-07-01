/**
 * Centralized environment configuration for API URLs
 * This ensures consistent API URL handling across the entire application
 */

export const getApiBaseUrl = (): string => {
  // First, check for explicit environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl && envUrl !== "") {
    return envUrl;
  }

  // Detect hosted environments and use the correct production API
  const hostname = window.location.hostname;

  if (
    hostname.includes("vercel.app") ||
    hostname.includes("builder.codes") ||
    hostname.includes("onrender.com") ||
    hostname.includes("cleancarepro")
  ) {
    // Use the production backend API
    return "https://cleancarepro-95it.onrender.com/api";
  }

  // For fly.dev or other hosted environments where backend is disabled
  if (hostname.includes("fly.dev")) {
    console.log("🌐 Hosted environment detected - backend disabled");
    return ""; // Empty string indicates no backend available
  }

  // Local development fallback
  return "http://localhost:3001/api";
};

export const isBackendAvailable = (): boolean => {
  return getApiBaseUrl() !== "";
};

export const config = {
  apiBaseUrl: getApiBaseUrl(),
  isProduction: window.location.hostname !== "localhost",
  isBackendAvailable: isBackendAvailable(),

  // Auth token storage key
  authTokenKey: "cleancare_auth_token",

  // User storage key
  userStorageKey: "current_user",

  // Booking storage key
  bookingStorageKey: "user_bookings",
};

// Log configuration on startup
console.log("🔧 Environment Configuration:", {
  hostname: window.location.hostname,
  apiBaseUrl: config.apiBaseUrl,
  isProduction: config.isProduction,
  isBackendAvailable: config.isBackendAvailable,
});
