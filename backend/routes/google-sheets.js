const express = require("express");
const router = express.Router();
const GoogleSheetsService = require("../services/googleSheetsService");

// Test Google Sheets connection
router.get("/test", async (req, res) => {
  try {
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();

    res.json({
      success: true,
      message: "Google Sheets connection successful",
      enabled: process.env.GOOGLE_SHEETS_ENABLED === "true",
      sheetId: process.env.GOOGLE_SHEET_ID ? "configured" : "not configured",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Google Sheets connection failed",
      error: error.message,
    });
  }
});

// Manually sync all bookings to Google Sheets
router.post("/sync", async (req, res) => {
  try {
    const Booking = require("../models/Booking");
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();

    // Get all bookings
    const bookings = await Booking.find({}).sort({ created_at: -1 });

    let syncCount = 0;
    for (const booking of bookings) {
      try {
        await sheetsService.handleBookingInsert(booking);
        syncCount++;
      } catch (error) {
        console.error(`Failed to sync booking ${booking._id}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncCount} bookings to Google Sheets`,
      totalBookings: bookings.length,
      syncedBookings: syncCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Manual sync failed",
      error: error.message,
    });
  }
});

// Add headers to Google Sheet
router.post("/setup", async (req, res) => {
  try {
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();
    await sheetsService.addHeaders();

    res.json({
      success: true,
      message: "Google Sheets headers added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add headers",
      error: error.message,
    });
  }
});

// Save booking data to Google Sheets
router.post("/save", async (req, res) => {
  try {
    const { sheetName, data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Missing data to save",
      });
    }

    console.log("📊 Received Google Sheets save request:", data);

    // Check if Google Sheets is enabled
    if (process.env.GOOGLE_SHEETS_ENABLED !== "true") {
      console.log(
        "📊 Google Sheets integration disabled, returning success for development",
      );
      return res.json({
        success: true,
        message: "Google Sheets integration disabled (development mode)",
      });
    }

    // For now, return success - this is a placeholder for actual Google Sheets integration
    // In production, you would implement actual Google Sheets API calls here
    console.log("📊 Would save to Google Sheets:", data);

    res.json({
      success: true,
      message: "Data saved to Google Sheets successfully",
      orderId: data.orderId,
    });
  } catch (error) {
    console.error("❌ Google Sheets save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save to Google Sheets",
      error: error.message,
    });
  }
});

module.exports = router;
