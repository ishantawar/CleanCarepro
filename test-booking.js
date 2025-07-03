// Simple test script to verify booking creation
const testBookingCreation = async () => {
  try {
    console.log("Testing booking creation...");

    const testBookingData = {
      customer_id: "test_user_123",
      service: "Laundry Service",
      service_type: "home-service",
      services: ["Wash & Fold", "Dry Cleaning"],
      scheduled_date: "2024-07-05",
      scheduled_time: "10:00",
      provider_name: "CleanCare Pro",
      address: "Test Address, New Delhi, India",
      total_price: 200,
      final_amount: 200,
      coordinates: { lat: 28.6139, lng: 77.209 },
    };

    const response = await fetch("http://localhost:3001/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testBookingData),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    const result = await response.text();
    console.log("Response body:", result);

    if (response.ok) {
      console.log("✅ Booking creation successful!");
      try {
        const jsonResult = JSON.parse(result);
        console.log("Booking ID:", jsonResult.booking?._id);
      } catch (e) {
        console.log("Response is not JSON");
      }
    } else {
      console.log("❌ Booking creation failed");
    }
  } catch (error) {
    console.error("Test error:", error);
  }
};

testBookingCreation();
