// Google Sheets Configuration
// Change these values to switch to a different Google Sheet

export const GOOGLE_SHEETS_CONFIG = {
  // Main Google Sheet URL - Production sheet
  SHEET_URL:
    import.meta.env.VITE_GOOGLE_SHEETS_URL ||
    "https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing",

  // Google Apps Script Web App URL - Production deployment
  WEB_APP_URL:
    import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
    "https://script.google.com/macros/s/AKfycbxQ7vKLJ8PQnZ9Yr3tXhj2mxbUCc5k1wFz8H3rGt4pJ7nN6VvwT8/exec",

  // Sheet configuration
  SHEET_NAME: "Orders",

  // Column headers for the sheet
  HEADERS: [
    "Order ID",
    "Timestamp",
    "Customer Name",
    "Customer Phone",
    "Customer Address",
    "Services",
    "Total Amount",
    "Pickup Date",
    "Pickup Time",
    "Status",
    "Payment Status",
    "Coordinates",
    "City",
    "Pincode",
  ],

  // Enable Google Sheets integration in production
  ENABLED: false,
};

// Helper function to validate configuration
export const validateGoogleSheetsConfig = () => {
  const warnings = [];

  // Check if we're in a hosted environment
  const isHostedEnv =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("fly.dev") ||
      window.location.hostname.includes("builder.codes"));

  if (
    GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes("YOUR_SCRIPT_ID") &&
    !isHostedEnv
  ) {
    warnings.push("⚠️ Google Apps Script Web App URL not configured");
  }

  if (!GOOGLE_SHEETS_CONFIG.ENABLED && !isHostedEnv) {
    warnings.push("ℹ️ Google Sheets integration is disabled");
  }

  return warnings;
};

// Quick setup instructions
export const SETUP_INSTRUCTIONS = `
🔧 Google Sheets Integration Setup:

1. **Update Sheet URL:**
   - Change SHEET_URL in src/config/googleSheets.ts
   - Point to your Google Sheet

2. **Create Google Apps Script:**
   - Go to script.google.com
   - Create new project
   - Copy code from GoogleSheetsService.generateAppsScriptCode()
   - Deploy as web app
   - Update WEB_APP_URL with your deployment URL

3. **Sheet Setup:**
   - Create sheet named "${GOOGLE_SHEETS_CONFIG.SHEET_NAME}"
   - Add headers: ${GOOGLE_SHEETS_CONFIG.HEADERS.join(", ")}

4. **Test:**
   - Place a test order
   - Check if data appears in your sheet
`;
