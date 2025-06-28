// Google Sheets Integration Service
// This service allows easy switching between different Google Sheets

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

  // Configuration - easily changeable
  private config = {
    // Current Google Sheet URL - easily replaceable
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1CGrATwhNTjWbSVMfhvwBLLGtGycXBCjzEQQ_3hnGNs0/edit?usp=sharing",

    // Google Apps Script Web App URL for writing data
    // You need to create a Google Apps Script that accepts POST requests
    webAppUrl: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",

    // Sheet name where orders will be saved
    sheetName: "Orders",

    // Column mapping for the sheet
    columns: {
      orderId: "A",
      timestamp: "B",
      customerName: "C",
      customerPhone: "D",
      customerAddress: "E",
      services: "F",
      totalAmount: "G",
      pickupDate: "H",
      pickupTime: "I",
      status: "J",
      coordinates: "K",
    },
  };

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
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
   * Save order data to Google Sheets
   */
  public async saveOrderToSheet(orderData: OrderData): Promise<boolean> {
    try {
      // Prepare data for Google Sheets
      const sheetData = {
        sheetName: this.config.sheetName,
        data: {
          orderId: orderData.orderId,
          timestamp: new Date().toISOString(),
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          services: orderData.services.join(", "),
          totalAmount: orderData.totalAmount,
          pickupDate: orderData.pickupDate,
          pickupTime: orderData.pickupTime,
          status: orderData.status,
          coordinates: "", // Will be filled if available
        },
      };

      // Send to Google Apps Script
      const response = await fetch(this.config.webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sheetData),
        mode: "no-cors", // Required for Google Apps Script
      });

      console.log("📊 Order data sent to Google Sheets:", orderData.orderId);
      return true;
    } catch (error) {
      console.error("❌ Failed to save to Google Sheets:", error);

      // Fallback: Save to localStorage for later sync
      this.saveToLocalStorage(orderData);
      return false;
    }
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
