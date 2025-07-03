#!/usr/bin/env node

const GoogleSheetsService = require("../services/googleSheetsService");

async function setupGoogleSheets() {
  console.log("🚀 Setting up Google Sheets integration...");

  const sheetsService = new GoogleSheetsService();

  try {
    await sheetsService.initialize();

    // Add headers to the sheet
    await sheetsService.addHeaders();

    console.log("✅ Google Sheets setup completed successfully!");
    console.log("\n📋 Next Steps:");
    console.log(
      "1. Make sure your Google Sheet is shared with the service account email",
    );
    console.log("2. Update GOOGLE_SHEET_ID in your .env file");
    console.log(
      "3. Update GOOGLE_SERVICE_ACCOUNT_KEY with your actual credentials",
    );
    console.log("4. Set GOOGLE_SHEETS_ENABLED=true in your .env file");
    console.log(
      "\n📊 Your MongoDB changes will now automatically sync to Google Sheets!",
    );
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("• Check your Google Service Account credentials");
    console.log("• Verify the Google Sheet ID is correct");
    console.log("• Ensure the Google Sheets API is enabled in your project");
    console.log("• Make sure the service account has access to the sheet");
  }

  process.exit(0);
}

if (require.main === module) {
  setupGoogleSheets();
}

module.exports = { setupGoogleSheets };
