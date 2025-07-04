import MongoDBService from "./mongodbService";
import { DVHostingSmsService } from "./dvhostingSmsService";
import { config } from "../config/env";
import GoogleSheetsService from "./googleSheetsService";

export interface BookingDetails {
  id: string;
  userId: string;
  services: string[];
  totalAmount: number;
  status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";
  pickupDate: string;
  deliveryDate: string;
  pickupTime: string;
  deliveryTime: string;
  address: string;
  contactDetails: {
    phone: string;
    name: string;
    instructions?: string;
  };
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingResponse {
  success: boolean;
  message?: string;
  error?: string;
  booking?: BookingDetails;
  bookings?: BookingDetails[];
}

export class BookingService {
  private static instance: BookingService;
  private apiBaseUrl: string;
  private mongoService: MongoDBService;
  private googleSheetsService: GoogleSheetsService;

  constructor() {
    this.mongoService = MongoDBService.getInstance();
    this.googleSheetsService = GoogleSheetsService.getInstance();
    this.apiBaseUrl = config.apiBaseUrl;

    console.log("📡 BookingService API URL:", this.apiBaseUrl);
  }

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  /**
   * Get the current user's proper MongoDB ID for booking association
   */
  private async getCurrentUserIdForBooking(): Promise<string> {
    const authService = DVHostingSmsService.getInstance();
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Always prefer phone number for consistent customer ID
    // This ensures bookings are grouped by phone number
    if (currentUser.phone) {
      console.log("📞 Using phone number as customer ID:", currentUser.phone);
      return currentUser.phone;
    }

    // If we have a MongoDB ID but no phone, use that as fallback
    if (currentUser._id) {
      console.log("🆔 Using MongoDB ID as customer ID:", currentUser._id);
      return currentUser._id;
    }

    // Final fallback
    return currentUser.id || "anonymous";
  }

  /**
   * Create a new booking
   */
  async createBooking(
    bookingData: Omit<BookingDetails, "id" | "createdAt" | "updatedAt">,
    itemPrices?: Array<{
      service_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>,
  ): Promise<BookingResponse> {
    try {
      console.log("📝 Creating new booking:", bookingData);

      // Get proper user ID for MongoDB association
      let resolvedUserId: string;

      if (bookingData.userId) {
        resolvedUserId = bookingData.userId;
      } else {
        // Get current user's MongoDB ID
        resolvedUserId = await this.getCurrentUserIdForBooking();
        console.log("✅ Resolved user ID for booking:", resolvedUserId);
      }

      // Generate booking ID
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const booking: BookingDetails = {
        ...bookingData,
        userId: resolvedUserId, // Use resolved user ID
        id: bookingId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add item prices if provided
        ...(itemPrices && { item_prices: itemPrices }),
      };

      // Always save to localStorage first for immediate availability
      this.saveBookingToLocalStorage(booking);
      console.log("💾 Booking saved to localStorage:", booking.id);

      // Save to MongoDB and backend (with improved error handling)
      let backendSaveSuccess = false;
      try {
        const mongoBooking = await this.mongoService.saveBooking(booking);
        if (mongoBooking) {
          console.log("✅ Booking saved to MongoDB:", booking.id);
          backendSaveSuccess = true;
        } else {
          console.log(
            "⚠️ MongoDB save failed, but localStorage backup available",
          );
        }
      } catch (error) {
        console.warn(
          "⚠️ MongoDB save error, but localStorage backup available:",
          error,
        );
      }

      // Try direct backend sync
      if (!backendSaveSuccess && this.apiBaseUrl) {
        try {
          await this.syncBookingToBackend(booking);
          console.log("✅ Booking synced to backend API:", booking.id);
          backendSaveSuccess = true;
        } catch (syncError) {
          console.warn("⚠️ Backend API sync failed:", syncError);
        }
      }

      // Save to Google Sheets
      try {
        const authService = DVHostingSmsService.getInstance();
        const currentUser = authService.getCurrentUser();

        const googleSheetsData = {
          orderId: `${currentUser?.phone || "User"}${new Date().toLocaleDateString("en-IN").replace(/\//g, "")}${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "")}`,
          customerName:
            currentUser?.name || currentUser?.full_name || "Customer",
          customerPhone: currentUser?.phone || "",
          customerAddress:
            typeof booking.address === "object"
              ? JSON.stringify(booking.address)
              : booking.address,
          services: Array.isArray(booking.services)
            ? booking.services
            : [booking.services],
          totalAmount: booking.totalAmount,
          pickupDate: booking.pickupDate,
          pickupTime: booking.pickupTime,
          status: booking.status,
          createdAt: booking.createdAt,
        };

        this.googleSheetsService
          .saveOrderToSheet(googleSheetsData)
          .then((result) => {
            if (result) {
              console.log("✅ Booking saved to Google Sheets");
            } else {
              console.log("ℹ️ Google Sheets save skipped or failed silently");
            }
          })
          .catch((error) => {
            console.warn(
              "⚠️ Google Sheets save failed, but booking is saved locally:",
              error,
            );
          });
      } catch (error) {
        console.warn("Google Sheets integration error:", error);
      }

      // Try to sync with backend (but don't block on it)
      if (navigator.onLine) {
        // Attempt backend sync in background (don't await)
        this.syncBookingToBackend(booking).catch((error) => {
          console.warn("Background sync failed:", error);
        });
      }

      const message = backendSaveSuccess
        ? "Booking created and saved to server successfully"
        : "Booking created (saved locally, will sync when online)";

      return {
        success: true,
        message,
        booking,
      };
    } catch (error) {
      console.error("❌ Failed to create booking:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create booking",
      };
    }
  }

  /**
   * Get current user's bookings (with automatic user ID resolution)
   */
  async getCurrentUserBookings(): Promise<BookingResponse> {
    try {
      const userId = await this.getCurrentUserIdForBooking();
      return this.getUserBookings(userId);
    } catch (error) {
      console.error("Failed to get current user bookings:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get bookings",
      };
    }
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId: string): Promise<BookingResponse> {
    console.log("📋 Loading bookings for user:", userId);

    // Get existing local bookings first to preserve recent additions
    const localBookings = this.getBookingsFromLocalStorage(userId);
    console.log("📱 Found local bookings:", localBookings.length);

    // Try to fetch from backend first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${this.apiBaseUrl}/bookings/customer/${userId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("cleancare_auth_token")}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log(
          "✅ Bookings loaded from backend:",
          result.bookings?.length || 0,
        );

        if (result.bookings && result.bookings.length > 0) {
          // Transform backend bookings to frontend format
          const transformedBookings = result.bookings.map((booking: any) =>
            this.transformBackendBooking(booking),
          );

          // Merge with local bookings (local bookings take precedence for recent additions)
          const mergedBookings = this.mergeBookings(
            localBookings,
            transformedBookings,
          );
          console.log("🔄 Merged bookings count:", mergedBookings.length);

          // Update localStorage with merged data
          this.updateLocalStorageWithMergedBookings(userId, mergedBookings);

          return {
            success: true,
            bookings: mergedBookings,
          };
        }
      } else {
        console.warn(
          `⚠️ Backend responded with ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      // Check if it's a network error or timeout
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.warn("⚠️ Backend request timed out, using localStorage");
        } else if (error.message.includes("Failed to fetch")) {
          console.warn(
            "⚠️ Network error - backend unavailable, using localStorage",
          );
        } else {
          console.warn("⚠️ Backend fetch failed:", error.message);
        }
      } else {
        console.warn("⚠️ Unknown error during backend fetch:", error);
      }
    }

    // Try MongoDB as fallback
    try {
      const mongoBookings = await this.mongoService.getUserBookings(userId);
      if (mongoBookings && mongoBookings.length > 0) {
        console.log("��� Bookings loaded from MongoDB:", mongoBookings.length);
        // Transform MongoDB bookings to match frontend format
        const transformedBookings = mongoBookings.map((booking) =>
          this.transformBackendBooking(booking),
        );
        return {
          success: true,
          bookings: transformedBookings,
        };
      }
    } catch (error) {
      console.warn("⚠️ MongoDB fetch failed:", error);
    }

    // Fallback to localStorage
    const localBookings = this.getBookingsFromLocalStorage(userId);
    console.log("📱 Using localStorage fallback:", localBookings.length);
    return {
      success: true,
      bookings: localBookings,
    };

    // Try to sync with backend in background (non-blocking)
    this.syncWithBackendInBackground(userId, localBookings);
  }

  /**
   * Background sync with backend (non-blocking)
   */
  private async syncWithBackendInBackground(
    userId: string,
    localBookings: BookingDetails[],
  ): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Short timeout for background sync

      const response = await fetch(
        `${this.apiBaseUrl}/bookings/customer/${userId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("cleancare_auth_token")}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Background sync successful:", result);

        // Transform backend bookings to frontend format
        const backendBookings = (result.bookings || []).map((booking: any) =>
          this.transformBackendBooking(booking),
        );
        const mergedBookings = this.mergeBookings(
          localBookings,
          backendBookings,
        );

        // Save merged data back to localStorage
        mergedBookings.forEach((booking) => {
          this.saveBookingToLocalStorage(booking);
        });
      }
    } catch (error) {
      console.log("ℹ️ Background sync skipped (backend unavailable)");
    }
  }

  /**
   * Transform backend booking to frontend format
   */
  private transformBackendBooking(backendBooking: any): BookingDetails {
    return {
      id: backendBooking._id || backendBooking.id,
      userId: backendBooking.customer_id,
      services: backendBooking.services?.map(
        (serviceName: string) => serviceName,
      ) || [backendBooking.service || "Home Service"],
      totalAmount:
        backendBooking.total_price || backendBooking.final_amount || 0,
      status: backendBooking.status || "pending",
      pickupDate: backendBooking.scheduled_date,
      deliveryDate: this.calculateDeliveryDate(backendBooking.scheduled_date),
      pickupTime: backendBooking.scheduled_time || "10:00",
      deliveryTime: "18:00", // Default delivery time
      address: backendBooking.address || "Address not provided",
      contactDetails: {
        phone: backendBooking.customer_id?.phone || "",
        name: backendBooking.customer_id?.full_name || "Customer",
        instructions:
          backendBooking.additional_details ||
          backendBooking.special_instructions ||
          "",
      },
      paymentStatus: backendBooking.payment_status || "pending",
      paymentMethod: "cash",
      createdAt:
        backendBooking.created_at ||
        backendBooking.createdAt ||
        new Date().toISOString(),
      updatedAt:
        backendBooking.updated_at ||
        backendBooking.updatedAt ||
        new Date().toISOString(),
    };
  }

  /**
   * Calculate delivery date from pickup date
   */
  private calculateDeliveryDate(pickupDate: string): string {
    if (!pickupDate) return new Date().toISOString().split("T")[0];

    if (pickupDate.includes("-")) {
      const [year, month, day] = pickupDate.split("-");
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day) + 1,
      );
      return date.toISOString().split("T")[0];
    }

    const date = new Date(pickupDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }

  /**
   * Merge local and backend bookings, prioritizing local for newer items
   */
  private mergeBookings(
    localBookings: BookingDetails[],
    backendBookings: BookingDetails[],
  ): BookingDetails[] {
    const localIds = new Set(localBookings.map((b) => b.id));
    const uniqueBackendBookings = backendBookings.filter(
      (b) => !localIds.has(b.id),
    );

    // Combine and sort by creation date (newest first)
    return [...localBookings, ...uniqueBackendBookings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Sync booking to backend - now throws errors for better error handling
   */
  private async syncBookingToBackend(booking: BookingDetails): Promise<void> {
    try {
      // Skip backend sync if no API URL configured (fly.dev environment)
      if (!this.apiBaseUrl) {
        console.log(
          "🌐 Skipping backend sync - no API URL configured (hosted environment)",
        );
        return;
      }

      console.log("🔄 Syncing booking to backend:", booking.id);
      console.log("📦 Original booking data:", booking);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      // Get the current user to ensure proper customer_id
      const authService = DVHostingSmsService.getInstance();
      const currentUser = authService.getCurrentUser();

      // Determine the correct customer_id format for the backend
      let customerId = booking.userId || "anonymous";

      if (currentUser) {
        // Use phone number as customer_id as that's what the backend expects
        if (currentUser.phone) {
          customerId = currentUser.phone;
        } else if (currentUser._id) {
          customerId = currentUser._id;
        } else if (currentUser.id) {
          customerId = currentUser.id;
        }
      }

      // Ensure services is a proper array with at least one service
      let servicesArray = [];
      if (Array.isArray(booking.services)) {
        servicesArray = booking.services.filter(
          (service) => service && service.trim(),
        );
      } else if (booking.services) {
        servicesArray = [booking.services];
      }

      if (servicesArray.length === 0) {
        servicesArray = ["Home Service"]; // Default service
      }

      // Ensure total_price is a valid number greater than 0
      const totalPrice = Number(
        booking.totalAmount || booking.total_price || 50,
      );
      if (isNaN(totalPrice) || totalPrice <= 0) {
        throw new Error("Invalid total price - must be greater than 0");
      }

      // Prepare address properly
      let addressString = "";
      let coordinates = { lat: 0, lng: 0 };

      if (typeof booking.address === "string") {
        addressString = booking.address;
      } else if (typeof booking.address === "object" && booking.address) {
        if (booking.address.fullAddress) {
          addressString = booking.address.fullAddress;
        } else {
          // Build address from components
          const parts = [
            booking.address.flatNo,
            booking.address.street,
            booking.address.landmark,
            booking.address.village,
            booking.address.city,
            booking.address.pincode,
          ].filter(Boolean);
          addressString = parts.join(", ");
        }

        if (booking.address.coordinates) {
          coordinates = booking.address.coordinates;
        }
      }

      if (!addressString || addressString.trim() === "") {
        addressString = "Address not provided";
      }

      const backendBooking = {
        customer_id: customerId,
        service: servicesArray.join(", "),
        service_type: "home-service",
        services: servicesArray,
        scheduled_date:
          booking.pickupDate ||
          booking.scheduled_date ||
          new Date().toISOString().split("T")[0],
        scheduled_time: booking.pickupTime || booking.scheduled_time || "10:00",
        provider_name: "CleanCare Pro",
        address: addressString,
        coordinates: coordinates,
        additional_details:
          booking.contactDetails?.instructions ||
          booking.additional_details ||
          "",
        total_price: totalPrice,
        discount_amount: booking.discount_amount || 0,
        final_amount: totalPrice - (booking.discount_amount || 0),
        special_instructions:
          booking.contactDetails?.instructions ||
          booking.additional_details ||
          "",
        charges_breakdown: {
          base_price: totalPrice,
          tax_amount: 0,
          service_fee: 0,
          discount: booking.discount_amount || 0,
        },
      };

      console.log(
        "📦 Booking Payload to /api/bookings:",
        JSON.stringify(backendBooking, null, 2),
      );

      // Validate payload before sending
      const validation = {
        customer_id:
          !!backendBooking.customer_id &&
          backendBooking.customer_id !== "anonymous",
        service:
          !!backendBooking.service && backendBooking.service.trim() !== "",
        service_type: !!backendBooking.service_type,
        services:
          Array.isArray(backendBooking.services) &&
          backendBooking.services.length > 0 &&
          backendBooking.services.every((s) => s && s.trim() !== ""),
        scheduled_date: !!backendBooking.scheduled_date,
        scheduled_time: !!backendBooking.scheduled_time,
        provider_name: !!backendBooking.provider_name,
        address:
          !!backendBooking.address && backendBooking.address.trim() !== "",
        total_price:
          !isNaN(backendBooking.total_price) && backendBooking.total_price > 0,
        coordinates:
          !!backendBooking.coordinates &&
          typeof backendBooking.coordinates === "object",
      };

      console.log("🔍 Payload validation:", validation);
      console.log("📊 Validation details:", {
        customer_id: {
          value: backendBooking.customer_id,
          valid: validation.customer_id,
        },
        services: {
          value: backendBooking.services,
          valid: validation.services,
        },
        total_price: {
          value: backendBooking.total_price,
          type: typeof backendBooking.total_price,
          valid: validation.total_price,
        },
        address: { value: backendBooking.address, valid: validation.address },
      });

      const missingFields = Object.entries(validation)
        .filter(([key, valid]) => !valid)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        console.error("❌ Missing or invalid fields:", missingFields);
        console.error(
          "📦 Full payload for debugging:",
          JSON.stringify(backendBooking, null, 2),
        );

        // Still try to send the request but with a warning
        console.warn(
          "⚠️ Sending request despite validation warnings. Backend may reject it.",
        );
      }

      const response = await fetch(`${this.apiBaseUrl}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cleancare_auth_token")}`,
        },
        body: JSON.stringify(backendBooking),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Booking synced to backend:", booking.id, result);
      } else {
        let errorDetails;
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          try {
            errorDetails = await response.json();
          } catch (parseError) {
            errorDetails = { error: "Failed to parse error response" };
          }
        } else {
          const errorText = await response.text();
          errorDetails = { error: errorText };
        }

        console.error("❌ Backend API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          url: `${this.apiBaseUrl}/bookings`,
          payload: backendBooking,
        });

        // Provide more specific error messages based on status code
        let errorMessage = `Backend sync failed with status: ${response.status}`;

        if (response.status === 400) {
          errorMessage += ` - Validation Error: ${errorDetails.error || "Invalid data format"}`;
          if (errorDetails.missing) {
            errorMessage += ` Missing fields: ${errorDetails.missing.join(", ")}`;
          }
        } else if (response.status === 404) {
          errorMessage += ` - Customer not found or invalid customer ID: ${backendBooking.customer_id}`;
        } else if (response.status === 500) {
          errorMessage += ` - Server error: ${errorDetails.error || "Internal server error"}`;
        } else {
          errorMessage += ` - ${errorDetails.error || response.statusText}`;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.warn("⚠️ Backend sync timed out for booking:", booking.id);
          throw new Error("Backend sync timed out");
        } else if (error.message.includes("Failed to fetch")) {
          console.warn(
            "⚠️ Network error - backend sync failed for booking:",
            booking.id,
          );
          throw new Error("Network error during backend sync");
        } else {
          console.warn(
            "⚠️ Backend sync failed for booking:",
            booking.id,
            error.message,
          );
          throw error;
        }
      } else {
        console.warn("⚠️ Unknown error during backend sync:", error);
        throw new Error("Unknown error during backend sync");
      }
    }
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<BookingDetails>,
  ): Promise<BookingResponse> {
    try {
      console.log("✏️ Updating booking:", bookingId, updates);

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Try to update in localStorage first
      const localUpdatedBooking = this.updateBookingInLocalStorage(
        bookingId,
        updatedData,
      );

      // Try to sync with backend if booking exists and API URL is configured
      if (this.apiBaseUrl) {
        try {
          const backendResult = await this.syncBookingUpdateToBackend(
            bookingId,
            updatedData,
          );
          if (backendResult.success) {
            console.log("✅ Backend update successful");
            return {
              success: true,
              message: "Booking updated successfully",
              booking: backendResult.booking || localUpdatedBooking,
            };
          }
        } catch (backendError) {
          console.warn(
            "⚠️ Backend update failed, falling back to localStorage:",
            backendError,
          );
        }
      } else {
        console.log("🌐 Skipping backend sync - no API URL configured");
      }

      // If backend fails but localStorage succeeds, still return success
      if (localUpdatedBooking) {
        console.log("💾 Booking updated in localStorage only:", bookingId);
        return {
          success: true,
          message: "Booking updated successfully (offline mode)",
          booking: localUpdatedBooking,
        };
      }

      throw new Error("Booking not found in localStorage or backend");
    } catch (error) {
      console.error("❌ Failed to update booking:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update booking",
      };
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string): Promise<BookingResponse> {
    return this.updateBooking(bookingId, {
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Save booking to localStorage
   */
  private saveBookingToLocalStorage(booking: BookingDetails): void {
    try {
      const existingBookings = JSON.parse(
        localStorage.getItem("user_bookings") || "[]",
      );

      // Check if booking already exists (avoid duplicates)
      const bookingId = booking.id || (booking as any)._id;
      const existingIndex = existingBookings.findIndex(
        (b: any) => b.id === bookingId || b._id === bookingId,
      );

      if (existingIndex >= 0) {
        // Update existing booking
        existingBookings[existingIndex] = {
          ...existingBookings[existingIndex],
          ...booking,
        };
        console.log("💾 Booking updated in localStorage");
      } else {
        // Add new booking
        existingBookings.push(booking);
        console.log("💾 New booking saved to localStorage");
      }

      localStorage.setItem("user_bookings", JSON.stringify(existingBookings));
    } catch (error) {
      console.error("Failed to save booking to localStorage:", error);
    }
  }

  /**
   * Get bookings from localStorage
   */
  private getBookingsFromLocalStorage(userId: string): BookingDetails[] {
    try {
      const allBookings = JSON.parse(
        localStorage.getItem("user_bookings") || "[]",
      );
      return allBookings.filter(
        (booking: BookingDetails) => booking.userId === userId,
      );
    } catch (error) {
      console.error("Failed to load bookings from localStorage:", error);
      return [];
    }
  }

  /**
   * Update booking in localStorage
   */
  private updateBookingInLocalStorage(
    bookingId: string,
    updates: Partial<BookingDetails>,
  ): BookingDetails | null {
    try {
      const allBookings = JSON.parse(
        localStorage.getItem("user_bookings") || "[]",
      );
      const bookingIndex = allBookings.findIndex((booking: BookingDetails) => {
        const bid = booking.id || (booking as any)._id;
        const targetId = bookingId.toString();
        return (
          bid === targetId ||
          bid?.toString() === targetId ||
          // Handle cases where one might have ObjectId format
          (typeof bid === "object" && bid.toString() === targetId) ||
          (typeof bookingId === "object" && bookingId.toString() === bid)
        );
      });

      if (bookingIndex === -1) {
        console.warn("🔍 Booking not found in localStorage:", bookingId);
        console.log(
          "📋 Available bookings:",
          allBookings.map((b) => ({
            id: b.id,
            _id: (b as any)._id,
            idType: typeof (b.id || (b as any)._id),
            toString: (b.id || (b as any)._id)?.toString(),
          })),
        );
        console.log(
          "🎯 Target booking ID type:",
          typeof bookingId,
          "value:",
          bookingId,
        );
        return null;
      }

      allBookings[bookingIndex] = { ...allBookings[bookingIndex], ...updates };
      localStorage.setItem("user_bookings", JSON.stringify(allBookings));
      console.log("💾 Booking updated in localStorage");

      return allBookings[bookingIndex];
    } catch (error) {
      console.error("Failed to update booking in localStorage:", error);
      return null;
    }
  }

  /**
   * Get current user
   */
  private getCurrentUser(): any {
    const authService = DVHostingSmsService.getInstance();
    return authService.getCurrentUser();
  }

  /**
   * Sync booking update to backend
   */
  private async syncBookingUpdateToBackend(
    bookingId: string,
    updates: Partial<BookingDetails>,
  ): Promise<{ success: boolean; booking?: any; error?: string }> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // For status updates, use the specific status update endpoint
      if (updates.status) {
        // Get proper user ID for backend
        const userId =
          currentUser._id ||
          currentUser.id ||
          (currentUser.phone ? `user_${currentUser.phone}` : null);

        console.log("🔄 Syncing booking update to backend:", {
          bookingId,
          status: updates.status,
          userId,
          currentUser,
        });

        const response = await fetch(
          `${this.apiBaseUrl}/bookings/${bookingId}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: updates.status,
              user_id: userId,
              user_type: "customer",
            }),
          },
        );

        console.log("📡 Backend response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Backend error response:", errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }

          throw new Error(
            errorData.error || `HTTP ${response.status}: ${errorText}`,
          );
        }

        const data = await response.json();
        console.log("✅ Backend update successful:", data);

        return {
          success: true,
          booking: data.booking,
        };
      }

      // For other updates, we'd need a general update endpoint
      // For now, return success to indicate localStorage update is sufficient
      return { success: false, error: "General update endpoint not available" };
    } catch (error) {
      console.error("Backend sync error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear all bookings (for testing)
   */
  clearAllBookings(): void {
    localStorage.removeItem("user_bookings");
    console.log("🗑️ All bookings cleared");
  }
}
