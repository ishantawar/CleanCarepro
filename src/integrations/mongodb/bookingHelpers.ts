const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface Booking {
  _id?: string;
  customer_id: string;
  rider_id?: string;
  service: string;
  service_type: string;
  services: string[];
  scheduled_date: string;
  scheduled_time: string;
  provider_name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  additional_details?: string;
  total_price: number;
  discount_amount?: number;
  final_amount: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  created_at?: Date;
  updated_at?: Date;
  estimated_duration?: number;
  special_instructions?: string;
  charges_breakdown?: {
    base_price: number;
    tax_amount: number;
    service_fee: number;
    discount: number;
  };
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function to safely parse JSON response
const safeParseJSON = async (response: Response) => {
  if (!response) {
    throw new Error("No response received from server");
  }

  try {
    // Check if we can read the response
    if (response.bodyUsed) {
      throw new Error("Response body already consumed");
    }

    // For network failures or invalid responses, handle gracefully
    if (!response.headers.get("content-type")?.includes("application/json")) {
      // Not JSON, return empty object or handle as needed
      return { error: "Invalid response format" };
    }

    return await response.json();
  } catch (error: any) {
    if (error.message.includes("already consumed")) {
      throw error; // Re-throw body consumed errors
    }

    // Handle JSON parsing errors
    console.error("JSON parsing failed:", error);
    throw new Error(`Failed to parse response: ${error.message}`);
  }
};

export const bookingHelpers = {
  // ✅ Create new booking
  async createBooking(bookingData: Partial<Booking>) {
    try {
      const user = JSON.parse(localStorage.getItem("current_user") || "{}");

      // Try to get customer ID from multiple possible fields
      const customerId = user?._id || user?.id || user?.phone;

      if (!customerId) {
        console.error("User object:", user);
        throw new Error("User ID not found. Please sign in again.");
      }

      // If we only have phone number, try to create or get user from backend
      if (!user._id && user.phone) {
        console.log("🔄 User missing MongoDB ID, using phone:", user.phone);
      }

      let response;
      let data;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        response = await fetch(`${API_BASE_URL}/bookings`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...bookingData,
            customer_id: customerId, // ✅ use resolved customer ID
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        console.error("Network fetch failed:", fetchError);

        // Check if it's a CORS or network issue in hosted environment
        const isHostedEnv =
          window.location.hostname.includes("fly.dev") ||
          window.location.hostname.includes("builder.codes");

        if (isHostedEnv) {
          console.log(
            "🌐 Hosted environment detected, treating as offline mode",
          );
        }

        return {
          data: null,
          error: {
            message: "Backend unavailable. Order will be saved locally.",
            code: "NETWORK_ERROR",
          },
        };
      }

      try {
        data = await safeParseJSON(response);

        if (!response.ok) {
          return {
            data: null,
            error: {
              message:
                data.error ||
                `HTTP ${response.status}: Failed to create booking`,
              code: "SERVER_ERROR",
            },
          };
        }
      } catch (jsonError: any) {
        console.error("Failed to parse response:", jsonError);

        // If JSON parsing fails but we have a response, check status
        if (response && !response.ok) {
          return {
            data: null,
            error: {
              message: `HTTP ${response.status}: Failed to create booking`,
              code: "SERVER_ERROR",
            },
          };
        }

        return {
          data: null,
          error: {
            message: "Invalid response from server. Please try again.",
            code: "PARSE_ERROR",
          },
        };
      }

      return { data: data.booking, error: null };
    } catch (error: any) {
      console.error("Booking creation error:", error);
      return {
        data: null,
        error: {
          message: "Unexpected error occurred. Please try again.",
          code: "UNKNOWN_ERROR",
        },
      };
    }
  },

  // Get bookings for a specific customer
  async getUserBookings(userId: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${API_BASE_URL}/bookings/customer/${userId}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      const data = await safeParseJSON(response);

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to fetch bookings" },
        };
      }

      return { data: data.bookings, error: null };
    } catch (error: any) {
      console.error("Bookings fetch error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Get pending bookings near a rider's location
  async getPendingBookingsForRiders(lat?: number, lng?: number) {
    try {
      let url = `${API_BASE_URL}/bookings/pending/0/0`;

      if (lat && lng) {
        url = `${API_BASE_URL}/bookings/pending/${lat}/${lng}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to fetch pending bookings" },
        };
      }

      return { data: data.bookings, error: null };
    } catch (error: any) {
      console.error("Pending bookings fetch error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Accept a booking as rider
  async acceptBooking(bookingId: string, riderId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}/accept`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ rider_id: riderId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to accept booking" },
        };
      }

      return { data: data.booking, error: null };
    } catch (error: any) {
      console.error("Booking acceptance error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Update booking status
  async updateBookingStatus(
    bookingId: string,
    status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled",
    riderId?: string,
  ) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}/status`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status,
            ...(riderId && { rider_id: riderId }),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to update booking status" },
        };
      }

      return { data: data.booking, error: null };
    } catch (error: any) {
      console.error("Booking status update error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Get all bookings (admin)
  async getAllBookings(page: number = 1, limit: number = 10, filters?: any) {
    try {
      const offset = (page - 1) * limit;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...filters,
      });

      const response = await fetch(`${API_BASE_URL}/bookings?${queryParams}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to fetch bookings" },
        };
      }

      return {
        data: data.bookings,
        error: null,
        pagination: data.pagination,
      };
    } catch (error: any) {
      console.error("All bookings fetch error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Get booking by ID
  async getBookingById(bookingId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to fetch booking" },
        };
      }

      return { data: data.booking, error: null };
    } catch (error: any) {
      console.error("Booking fetch error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Cancel a booking
  async cancelBooking(bookingId: string, userId: string, userType: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: userId,
          user_type: userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to cancel booking" },
        };
      }

      return { data: data.booking, error: null };
    } catch (error: any) {
      console.error("Booking cancellation error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Get bookings for rider
  async getRiderBookings(riderId: string, status?: string) {
    try {
      const queryParams = status ? `?status=${status}` : "";

      const response = await fetch(
        `${API_BASE_URL}/bookings/rider/${riderId}${queryParams}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || "Failed to fetch rider bookings" },
        };
      }

      return { data: data.bookings, error: null };
    } catch (error: any) {
      console.error("Rider bookings fetch error:", error);
      return {
        data: null,
        error: { message: "Network error. Please check your connection." },
      };
    }
  },

  // Placeholder for clearing bookings (demo/testing)
  async clearUserBookings(userId: string) {
    try {
      console.log(
        "Clear bookings functionality would be implemented in admin panel",
      );

      return {
        data: { message: "Bookings cleared successfully" },
        error: null,
      };
    } catch (error: any) {
      console.error("Clear bookings error:", error);
      return {
        data: null,
        error: { message: "Failed to clear bookings" },
      };
    }
  },
};
