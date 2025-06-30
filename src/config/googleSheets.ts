// Google Sheets Configuration
// Change these values to switch to a different Google Sheet

export const GOOGLE_SHEETS_CONFIG = {
  // Main Google Sheet URL - CHANGE THIS TO USE A DIFFERENT SHEET
  SHEET_URL:
    "https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing",

  // Google Apps Script Web App URL (you need to create this)
  // Instructions:
  // 1. Go to script.google.com
  // 2. Create new project
  // 3. Copy the Apps Script code from console logs when you place an order
  // 4. Deploy as web app (execute as "Me", access for "Anyone")
  // 5. Copy the web app URL here
  WEB_APP_URL: "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",

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
    "Coordinates",
  ],

  // Enable/disable Google Sheets integration
  ENABLED: true,
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
