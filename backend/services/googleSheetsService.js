const { google } = require("googleapis");
const mongoose = require("mongoose");

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.SHEET_ID = process.env.GOOGLE_SHEET_ID;
    this.isEnabled = process.env.GOOGLE_SHEETS_ENABLED === "true";
    this.changeStream = null;
  }

  async initialize() {
    if (!this.isEnabled) {
      console.log(
        "📊 Google Sheets integration disabled (set GOOGLE_SHEETS_ENABLED=true to enable)",
      );
      return;
    }

    console.log("✅ Google Sheets integration enabled");

    try {
      // Initialize Google Auth
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
        this.auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
      } else {
        console.log("⚠️ No Google Service Account credentials found");
        return;
      }

      this.sheets = google.sheets({ version: "v4", auth: this.auth });

      // Test the connection
      await this.testConnection();

      // Setup MongoDB change streams
      this.setupChangeStreams();

      console.log("✅ Google Sheets integration initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Google Sheets:", error.message);
    }
  }

  async testConnection() {
    if (!this.sheets || !this.SHEET_ID) return;

    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.SHEET_ID,
      });
      console.log("✅ Google Sheets connection successful");
    } catch (error) {
      throw new Error(`Google Sheets connection failed: ${error.message}`);
    }
  }

  async setupChangeStreams() {
    if (!mongoose.connection.readyState) {
      console.log("⚠️ MongoDB not connected, waiting...");
      mongoose.connection.once("connected", () => this.setupChangeStreams());
      return;
    }

    try {
      const Booking = require("../models/Booking");

      // Watch for changes in the Booking collection
      this.changeStream = Booking.watch();

      this.changeStream.on("change", async (change) => {
        try {
          switch (change.operationType) {
            case "insert":
              await this.handleBookingInsert(change.fullDocument);
              break;
            case "update":
              await this.handleBookingUpdate(
                change.fullDocument,
                change.updateDescription,
              );
              break;
            case "delete":
              await this.handleBookingDelete(change.documentKey._id);
              break;
          }
        } catch (error) {
          console.error("❌ Error handling change stream:", error);
        }
      });

      this.changeStream.on("error", (error) => {
        console.error("❌ Change stream error:", error);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.setupChangeStreams(), 5000);
      });

      console.log("👂 Listening to MongoDB changes for Google Sheets sync...");
    } catch (error) {
      console.error("❌ Failed to setup change streams:", error.message);
    }
  }

  async handleBookingInsert(booking) {
    if (!this.sheets || !this.SHEET_ID) return;

    try {
      const rowData = this.formatBookingData(booking);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: "Orders!A:Z", // Use a wider range to accommodate all columns
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [rowData],
        },
      });

      console.log(`📊 New booking added to Google Sheets: ${booking._id}`);
    } catch (error) {
      console.error(
        "❌ Failed to add booking to Google Sheets:",
        error.message,
      );
    }
  }

  async handleBookingUpdate(booking, updateDescription) {
    if (!this.sheets || !this.SHEET_ID) return;

    try {
      // Find the row with this booking ID and update it
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.SHEET_ID,
        range: "Orders!A:A", // Get all booking IDs
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(
        (row) => row[0] === booking._id.toString(),
      );

      if (rowIndex !== -1) {
        const rowData = this.formatBookingData(booking);
        const range = `Orders!A${rowIndex + 1}:Z${rowIndex + 1}`;

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.SHEET_ID,
          range,
          valueInputOption: "RAW",
          resource: {
            values: [rowData],
          },
        });

        console.log(`📊 Booking updated in Google Sheets: ${booking._id}`);
      }
    } catch (error) {
      console.error(
        "❌ Failed to update booking in Google Sheets:",
        error.message,
      );
    }
  }

  async handleBookingDelete(bookingId) {
    if (!this.sheets || !this.SHEET_ID) return;

    try {
      // Find and delete the row with this booking ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.SHEET_ID,
        range: "Orders!A:A",
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] === bookingId.toString());

      if (rowIndex !== -1) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.SHEET_ID,
          resource: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: 0, // Assuming first sheet
                    dimension: "ROWS",
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1,
                  },
                },
              },
            ],
          },
        });

        console.log(`📊 Booking deleted from Google Sheets: ${bookingId}`);
      }
    } catch (error) {
      console.error(
        "❌ Failed to delete booking from Google Sheets:",
        error.message,
      );
    }
  }

  formatBookingData(booking) {
    return [
      booking._id.toString(),
      booking.customer_id || "",
      booking.service || "",
      booking.service_type || "",
      Array.isArray(booking.services)
        ? booking.services.join(", ")
        : booking.services || "",
      booking.scheduled_date || "",
      booking.scheduled_time || "",
      booking.provider_name || "",
      booking.address || "",
      booking.coordinates
        ? `${booking.coordinates.lat},${booking.coordinates.lng}`
        : "",
      booking.total_price || 0,
      booking.discount_amount || 0,
      booking.final_amount || 0,
      booking.payment_status || "pending",
      booking.status || "pending",
      booking.special_instructions || "",
      new Date(booking.created_at || Date.now()).toISOString(),
      new Date(booking.updated_at || Date.now()).toISOString(),
    ];
  }

  async addHeaders() {
    if (!this.sheets || !this.SHEET_ID) return;

    try {
      const headers = [
        "Booking ID",
        "Customer ID",
        "Service",
        "Service Type",
        "Services List",
        "Scheduled Date",
        "Scheduled Time",
        "Provider Name",
        "Address",
        "Coordinates",
        "Total Price",
        "Discount Amount",
        "Final Amount",
        "Payment Status",
        "Status",
        "Special Instructions",
        "Created At",
        "Updated At",
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.SHEET_ID,
        range: "Orders!A1:R1",
        valueInputOption: "RAW",
        resource: {
          values: [headers],
        },
      });

      console.log("📊 Headers added to Google Sheets");
    } catch (error) {
      console.error("❌ Failed to add headers:", error.message);
    }
  }

  async cleanup() {
    if (this.changeStream) {
      await this.changeStream.close();
      console.log("📊 Google Sheets change stream closed");
    }
  }
}

module.exports = GoogleSheetsService;
