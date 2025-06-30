import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  ArrowLeft,
  Phone,
  User,
  Shield,
  MessageSquare,
  X,
} from "lucide-react";
import { DVHostingSmsService } from "@/services/dvhostingSmsService";
import { useIsMobile } from "@/hooks/use-mobile";

interface PhoneOtpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

const PhoneOtpAuthModal: React.FC<PhoneOtpAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [hasError, setHasError] = React.useState(false);

  // Error boundary effect
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("PhoneOtpAuthModal: Global error caught", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-red-600 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-4">
            Please close this dialog and try again.
          </p>
          <Button
            onClick={() => {
              setHasError(false);
              onClose();
            }}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }
  const [currentStep, setCurrentStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isMobile = useIsMobile();

  const [formData, setFormData] = useState({
    phone: "",
    otp: "",
    name: "",
  });

  const dvhostingSmsService = DVHostingSmsService.getInstance();

  const resetForm = () => {
    setFormData({
      phone: "",
      otp: "",
      name: "",
    });
    setError("");
    setSuccess("");
    setCurrentStep("phone");
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!formData.name || formData.name.trim().length === 0) {
      setError("Please enter your full name");
      return;
    }

    if (!formData.phone) {
      setError("Please enter your phone number");
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number starting with 6-9",
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await dvhostingSmsService.sendSmsOTP(
        formData.phone,
        formData.name?.trim() || `User ${formData.phone.slice(-4)}`,
      );

      if (result.success) {
        setSuccess(result.message || "OTP sent to your phone!");
        setCurrentStep("otp");
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (error: any) {
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!formData.otp) {
      setError("Please enter the OTP");
      return;
    }

    if (formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await dvhostingSmsService.verifySmsOTP(
        formData.phone,
        formData.otp,
        formData.name,
      );

      if (result.success && result.user) {
        setSuccess("Login successful!");

        // Save user authentication to localStorage for persistence
        dvhostingSmsService.setCurrentUser(result.user);

        // Save user to MongoDB backend for persistence across sessions
        try {
          await dvhostingSmsService.saveUserToBackend(result.user);
        } catch (userSaveError) {
          // Silent fail for user save to backend
        }

        onSuccess(result.user);
        resetForm();
      } else {
        setError(result.error || "Invalid OTP");
      }
    } catch (error: any) {
      setError(error.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep("phone");
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  if (isMobile) {
    // Mobile-specific modal implementation
    return (
      <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              {currentStep === "otp" && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-lg font-semibold text-center flex-1">
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  {currentStep === "phone"
                    ? "Sign In with Phone"
                    : "Verify OTP"}
                </div>
              </h2>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile content will be added here */}
            <div className="space-y-4">
              {/* Phone Step */}
              {currentStep === "phone" && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <div className="mt-1 relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                        <p className="ml-2 text-sm text-red-600">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-600">{success}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending OTP...
                      </div>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send OTP
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* OTP Step */}
              {currentStep === "otp" && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="font-medium">{formData.phone}</p>
                  </div>

                  <div>
                    <Label htmlFor="otp" className="text-sm font-medium">
                      Verification Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter OTP"
                      value={formData.otp}
                      onChange={(e) =>
                        setFormData({ ...formData, otp: e.target.value })
                      }
                      maxLength={6}
                      className="mt-1 text-center text-lg tracking-wider"
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                        <p className="ml-2 text-sm text-red-600">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-600">{success}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Verify & Sign In
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Resend OTP
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] max-w-md mx-auto my-8 max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 1000 }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            {currentStep === "otp" && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-center flex-1">
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                {currentStep === "phone" ? "Sign In with Phone" : "Verify OTP"}
              </div>
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {currentStep === "phone"
              ? "Enter your phone number to receive an OTP for authentication"
              : "Enter the OTP sent to your phone number to complete authentication"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Step */}
          {currentStep === "phone" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">
                  Enter your mobile number to receive OTP via SMS
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number *</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                    <span className="text-sm text-gray-600">🇮🇳 +91</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={10}
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  OTP will be sent to this number via SMS
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-green-700">{success}</span>
                </div>
              )}

              <Button
                onClick={handleSendOTP}
                disabled={isLoading || !formData.phone}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Sending OTP..." : "Send OTP via SMS"}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  By continuing, you agree to receive SMS messages from
                  CleanCare Pro
                </p>
              </div>
            </div>
          )}

          {/* OTP Step */}
          {currentStep === "otp" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium mb-1">Check your messages</h3>
                <p className="text-sm text-gray-600">
                  We sent a 6-digit code to +91{formData.phone}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={formData.otp}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      otp: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
                <p className="text-xs text-gray-500">
                  Enter the 6-digit code from SMS
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-green-700">{success}</span>
                </div>
              )}

              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || formData.otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Verifying..." : "Verify & Sign In"}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleSendOTP}
                  className="text-sm text-green-600"
                  disabled={isLoading}
                >
                  Didn't receive SMS? Resend OTP
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneOtpAuthModal;
