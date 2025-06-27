export class DVHostingSmsService {
  private static instance: DVHostingSmsService;
  private currentPhone: string = "";
  private otpStorage: Map<string, { otp: string; expiresAt: number }> = new Map();

  constructor() {
    console.log("✅ DVHosting SMS service initialized");
  }

  static getInstance(): DVHostingSmsService {
    if (!DVHostingSmsService.instance) {
      DVHostingSmsService.instance = new DVHostingSmsService();
    }
    return DVHostingSmsService.instance;
  }

  private isHostedEnv = typeof window !== "undefined" && window.location.hostname !== "localhost";

  private apiBaseUrl = this.isHostedEnv
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:3001";

  async sendOTP(phone: string): Promise<boolean> {
    this.currentPhone = phone;
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/send-otp?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Backend HTTP error:", result.message || result);
        return false;
      }

      console.log("✅ OTP sent successfully:", result);
      return true;
    } catch (error) {
      console.error("❌ Failed to send OTP:", error);
      return false;
    }
  }

  async verifyOTP(phone: string, enteredOTP: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/verify-otp?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: enteredOTP }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ OTP verification failed:", result.message || result);
        return false;
      }

      console.log("✅ OTP verified:", result);
      return result.success;
    } catch (error) {
      console.error("❌ Failed to verify OTP:", error);
      return false;
    }
  }

  async saveUser(phone: string, userData: any): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/save-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, ...userData }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Failed to save user:", result.message || result);
        return;
      }

      console.log("✅ User saved:", result);
    } catch (error) {
      console.error("❌ Error while saving user:", error);
    }
  }

  async getUserByPhone(phone: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/get-user-by-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Failed to fetch user:", result.message || result);
        return null;
      }

      console.log("✅ User fetched:", result);
      return result.data;
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      return null;
    }
  }

  getCurrentPhone(): string {
    return this.currentPhone;
  }

  reset(): void {
    this.currentPhone = "";
    this.otpStorage.clear();
    console.log("🔄 DVHosting SMS service reset");
  }
}
