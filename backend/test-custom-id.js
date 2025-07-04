const mongoose = require("mongoose");

// Just test the ID generation function without actual DB connection
async function generateCustomOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;

  // Simulate no existing bookings (first booking)
  let letter = "A";
  let sequence = 1;

  const sequenceStr = String(sequence).padStart(5, "0");
  return `${letter}${yearMonth}${sequenceStr}`;
}

// Test the function
generateCustomOrderId()
  .then((id) => {
    console.log("✅ Generated custom order ID:", id);
    console.log("Expected format: A20250100001 for January 2025");
  })
  .catch((error) => {
    console.error("❌ Error:", error);
  });
