import { bookingHelpers } from "../mongodb/bookingHelpers";
import { BookingService } from "../../services/bookingService";

// Adaptive booking helpers that provide a unified interface for booking operations
// This bridges the gap between different booking service implementations
export const adaptiveBookingHelpers = {
  /**
   * Create a new booking using the best available method
   */
  async createBooking(bookingData: any) {
    console.log("🔄 Adaptive booking creation started:", bookingData);

    try {
      // Try MongoDB backend first
      const mongoResult = await bookingHelpers.createBooking(bookingData);

      if (mongoResult && !mongoResult.error) {
        console.log("✅ MongoDB booking creation successful");
        return { data: mongoResult.data, error: null };
      }

      // If MongoDB fails, use BookingService as fallback
      console.log("⚠️ MongoDB failed, trying BookingService fallback");
      const bookingService = BookingService.getInstance();
      const fallbackResult = await bookingService.createBooking(bookingData);

      if (fallbackResult.success) {
        console.log("✅ BookingService fallback successful");
        return { data: fallbackResult.booking, error: null };
      }

      // If both fail, return the original error
      return {
        data: null,
        error: mongoResult.error || { message: "All booking methods failed" },
      };
    } catch (error: any) {
      console.error("❌ Adaptive booking creation failed:", error);

      // Try BookingService as final fallback
      try {
        const bookingService = BookingService.getInstance();
        const fallbackResult = await bookingService.createBooking(bookingData);

        if (fallbackResult.success) {
          console.log("✅ Final BookingService fallback successful");
          return { data: fallbackResult.booking, error: null };
        }
      } catch (fallbackError) {
        console.error("❌ Final fallback also failed:", fallbackError);
      }

      return {
        data: null,
        error: { message: error.message || "Failed to create booking" },
      };
    }
  },

  /**
   * Update an existing booking
   */
  async updateBooking(bookingId: string, updates: any) {
    console.log("🔄 Adaptive booking update started:", { bookingId, updates });

    try {
      // Try BookingService first as it has better local storage handling
      const bookingService = BookingService.getInstance();
      const result = await bookingService.updateBooking(bookingId, updates);

      if (result.success) {
        console.log("✅ BookingService update successful");
        return { data: result.booking, error: null };
      }

      return {
        data: null,
        error: { message: result.error || "Failed to update booking" },
      };
    } catch (error: any) {
      console.error("❌ Adaptive booking update failed:", error);
      return {
        data: null,
        error: { message: error.message || "Failed to update booking" },
      };
    }
  },

  /**
   * Get user bookings using the best available method
   */
  async getUserBookings(userId: string) {
    console.log("🔄 Adaptive user bookings fetch started:", userId);

    try {
      // Try BookingService first as it has better offline support
      const bookingService = BookingService.getInstance();
      const result = await bookingService.getUserBookings(userId);

      if (result.success) {
        console.log("✅ BookingService user bookings fetch successful");
        return { data: result.bookings, error: null };
      }

      // Try MongoDB backend as fallback
      const mongoResult = await bookingHelpers.getUserBookings(userId);

      if (mongoResult && !mongoResult.error) {
        console.log("✅ MongoDB user bookings fetch successful");
        return { data: mongoResult.data, error: null };
      }

      return {
        data: [],
        error: mongoResult?.error || { message: "Failed to fetch bookings" },
      };
    } catch (error: any) {
      console.error("❌ Adaptive user bookings fetch failed:", error);
      return {
        data: [],
        error: { message: error.message || "Failed to fetch bookings" },
      };
    }
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string) {
    console.log("🔄 Adaptive booking cancellation started:", bookingId);

    try {
      // Try BookingService first
      const bookingService = BookingService.getInstance();
      const result = await bookingService.cancelBooking(bookingId);

      if (result.success) {
        console.log("✅ BookingService cancellation successful");
        return { data: result.booking, error: null };
      }

      return {
        data: null,
        error: { message: result.error || "Failed to cancel booking" },
      };
    } catch (error: any) {
      console.error("❌ Adaptive booking cancellation failed:", error);
      return {
        data: null,
        error: { message: error.message || "Failed to cancel booking" },
      };
    }
  },
};
