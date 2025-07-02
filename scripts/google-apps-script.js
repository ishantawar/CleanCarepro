/**
 * Google Apps Script for CleanCare Pro Order Management
 * Deploy this as a web app to enable Google Sheets integration
 */

// Configuration
const SHEET_NAME = "Orders";
const TIMEZONE = "Asia/Kolkata";

// Main function to handle POST requests from the website
function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    console.log("Received data:", data);

    // Get or create the sheet
    const sheet = getOrCreateSheet(data.sheetName || SHEET_NAME);

    // Add the order data to the sheet
    const result = addOrderToSheet(sheet, data.data);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Order added successfully",
        rowNumber: result.rowNumber,
        timestamp: result.timestamp,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error processing request:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  const html = `
    <h1>CleanCare Pro Order Webhook</h1>
    <p>Status: <strong style="color: green;">Active</strong></p>
    <p>This endpoint receives order data from the CleanCare Pro website.</p>
    <p>Last updated: ${new Date().toLocaleString("en-IN", { timeZone: TIMEZONE })}</p>
  `;

  return HtmlService.createHtmlOutput(html);
}

// Get existing sheet or create new one
function getOrCreateSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    // Create new sheet
    sheet = spreadsheet.insertSheet(sheetName);

    // Add headers
    const headers = [
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
      "Created Date",
      "Order Source",
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");

    console.log("Created new sheet:", sheetName);
  }

  return sheet;
}

// Add order data to the sheet
function addOrderToSheet(sheet, orderData) {
  try {
    const timestamp = new Date();
    const istTime = Utilities.formatDate(
      timestamp,
      TIMEZONE,
      "dd/MM/yyyy HH:mm:ss",
    );

    // Prepare row data
    const rowData = [
      orderData.orderId || generateOrderId(),
      istTime,
      orderData.customerName || "",
      orderData.customerPhone || "",
      orderData.customerAddress || "",
      orderData.services || "",
      orderData.totalAmount || 0,
      orderData.pickupDate || "",
      orderData.pickupTime || "",
      orderData.status || "pending",
      orderData.paymentStatus || "pending",
      orderData.coordinates || "",
      orderData.city || extractCityFromAddress(orderData.customerAddress),
      orderData.pincode || extractPincodeFromAddress(orderData.customerAddress),
      Utilities.formatDate(timestamp, TIMEZONE, "dd/MM/yyyy"),
      "Website",
    ];

    // Add the row to the sheet
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;

    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);

    // Auto-resize columns
    sheet.autoResizeColumns(1, rowData.length);

    console.log("Added order to row:", newRowNumber);

    return {
      rowNumber: newRowNumber,
      timestamp: istTime,
    };
  } catch (error) {
    console.error("Error adding order to sheet:", error);
    throw new Error("Failed to add order to sheet: " + error.message);
  }
}

// Generate a unique order ID
function generateOrderId() {
  const timestamp = new Date();
  const dateStr = Utilities.formatDate(timestamp, TIMEZONE, "ddMMyyyy");
  const timeStr = Utilities.formatDate(timestamp, TIMEZONE, "HHmm");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `ORD${dateStr}${timeStr}${random}`;
}

// Extract city from address string
function extractCityFromAddress(address) {
  if (!address) return "";

  const parts = address.split(",").map((part) => part.trim());
  // Usually city is in the second to last or third to last position
  return parts[parts.length - 2] || parts[parts.length - 3] || "";
}

// Extract pincode from address string
function extractPincodeFromAddress(address) {
  if (!address) return "";

  const pincodeMatch = address.match(/\b\d{6}\b/);
  return pincodeMatch ? pincodeMatch[0] : "";
}

// Test function for manual testing
function testWebhook() {
  const testData = {
    sheetName: "Orders",
    data: {
      orderId: "TEST123",
      customerName: "Test Customer",
      customerPhone: "9876543210",
      customerAddress: "Test Address, Test City, 123456",
      services: "Shirt, Trouser",
      totalAmount: 210,
      pickupDate: "2024-01-15",
      pickupTime: "10:00",
      status: "pending",
      paymentStatus: "pending",
    },
  };

  const mockRequest = {
    postData: {
      contents: JSON.stringify(testData),
    },
  };

  const result = doPost(mockRequest);
  console.log("Test result:", result.getContent());
}
