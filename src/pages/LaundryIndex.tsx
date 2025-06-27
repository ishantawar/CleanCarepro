import React, { useState, useEffect } from "react";
import ResponsiveLaundryHome from "../components/ResponsiveLaundryHome";
import LaundryCart from "../components/LaundryCart";
import EnhancedBookingHistory from "@/components/EnhancedBookingHistory";
import PhoneOtpAuthModal from "@/components/PhoneOtpAuthModal";
import { DVHostingSmsService } from "../services/dvhostingSmsService";
import PushNotificationService from "../services/pushNotificationService";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  createSuccessNotification,
  createErrorNotification,
} from "@/utils/notificationUtils";

const LaundryIndex = () => {
  const { addNotification } = useNotifications();
  const [currentView, setCurrentView] = useState("home");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("");

  const authService = DVHostingSmsService.getInstance();
  const pushService = PushNotificationService.getInstance();

  // Initialize PWA and check auth state
  useEffect(() => {
    initializeApp();
    checkAuthState();
    getUserLocation();
  }, []);

  const initializeApp = async () => {
    // Initialize PWA features
    await pushService.initializePWA();

    // Add manifest link to head if not present
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "/manifest.json";
      document.head.appendChild(manifestLink);
    }

    // Add theme color meta tag
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColorMeta = document.createElement("meta");
      themeColorMeta.name = "theme-color";
      themeColorMeta.content = "#22c55e";
      document.head.appendChild(themeColorMeta);
    }
  };

  const checkAuthState = async () => {
    try {
      // Check if user is logged in via Fast2SMS
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          console.log("✅ User already logged in:", user.name || user.phone);
        } else {
          setIsLoggedIn(false);
          console.log("ℹ️ No authenticated user found");
        }
      } else {
        setIsLoggedIn(false);
        console.log("ℹ️ No user authentication found");
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      setIsLoggedIn(false);
    }
  };

  const getUserLocation = async () => {
    setCurrentLocation("Detecting location...");

    if (!navigator.geolocation) {
      setCurrentLocation("India");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Store coordinates for later use
          console.log(`📍 Location coordinates: ${latitude}, ${longitude}`);

          // Set coordinates immediately for a quick response
          setCurrentLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);

          // Try to get readable address with multiple fallbacks
          try {
            const displayLocation = await getReverseGeocodedLocation(
              latitude,
              longitude,
            );

            if (displayLocation && displayLocation.trim()) {
              setCurrentLocation(displayLocation);
              console.log("��� Final location set:", displayLocation);
            } else {
              // If no location found, use coordinate-based fallback
              const fallbackLocation = getCoordinateBasedLocation(
                latitude,
                longitude,
              );
              setCurrentLocation(fallbackLocation);
              console.log("🔄 Using coordinate fallback:", fallbackLocation);
            }
          } catch (geocodingError) {
            console.error("❌ All geocoding methods failed:", geocodingError);
            // Use coordinate-based fallback when geocoding fails
            const fallbackLocation = getCoordinateBasedLocation(
              latitude,
              longitude,
            );
            setCurrentLocation(fallbackLocation);
            console.log("🆘 Emergency fallback:", fallbackLocation);
          }
        } catch (error) {
          console.error("❌ Position processing error:", error);
          // Fallback to a generic location
          setCurrentLocation("Your Location");
        }
      },
      (error) => {
        console.error("Geolocation error:", {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT,
        });

        let locationMessage = "Enable location access";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            locationMessage = "Location access denied";
            break;
          case error.POSITION_UNAVAILABLE:
            locationMessage = "Location unavailable";
            break;
          case error.TIMEOUT:
            locationMessage = "Location request timeout";
            break;
          default:
            locationMessage = "Enable location access";
        }

        setCurrentLocation(locationMessage);
      },
      {
        enableHighAccuracy: false, // Less accurate but faster
        timeout: 10000, // Reduced timeout
        maximumAge: 600000, // Cache for 10 minutes
      },
    );
  };

  // Helper function for coordinate-based location detection (fallback)
  const getCoordinateBasedLocation = (
    latitude: number,
    longitude: number,
  ): string => {
    console.log(
      `🎯 Using coordinate-based fallback for: ${latitude}, ${longitude}`,
    );

    // Check if coordinates are within India
    if (latitude >= 8 && latitude <= 37 && longitude >= 68 && longitude <= 97) {
      // Rough approximations for major Indian cities
      if (
        latitude >= 28.4 &&
        latitude <= 28.8 &&
        longitude >= 76.8 &&
        longitude <= 77.3
      ) {
        return "Delhi";
      } else if (
        latitude >= 18.8 &&
        latitude <= 19.3 &&
        longitude >= 72.7 &&
        longitude <= 73.0
      ) {
        return "Mumbai";
      } else if (
        latitude >= 12.8 &&
        latitude <= 13.1 &&
        longitude >= 77.4 &&
        longitude <= 77.8
      ) {
        return "Bangalore";
      } else if (
        latitude >= 22.4 &&
        latitude <= 22.7 &&
        longitude >= 88.2 &&
        longitude <= 88.5
      ) {
        return "Kolkata";
      } else if (
        latitude >= 17.2 &&
        latitude <= 17.6 &&
        longitude >= 78.2 &&
        longitude <= 78.7
      ) {
        return "Hyderabad";
      } else if (
        latitude >= 13.0 &&
        latitude <= 13.2 &&
        longitude >= 80.1 &&
        longitude <= 80.3
      ) {
        return "Chennai";
      } else {
        return "India"; // Generic fallback for India
      }
    }

    // For international coordinates, return a generic location
    return "Your Location";
  };

  // Helper function for reverse geocoding with multiple fallbacks
  const getReverseGeocodedLocation = async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    console.log(
      `🔄 Attempting reverse geocoding for: ${latitude}, ${longitude}`,
    );

    // Method 1: Try Google Maps API if available
    const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleApiKey) {
      try {
        console.log("🗺️ Trying Google Maps API...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];

            // Extract city from address components
            const cityComponent = result.address_components?.find(
              (component: any) =>
                component.types.includes("locality") ||
                component.types.includes("administrative_area_level_2"),
            );

            const stateComponent = result.address_components?.find(
              (component: any) =>
                component.types.includes("administrative_area_level_1"),
            );

            if (cityComponent) {
              const location =
                stateComponent &&
                cityComponent.long_name !== stateComponent.long_name
                  ? `${cityComponent.long_name}, ${stateComponent.long_name}`
                  : cityComponent.long_name;
              console.log("✅ Google Maps success:", location);
              return location;
            }
          }
        }
      } catch (error) {
        console.log("❌ Google Maps geocoding failed:", error);
      }
    }

    // Method 2: Try OpenStreetMap with better error handling
    try {
      console.log("🌍 Trying OpenStreetMap API...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Longer timeout for OSM

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "CleanCare-App/1.0",
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (data.address) {
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.suburb;

          const state = data.address.state;

          if (city) {
            const location =
              state && city !== state ? `${city}, ${state}` : city;
            console.log("✅ OpenStreetMap success:", location);
            return location;
          } else if (state) {
            console.log("✅ OpenStreetMap success (state only):", state);
            return state;
          }
        }
      }
    } catch (error) {
      console.log("❌ OpenStreetMap geocoding failed:", error);
    }

    // Method 3: Use coordinate-based fallback
    console.log("🔄 Using coordinate-based location detection...");
    return getCoordinateBasedLocation(latitude, longitude);
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentView("home");
    console.log("✅ User logged in successfully:", user.name || user.phone);

    // Add success notification
    addNotification(
      createSuccessNotification(
        "Welcome!",
        `Hello ${user.name || user.phone}, you're now logged in.`,
      ),
    );
  };
  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView("home");
    console.log("✅ User logged out");

    // Add logout notification
    addNotification(
      createSuccessNotification(
        "Goodbye!",
        "You have been logged out successfully.",
      ),
    );
  };

  const handleViewCart = () => {
    // Allow cart access without authentication
    setCurrentView("cart");
  };

  const handleViewBookings = () => {
    if (!currentUser) {
      // Show auth modal for bookings access
      setCurrentView("auth");
      return;
    }
    setCurrentView("bookings");
  };

  const handleProceedToCheckout = async (cartData: any) => {
    // Check if user is authenticated first
    if (!currentUser) {
      console.log("User not authenticated, switching to auth view");
      setCurrentView("auth");
      return;
    }

    console.log("Processing checkout for authenticated user:", cartData);

    try {
      // Import both booking helpers and service
      const { BookingService } = await import("../services/bookingService");
      const { bookingHelpers } = await import(
        "../integrations/mongodb/bookingHelpers"
      );

      const bookingService = BookingService.getInstance();

      // Prepare services array for MongoDB
      const servicesArray =
        cartData.services?.map((service: any) =>
          typeof service === "string" ? service : service.name,
        ) || [];

      // Create booking data for MongoDB backend
      const mongoBookingData = {
        customer_id: currentUser._id || currentUser.id,
        service: servicesArray[0] || "Laundry Service",
        service_type: "laundry",
        services: servicesArray,
        scheduled_date: cartData.pickupDate,
        scheduled_time: cartData.pickupTime,
        provider_name: "CleanCare Pro",
        address:
          typeof cartData.address === "string"
            ? cartData.address
            : cartData.address?.fullAddress || "",
        coordinates: cartData.address?.coordinates || { lat: 0, lng: 0 },
        additional_details: cartData.instructions || "",
        total_price: cartData.totalAmount,
        discount_amount: 0,
        final_amount: cartData.totalAmount,
        special_instructions: cartData.instructions || "",
        charges_breakdown: {
          base_price: cartData.totalAmount,
          tax_amount: 0,
          service_fee: 0,
          discount: 0,
        },
      };

      // Save to MongoDB backend first
      console.log("💾 Saving to MongoDB backend...");
      const mongoResult = await bookingHelpers.createBooking(mongoBookingData);

      if (mongoResult.data) {
        console.log("✅ Booking saved to MongoDB:", mongoResult.data._id);

        // Also save using booking service for local storage backup
        const localBookingData = {
          userId: currentUser._id || currentUser.id || currentUser.phone,
          services: servicesArray,
          totalAmount: cartData.totalAmount,
          status: "pending" as const,
          pickupDate: cartData.pickupDate,
          deliveryDate: cartData.deliveryDate,
          pickupTime: cartData.pickupTime,
          deliveryTime: cartData.deliveryTime,
          address: cartData.address,
          contactDetails: {
            phone: cartData.phone || currentUser.phone,
            name: currentUser.full_name || currentUser.name || "User",
            instructions: cartData.instructions,
          },
          paymentStatus: "pending" as const,
        };

        await bookingService.createBooking(localBookingData);

        // Show success message
        addNotification(
          createSuccessNotification(
            "Order Confirmed!",
            `Your order has been placed successfully! Booking ID: ${mongoResult.data._id.slice(-6)}`,
          ),
        );

        // Clear cart
        localStorage.removeItem("laundry_cart");

        // Stay on home page
        setCurrentView("home");
      } else {
        throw new Error(
          mongoResult.error?.message || "Failed to create booking in database",
        );
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      addNotification(
        createErrorNotification(
          "Order Failed",
          "Failed to place order. Please try again.",
        ),
      );
    }
  };

  return (
    <div className="min-h-screen">
      {currentView === "home" && (
        <ResponsiveLaundryHome
          currentUser={currentUser}
          userLocation={currentLocation}
          onLoginSuccess={handleLoginSuccess}
          onViewCart={handleViewCart}
          onViewBookings={handleViewBookings}
          onLogout={handleLogout}
        />
      )}

      {/* Authentication View */}
      {currentView === "auth" && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <PhoneOtpAuthModal
              isOpen={true}
              onClose={() => setCurrentView("home")}
              onSuccess={(user) => {
                handleLoginSuccess(user);
                setCurrentView("home");
              }}
            />
          </div>
        </div>
      )}

      {currentView === "bookings" && (
        <EnhancedBookingHistory
          currentUser={currentUser}
          onBack={() => setCurrentView("home")}
          onLoginRequired={() => setCurrentView("auth")}
        />
      )}

      {currentView === "cart" && (
        <LaundryCart
          onBack={() => setCurrentView("home")}
          onProceedToCheckout={handleProceedToCheckout}
          onLoginRequired={() => setCurrentView("auth")}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default LaundryIndex;
