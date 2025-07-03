// Google Sheets Integration Service
// This service allows easy switching between different Google Sheets

import {
  GOOGLE_SHEETS_CONFIG,
  validateGoogleSheetsConfig,
} from "../config/googleSheets";

interface OrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  services: string[];
  totalAmount: number;
  pickupDate: string;
  pickupTime: string;
  status: string;
  createdAt: string;
}

class GoogleSheetsService {
  private static instance: GoogleSheetsService;

  // Configuration from config file
  private config = {
    sheetUrl: GOOGLE_SHEETS_CONFIG.SHEET_URL,
    webAppUrl: GOOGLE_SHEETS_CONFIG.WEB_APP_URL,
    sheetName: GOOGLE_SHEETS_CONFIG.SHEET_NAME,
    enabled: GOOGLE_SHEETS_CONFIG.ENABLED,
    headers: GOOGLE_SHEETS_CONFIG.HEADERS,
  };

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();

      // Validate configuration on first instantiation
      const warnings = validateGoogleSheetsConfig();
      if (warnings.length > 0) {
        console.warn("Google Sheets configuration warnings:", warnings);
      }
    }
    return GoogleSheetsService.instance;
  }

  /**
   * Update the Google Sheet URL - allows easy switching between sheets
   */
  public updateSheetUrl(newUrl: string): void {
    this.config.sheetUrl = newUrl;
    console.log(`📊 Google Sheet URL updated to: ${newUrl}`);
  }

  /**
   * Update the Google Apps Script Web App URL
   */
  public updateWebAppUrl(newUrl: string): void {
    this.config.webAppUrl = newUrl;
    console.log(`🔗 Web App URL updated to: ${newUrl}`);
  }

  /**
   * Get current configuration
   */
  public getConfig() {
    return { ...this.config };
  }

  /**
   * Save order data to Google Sheets via backend API
   */
  public async saveOrderToSheet(orderData: OrderData): Promise<boolean> {
    // Check if Google Sheets integration is enabled
    if (!this.config.enabled) {
      console.log("📊 Google Sheets integration is disabled");
      return false;
    }

    try {
      // Generate unique order ID
      const orderId = `${orderData.customerPhone}${new Date().toLocaleDateString("en-IN").replace(/\//g, "")}${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "")}`;

      // Prepare data for Google Sheets
      const sheetData = {
        sheetName: this.config.sheetName,
        data: {
          orderId: orderId,
          timestamp: new Date().toISOString(),
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          services: Array.isArray(orderData.services)
            ? orderData.services.join(", ")
            : orderData.services,
          totalAmount: orderData.totalAmount,
          pickupDate: orderData.pickupDate,
          pickupTime: orderData.pickupTime,
          status: orderData.status,
          paymentStatus: "pending",
          coordinates: "",
          city: this.extractCityFromAddress(orderData.customerAddress),
          pincode: this.extractPincodeFromAddress(orderData.customerAddress),
        },
      };

      console.log("📊 Sending order data to Google Sheets:", sheetData);

      // Send to Google Apps Script with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this.config.webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sheetData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("📊 Order data sent to Google Sheets:", orderId);
      return true;
    } catch (error) {
      console.error("❌ Failed to save to Google Sheets:", error);

      // Fallback: Save to localStorage for later sync
      this.saveToLocalStorage(orderData);
      return false;
    }
  }

  /**
   * Extract city from address string
   */
  private extractCityFromAddress(address: string): string {
    if (typeof address === "object" && address !== null) {
      return (address as any).city || "";
    }
    const parts = address.split(",").map((part) => part.trim());
    // Usually city is in the second to last or third to last position
    return parts[parts.length - 2] || parts[parts.length - 3] || "";
  }

  /**
   * Extract pincode from address string
   */
  private extractPincodeFromAddress(address: string): string {
    if (typeof address === "object" && address !== null) {
      return (address as any).pincode || "";
    }
    const pincodeMatch = address.match(/\b\d{6}\b/);
    return pincodeMatch ? pincodeMatch[0] : "";
  }

  /**
   * Save to localStorage when Google Sheets is unavailable
   */
  private saveToLocalStorage(orderData: OrderData): void {
    try {
      const existingData = localStorage.getItem("pending_sheet_orders");
      const pendingOrders = existingData ? JSON.parse(existingData) : [];

      pendingOrders.push({
        ...orderData,
        pendingSince: new Date().toISOString(),
      });

      localStorage.setItem(
        "pending_sheet_orders",
        JSON.stringify(pendingOrders),
      );
      console.log("💾 Order saved to localStorage for later sync");
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  /**
   * Retry sending pending orders to Google Sheets
   */
  public async syncPendingOrders(): Promise<void> {
    try {
      const existingData = localStorage.getItem("pending_sheet_orders");
      if (!existingData) return;

      const pendingOrders = JSON.parse(existingData);
      const successfulSyncs: string[] = [];

      for (const order of pendingOrders) {
        const success = await this.saveOrderToSheet(order);
        if (success) {
          successfulSyncs.push(order.orderId);
        }
      }

      // Remove successfully synced orders
      if (successfulSyncs.length > 0) {
        const remainingOrders = pendingOrders.filter(
          (order: any) => !successfulSyncs.includes(order.orderId),
        );

        if (remainingOrders.length === 0) {
          localStorage.removeItem("pending_sheet_orders");
        } else {
          localStorage.setItem(
            "pending_sheet_orders",
            JSON.stringify(remainingOrders),
          );
        }

        console.log(
          `✅ Synced ${successfulSyncs.length} pending orders to Google Sheets`,
        );
      }
    } catch (error) {
      console.error("Failed to sync pending orders:", error);
    }
  }

  /**
   * Get the direct link to view the Google Sheet
   */
  public getSheetViewUrl(): string {
    return this.config.sheetUrl;
  }

  /**
   * Generate Google Apps Script code for the webhook
   * This needs to be deployed as a web app in Google Apps Script
   */
  public generateAppsScriptCode(): string {
    return `
// Google Apps Script code for receiving order data
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheetName || 'Orders');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({error: 'Sheet not found'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Add data to the sheet
    sheet.appendRow([
      data.data.orderId,
      data.data.timestamp,
      data.data.customerName,
      data.data.customerPhone,
      data.data.customerAddress,
      data.data.services,
      data.data.totalAmount,
      data.data.pickupDate,
      data.data.pickupTime,
      data.data.status,
      data.data.coordinates
    ]);

    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function doGet() {
  return ContentService.createTextOutput('Google Sheets Order Webhook is running!')
    .setMimeType(ContentService.MimeType.TEXT);
}
`;
  }
}

export default GoogleSheetsService;
export type { OrderData };
