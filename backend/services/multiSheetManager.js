const { google } = require("googleapis");

class MultiSheetManager {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.isEnabled = process.env.GOOGLE_SHEETS_ENABLED === "true";

    // Sheet configurations
    this.sheetsConfig = {
      services: {
        sheetId: process.env.SERVICES_SHEET_ID,
        range: "Services!A:M",
        description: "Service catalog management",
      },
      orders: {
        sheetId: process.env.GOOGLE_SHEET_ID, // Your existing orders sheet
        range: "Orders!A:Z",
        description: "Order bookings",
      },
    };
  }

  async initialize() {
    if (!this.isEnabled) {
      console.log("📊 Multi-sheet Google Sheets integration disabled");
      return;
    }

    try {
      // Initialize Google Auth
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
          ],
        });
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
        this.auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
          scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
          ],
        });
      } else {
        console.log(
          "⚠️ No Google Service Account credentials found for multi-sheet manager",
        );
        return;
      }

      this.sheets = google.sheets({ version: "v4", auth: this.auth });

      // Test connections to all configured sheets
      await this.testConnections();

      console.log(
        "✅ Multi-sheet Google Sheets integration initialized successfully",
      );
    } catch (error) {
      console.error(
        "❌ Failed to initialize multi-sheet manager:",
        error.message,
      );
    }
  }

  async testConnections() {
    if (!this.sheets) return;

    const results = {};

    for (const [sheetType, config] of Object.entries(this.sheetsConfig)) {
      if (config.sheetId) {
        try {
          await this.sheets.spreadsheets.get({
            spreadsheetId: config.sheetId,
          });
          results[sheetType] = {
            status: "connected",
            description: config.description,
          };
          console.log(
            `✅ ${sheetType} sheet connection successful (${config.description})`,
          );
        } catch (error) {
          results[sheetType] = {
            status: "error",
            error: error.message,
            description: config.description,
          };
          console.error(
            `❌ ${sheetType} sheet connection failed:`,
            error.message,
          );
        }
      } else {
        results[sheetType] = {
          status: "not_configured",
          description: config.description,
        };
        console.log(`⚠️ ${sheetType} sheet not configured`);
      }
    }

    return results;
  }

  // Services Sheet Operations
  async getServicesData() {
    return this.readSheet("services");
  }

  async updateServicesData(data) {
    return this.writeSheet("services", data);
  }

  // Orders Sheet Operations
  async addOrderToSheet(orderData) {
    if (!this.sheets || !this.sheetsConfig.orders.sheetId) {
      throw new Error("Orders sheet not configured");
    }

    try {
      const rowData = this.formatOrderData(orderData);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetsConfig.orders.sheetId,
        range: this.sheetsConfig.orders.range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [rowData],
        },
      });

      console.log(
        `📊 Order added to Google Sheets: ${orderData.orderId || "unknown"}`,
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to add order to Google Sheets:", error.message);
      throw error;
    }
  }

  async getOrdersData() {
    return this.readSheet("orders");
  }

  // Generic sheet operations
  async readSheet(sheetType) {
    const config = this.sheetsConfig[sheetType];
    if (!this.sheets || !config || !config.sheetId) {
      throw new Error(`${sheetType} sheet not configured`);
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.sheetId,
        range: config.range,
      });

      console.log(`📊 Successfully read ${sheetType} sheet data`);
      return response.data.values || [];
    } catch (error) {
      console.error(`❌ Failed to read ${sheetType} sheet:`, error.message);
      throw error;
    }
  }

  async writeSheet(sheetType, data) {
    const config = this.sheetsConfig[sheetType];
    if (!this.sheets || !config || !config.sheetId) {
      throw new Error(`${sheetType} sheet not configured`);
    }

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.sheetId,
        range: config.range,
        valueInputOption: "RAW",
        resource: {
          values: data,
        },
      });

      console.log(`📊 Successfully updated ${sheetType} sheet`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update ${sheetType} sheet:`, error.message);
      throw error;
    }
  }

  async appendToSheet(sheetType, rowData) {
    const config = this.sheetsConfig[sheetType];
    if (!this.sheets || !config || !config.sheetId) {
      throw new Error(`${sheetType} sheet not configured`);
    }

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.sheetId,
        range: config.range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [rowData],
        },
      });

      console.log(`📊 Successfully appended to ${sheetType} sheet`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to append to ${sheetType} sheet:`,
        error.message,
      );
      throw error;
    }
  }

  // Format order data for the orders sheet
  formatOrderData(orderData) {
    return [
      orderData.orderId || `order_${Date.now()}`,
      orderData.customerName || "",
      orderData.customerPhone || "",
      orderData.customerAddress || "",
      Array.isArray(orderData.services)
        ? orderData.services.join(", ")
        : orderData.services || "",
      orderData.totalAmount || 0,
      orderData.pickupDate || "",
      orderData.pickupTime || "",
      orderData.status || "pending",
      orderData.paymentStatus || "pending",
      orderData.coordinates
        ? `${orderData.coordinates.lat},${orderData.coordinates.lng}`
        : "",
      orderData.specialInstructions || "",
      new Date().toISOString(), // Created at
      new Date().toISOString(), // Updated at
    ];
  }

  // Add headers to sheets if they don't exist
  async addOrdersHeaders() {
    if (!this.sheets || !this.sheetsConfig.orders.sheetId) return;

    try {
      const headers = [
        "Order ID",
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
        "Special Instructions",
        "Created At",
        "Updated At",
      ];

      // Check if headers already exist
      const existingData = await this.readSheet("orders");
      if (existingData.length === 0 || !existingData[0].includes("Order ID")) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetsConfig.orders.sheetId,
          range: "Orders!A1:N1",
          valueInputOption: "RAW",
          resource: {
            values: [headers],
          },
        });
        console.log("📊 Orders headers added to Google Sheets");
      }
    } catch (error) {
      console.error("❌ Failed to add orders headers:", error.message);
    }
  }

  async addServicesHeaders() {
    if (!this.sheets || !this.sheetsConfig.services.sheetId) return;

    try {
      const headers = [
        "Category ID",
        "Category Name",
        "Category Icon",
        "Category Color",
        "Category Description",
        "Service ID",
        "Service Name",
        "Price",
        "Unit",
        "Description",
        "Popular",
        "Enabled",
        "Image URL",
      ];

      // Check if headers already exist
      const existingData = await this.readSheet("services");
      if (
        existingData.length === 0 ||
        !existingData[0].includes("Category ID")
      ) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetsConfig.services.sheetId,
          range: "Services!A1:M1",
          valueInputOption: "RAW",
          resource: {
            values: [headers],
          },
        });
        console.log("📊 Services headers added to Google Sheets");
      }
    } catch (error) {
      console.error("❌ Failed to add services headers:", error.message);
    }
  }

  // Get configuration status
  getConfiguration() {
    return {
      enabled: this.isEnabled,
      sheets: Object.entries(this.sheetsConfig).map(([type, config]) => ({
        type,
        configured: !!config.sheetId,
        sheetId: config.sheetId,
        description: config.description,
      })),
    };
  }

  // Health check for all sheets
  async healthCheck() {
    if (!this.isEnabled) {
      return {
        status: "disabled",
        message: "Google Sheets integration disabled",
      };
    }

    try {
      const connections = await this.testConnections();
      const allConnected = Object.values(connections).every(
        (conn) => conn.status === "connected",
      );

      return {
        status: allConnected ? "healthy" : "partial",
        connections,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async cleanup() {
    console.log("📊 Multi-sheet manager cleaned up");
  }
}

module.exports = MultiSheetManager;
