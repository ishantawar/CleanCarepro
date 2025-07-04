/**
 * Production Environment Configuration
 * Handles proper API URL detection for production deployment
 */

// Define the correct production API URL
export const PRODUCTION_API_URL = "https://cleancarepro-95it.onrender.com/api";

export const getProductionApiUrl = (): string => {
  // Check if we're in production based on hostname
  const hostname = window.location.hostname;
  const isProduction =
    !hostname.includes("localhost") && !hostname.includes("127.0.0.1");

  if (isProduction) {
    console.log(
      "🚀 Production environment detected, using:",
      PRODUCTION_API_URL,
    );
    return PRODUCTION_API_URL;
  }

  return "http://localhost:3001/api";
};

// Export a flag to check if backend should be used
export const shouldUseBackend = (): boolean => {
  const hostname = window.location.hostname;

  // Disable backend for all hosted/demo environments to prevent connection errors
  const isHostedEnv =
    hostname.includes("fly.dev") ||
    hostname.includes("vercel.app") ||
    hostname.includes("builder.codes") ||
    hostname.includes("netlify.app") ||
    hostname !== "localhost";

  if (isHostedEnv) {
    console.log(
      "🌐 Hosted environment detected - backend disabled for demo mode",
    );
    return false;
  }

  // Only enable backend for local development
  return hostname === "localhost";
};
