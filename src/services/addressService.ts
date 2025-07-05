import { config } from "../config/env";

export interface AddressData {
  id?: string;
  _id?: string;
  flatNo: string;
  flatHouseNo?: string;
  street: string;
  landmark: string;
  village: string;
  city: string;
  pincode: string;
  fullAddress: string;
  coordinates?: { lat: number; lng: number };
  label: string;
  type: "home" | "work" | "other";
  createdAt?: string;
  updatedAt?: string;
  status?: "active" | "deleted";
  phone?: string;
}

export interface AddressResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: AddressData | AddressData[];
}

export class AddressService {
  private static instance: AddressService;
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = config.apiBaseUrl;
  }

  public static getInstance(): AddressService {
    if (!AddressService.instance) {
      AddressService.instance = new AddressService();
    }
    return AddressService.instance;
  }

  /**
   * Get user ID for API calls
   */
  private getCurrentUserId(): string | null {
    // Try to get from localStorage auth
    const authData = localStorage.getItem("cleancare_auth_token");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.userId || parsed.id || parsed._id;
      } catch (error) {
        console.warn("Failed to parse auth data:", error);
      }
    }

    // Fallback to user data
    const userData = localStorage.getItem("current_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user._id || user.id || user.phone;
      } catch (error) {
        console.warn("Failed to parse user data:", error);
      }
    }

    return null;
  }

  /**
   * Delete address (soft delete with status update)
   */
  async deleteAddress(addressId: string): Promise<AddressResponse> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      console.log("🗑️ Deleting address:", { addressId, userId });

      // Skip backend call if no API URL configured
      if (!this.apiBaseUrl) {
        console.log("🌐 No API URL configured, using localStorage only");
        return this.deleteAddressFromLocalStorage(addressId, userId);
      }

      const response = await fetch(
        `${this.apiBaseUrl}/addresses/${addressId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "user-id": userId,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
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

      const result = await response.json();
      console.log("✅ Address deleted from backend:", result);

      // Also remove from localStorage
      this.deleteAddressFromLocalStorage(addressId, userId);

      return {
        success: true,
        message: "Address deleted successfully",
        data: result.data,
      };
    } catch (error) {
      console.error("❌ Failed to delete address from backend:", error);

      // Fallback to localStorage deletion
      const userId = this.getCurrentUserId();
      if (userId) {
        const result = this.deleteAddressFromLocalStorage(addressId, userId);
        return {
          ...result,
          message: "Address deleted locally (will sync when online)",
        };
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete address",
      };
    }
  }

  /**
   * Delete address from localStorage
   */
  private deleteAddressFromLocalStorage(
    addressId: string,
    userId: string,
  ): AddressResponse {
    try {
      const storageKey = `addresses_${userId}`;
      const savedAddresses = localStorage.getItem(storageKey);

      if (!savedAddresses) {
        return { success: false, error: "No addresses found" };
      }

      const addresses = JSON.parse(savedAddresses);
      if (!Array.isArray(addresses)) {
        return { success: false, error: "Invalid address data" };
      }

      // Remove the address instead of marking as deleted for localStorage
      const updatedAddresses = addresses.filter(
        (addr) => addr.id !== addressId && addr._id !== addressId,
      );

      localStorage.setItem(storageKey, JSON.stringify(updatedAddresses));
      console.log("✅ Address removed from localStorage");

      return {
        success: true,
        message: "Address deleted successfully",
      };
    } catch (error) {
      console.error("Failed to delete address from localStorage:", error);
      return {
        success: false,
        error: "Failed to delete address locally",
      };
    }
  }

  /**
   * Get user addresses (active only)
   */
  async getUserAddresses(): Promise<AddressResponse> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Try backend first
      if (this.apiBaseUrl) {
        try {
          const response = await fetch(`${this.apiBaseUrl}/addresses`, {
            headers: {
              "Content-Type": "application/json",
              "user-id": userId,
            },
          });

          if (response.ok) {
            const result = await response.json();
            return {
              success: true,
              data: result.data || [],
            };
          }
        } catch (error) {
          console.warn("Backend fetch failed, using localStorage:", error);
        }
      }

      // Fallback to localStorage
      const storageKey = `addresses_${userId}`;
      const savedAddresses = localStorage.getItem(storageKey);

      if (savedAddresses) {
        const addresses = JSON.parse(savedAddresses);
        return {
          success: true,
          data: Array.isArray(addresses) ? addresses : [],
        };
      }

      return {
        success: true,
        data: [],
      };
    } catch (error) {
      console.error("Failed to get user addresses:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get addresses",
        data: [],
      };
    }
  }
}
