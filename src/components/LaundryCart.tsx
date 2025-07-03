import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  createSuccessNotification,
  createErrorNotification,
  createWarningNotification,
} from "@/utils/notificationUtils";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Clock,
  User,
  Phone,
  Calendar,
  Loader2,
  CreditCard,
  Home,
} from "lucide-react";
import { laundryServices, LaundryService } from "@/data/laundryServices";
import { OTPAuthService } from "@/services/otpAuthService";
import {
  saveBookingFormData,
  getBookingFormData,
  saveCartData,
  getCartData,
} from "@/utils/formPersistence";
import SimplifiedAddressForm from "./SimplifiedAddressForm";
import ProfessionalDateTimePicker from "./ProfessionalDateTimePicker";
import { FormValidation, validateCheckoutForm } from "./FormValidation";
import SavedAddressesModal from "./SavedAddressesModal";
import ZomatoAddressSelector from "./ZomatoAddressSelector";
import ZomatoAddAddressPage from "./ZomatoAddAddressPage";

interface LaundryCartProps {
  onBack: () => void;
  onProceedToCheckout: (cartData: any) => void;
  onLoginRequired?: () => void;
  currentUser?: any;
}

const LaundryCart: React.FC<LaundryCartProps> = ({
  onBack,
  onProceedToCheckout,
  onLoginRequired,
  currentUser,
}) => {
  const { addNotification } = useNotifications();
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [addressData, setAddressData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);

  const authService = OTPAuthService.getInstance();

  // Load saved form data on component mount (excluding date autofill)
  useEffect(() => {
    const savedFormData = getBookingFormData();

    // Don't autofill date - let user select fresh
    if (savedFormData.selectedTime) setSelectedTime(savedFormData.selectedTime);
    if (savedFormData.additionalDetails)
      setSpecialInstructions(savedFormData.additionalDetails);
    if (savedFormData.couponCode) setCouponCode(savedFormData.couponCode);
    if (savedFormData.appliedCoupon)
      setAppliedCoupon(savedFormData.appliedCoupon);
  }, []);

  // Auto-save form data when it changes
  useEffect(() => {
    saveBookingFormData({
      selectedDate,
      selectedTime,
      additionalDetails: specialInstructions,
      couponCode,
      appliedCoupon,
    });
  }, [
    selectedDate,
    selectedTime,
    specialInstructions,
    couponCode,
    appliedCoupon,
  ]);

  // Listen for cart clearing events
  useEffect(() => {
    const handleClearCart = () => {
      console.log("🧹 Received cart clear event");
      setCart({});
      localStorage.removeItem("laundry_cart");
    };

    window.addEventListener("clearCart", handleClearCart);

    return () => {
      window.removeEventListener("clearCart", handleClearCart);
    };
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("laundry_cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Pre-fill user data
    if (currentUser) {
      setPhoneNumber(currentUser.phone || "");

      // Restore checkout form state after login
      const savedState = localStorage.getItem("checkout_form_state");
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          // Only restore if saved within last 30 minutes
          if (Date.now() - state.timestamp < 30 * 60 * 1000) {
            if (state.addressData) setAddressData(state.addressData);
            if (state.phoneNumber && !phoneNumber)
              setPhoneNumber(state.phoneNumber);
            if (state.selectedDate)
              setSelectedDate(new Date(state.selectedDate));
            if (state.selectedTime) setSelectedTime(state.selectedTime);
            if (state.specialInstructions)
              setSpecialInstructions(state.specialInstructions);
            if (state.appliedCoupon) setAppliedCoupon(state.appliedCoupon);

            console.log("�� Restored checkout form state after login");
          }
          localStorage.removeItem("checkout_form_state");
        } catch (error) {
          console.error("Failed to restore checkout state:", error);
        }
      }
    }
  }, [currentUser]);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem("laundry_cart", JSON.stringify(cart));
  }, [cart]);

  // Auto-load saved address when cart opens
  useEffect(() => {
    if (currentUser && !addressData) {
      loadDefaultAddress();
    }
  }, [currentUser, addressData]);

  const loadDefaultAddress = () => {
    if (!currentUser) return;

    const userId = currentUser._id || currentUser.id || currentUser.phone;
    const savedAddressesKey = `addresses_${userId}`;
    const addresses = JSON.parse(
      localStorage.getItem(savedAddressesKey) || "[]",
    );

    if (addresses.length > 0) {
      // Use the most recent address or the first home address
      const defaultAddress =
        addresses.find((addr: any) => addr.type === "home") || addresses[0];
      setSelectedSavedAddress(defaultAddress);
      setAddressData(defaultAddress);
      console.log(
        "✅ Auto-loaded saved address:",
        defaultAddress.label || defaultAddress.type,
      );
    }
  };

  const getAllServices = (): LaundryService[] => {
    return laundryServices.flatMap((category) => category.services);
  };

  const getServiceById = (id: string): LaundryService | undefined => {
    return getAllServices().find((service) => service.id === id);
  };

  const getCartItems = () => {
    return Object.entries(cart)
      .map(([serviceId, quantity]) => ({
        service: getServiceById(serviceId),
        quantity,
      }))
      .filter((item) => item.service && item.quantity > 0);
  };

  const getSubtotal = () => {
    return getCartItems().reduce((total, item) => {
      return total + item.service!.price * item.quantity;
    }, 0);
  };

  const getDeliveryCharge = () => {
    return 50; // Fixed delivery charge
  };

  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getSubtotal();
    return Math.round(subtotal * (appliedCoupon.discount / 100));
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryCharge() - getCouponDiscount();
  };

  const applyCoupon = () => {
    const validCoupons = {
      FIRST10: { discount: 10, description: "10% off on first order" },
      SAVE20: { discount: 20, description: "20% off" },
      WELCOME5: { discount: 5, description: "5% welcome discount" },
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    if (coupon) {
      setAppliedCoupon({
        code: couponCode.toUpperCase(),
        discount: coupon.discount,
      });
      addNotification(
        createSuccessNotification(
          "Coupon Applied",
          `${coupon.discount}% discount applied successfully!`,
        ),
      );
    } else {
      addNotification(
        createErrorNotification(
          "Invalid Coupon",
          "The coupon code you entered is not valid.",
        ),
      );
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const updateQuantity = (serviceId: string, change: number) => {
    setCart((prev) => {
      const newCart = { ...prev };
      const currentQuantity = newCart[serviceId] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);

      if (newQuantity === 0) {
        delete newCart[serviceId];
      } else {
        newCart[serviceId] = newQuantity;
      }

      return newCart;
    });
  };

  const removeItem = (serviceId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[serviceId];
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
    localStorage.removeItem("laundry_cart");
  };

  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showZomatoAddressSelector, setShowZomatoAddressSelector] =
    useState(false);
  const [showZomatoAddAddressPage, setShowZomatoAddAddressPage] =
    useState(false);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<any>(null);

  const handleProceedToCheckout = async () => {
    // Prevent multiple submissions
    if (isProcessingCheckout) {
      console.log("⚠️ Checkout already in progress, ignoring duplicate click");
      return;
    }

    console.log("🛒 Checkout button clicked!");
    setIsProcessingCheckout(true);

    // Add additional UI feedback
    addNotification(
      createWarningNotification(
        "Processing Order",
        "Please wait while we process your booking...",
      ),
    );

    try {
      console.log("📝 Current form data:", {
        currentUser: !!currentUser,
        addressData: !!addressData,
        phoneNumber,
        selectedDate,
        selectedTime,
        addressFullAddress: addressData?.fullAddress,
        flatNo: addressData?.flatNo,
      });

      // Check authentication first before validation
      if (!currentUser) {
        console.log("❌ User not authenticated, redirecting to login");

        // Save current cart state for post-login restore
        const currentCartState = {
          addressData,
          phoneNumber,
          selectedDate: selectedDate?.toISOString(),
          selectedTime,
          specialInstructions,
          appliedCoupon,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          "checkout_form_state",
          JSON.stringify(currentCartState),
        );

        if (onLoginRequired) {
          onLoginRequired();
        } else {
          addNotification(
            createWarningNotification(
              "Login Required",
              "Please sign in to complete your booking",
            ),
          );
        }
        return;
      }

      // Validate form and show inline errors
      console.log("🔍 Starting form validation...");

      let errors;
      try {
        errors = validateCheckoutForm(
          currentUser,
          addressData,
          phoneNumber,
          selectedDate,
          selectedTime,
        );
        console.log("📋 Validation results:", errors);
      } catch (validationError) {
        console.error("❌ Validation function failed:", validationError);
        addNotification(
          createErrorNotification(
            "Validation Error",
            "There was an error checking your form. Please try again.",
          ),
        );
        return;
      }

      if (errors.length > 0) {
        console.log("❌ Validation failed with errors:", errors);
        setValidationErrors(errors);

        // Scroll to validation errors
        const errorElement = document.getElementById("validation-errors");
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        return;
      }

      console.log("✅ Validation passed, proceeding to checkout...");

      // Clear validation errors
      setValidationErrors([]);

      // Structure data to match booking service requirements
      const cartItems = getCartItems();
      console.log("Cart items:", cartItems);

      const services = cartItems
        .map((item) => {
          if (!item.service) {
            console.error("Service not found for cart item:", item);
            return null;
          }

          // Validate price and quantity
          const price = Number(item.service.price) || 0;
          const quantity = Number(item.quantity) || 1;

          if (price === 0) {
            console.warn("Service has zero price:", item.service);
          }

          return {
            id: item.service.id,
            name: item.service.name,
            category: item.service.category,
            price: price,
            quantity: quantity,
          };
        })
        .filter(Boolean);

      console.log("Formatted services:", services);

      // Calculate delivery time (2 days after pickup)
      const deliveryDate = new Date(selectedDate);
      deliveryDate.setDate(deliveryDate.getDate() + 2); // Add 2 days

      // Delivery time same as pickup time
      const deliveryTimeString = selectedTime;

      // Calculate total from services to ensure consistency
      const serviceTotal = services.reduce((total, service) => {
        const itemTotal = service.price * service.quantity || 0;
        return total + itemTotal;
      }, 0);

      const deliveryCharge = getDeliveryCharge() || 0;
      const couponDiscount = getCouponDiscount() || 0;
      const finalTotal = serviceTotal + deliveryCharge - couponDiscount;

      console.log("Price breakdown:", {
        serviceTotal,
        deliveryCharge,
        couponDiscount,
        appliedCoupon: appliedCoupon?.code,
        finalTotal,
      });

      const orderData = {
        services,
        totalAmount: finalTotal,
        pickupDate: selectedDate.toISOString().split("T")[0],
        deliveryDate: deliveryDate.toISOString().split("T")[0],
        pickupTime: selectedTime,
        deliveryTime: deliveryTimeString,
        address: addressData,
        phone: phoneNumber || currentUser?.phone,
        instructions: specialInstructions,
      };

      console.log("Final order data:", orderData);

      // Show confirmation dialog
      const confirmationMessage = `
Booking Confirmation:

Services: ${services.length} items
${services.map((s) => `• ${s.name} x${s.quantity} - ₹${s.price * s.quantity}`).join("\n")}

Pickup: ${selectedDate.toLocaleDateString()} at ${selectedTime}
Delivery: ${deliveryDate.toLocaleDateString()} at ${deliveryTimeString}

Total Amount: ₹${finalTotal}

Confirm this booking?`;

      if (confirm(confirmationMessage)) {
        try {
          console.log("💰 User confirmed order, processing...");

          // Save address for future use before processing order
          saveAddressAfterBooking(addressData);

          // Call the parent's checkout handler
          console.log("📤 Calling onProceedToCheckout with order data");
          await onProceedToCheckout(orderData);

          console.log("✅ Checkout initiated successfully");

          // Clear cart after successful booking
          console.log("🧹 Clearing cart after successful booking");
          localStorage.removeItem("laundry_cart");
          setCart({});

          // Clear form data
          localStorage.removeItem("laundry_booking_form");
          setSpecialInstructions("");
          setCouponCode("");
          setAppliedCoupon(null);

          addNotification(
            createSuccessNotification(
              "Cart Cleared",
              "Your order has been placed and cart has been cleared.",
            ),
          );
        } catch (checkoutError) {
          console.error("💥 Checkout process failed:", checkoutError);
          addNotification(
            createErrorNotification(
              "Checkout Failed",
              "Failed to process your order. Please try again.",
            ),
          );
          // Don't clear cart on error so user can retry
        }
      } else {
        console.log("❌ User cancelled the order");
      }
    } catch (error) {
      console.error("💥 Checkout failed:", error);
      addNotification(
        createErrorNotification(
          "Checkout Failed",
          "Unable to process your order. Please try again.",
        ),
      );
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Handle address selection from Zomato selector
  const handleAddressSelect = (address: any) => {
    setSelectedSavedAddress(address);
    setAddressData(address);
    setShowZomatoAddressSelector(false);
    console.log("✅ Address selected:", address.label || address.type);
  };

  // Handle new address creation
  const handleNewAddressSave = (newAddress: any) => {
    if (!currentUser) return;

    try {
      const userId = currentUser._id || currentUser.id || currentUser.phone;
      const savedAddressesKey = `addresses_${userId}`;
      const existingAddresses = JSON.parse(
        localStorage.getItem(savedAddressesKey) || "[]",
      );

      const addressWithId = {
        ...newAddress,
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedAddresses = [...existingAddresses, addressWithId];
      localStorage.setItem(savedAddressesKey, JSON.stringify(updatedAddresses));

      // Auto-select the new address
      setSelectedSavedAddress(addressWithId);
      setAddressData(addressWithId);

      setShowZomatoAddAddressPage(false);
      console.log("✅ New address saved and selected");
    } catch (error) {
      console.error("Failed to save new address:", error);
    }
  };

  const saveAddressAfterBooking = async (orderAddress: any) => {
    if (!currentUser || !orderAddress) return;

    try {
      const userId = currentUser._id || currentUser.id || currentUser.phone;
      const savedAddressesKey = `addresses_${userId}`;
      const existingAddresses = JSON.parse(
        localStorage.getItem(savedAddressesKey) || "[]",
      );

      // Check if this address already exists
      const addressExists = existingAddresses.some(
        (addr: any) => addr.fullAddress === orderAddress.fullAddress,
      );

      if (!addressExists && orderAddress.fullAddress) {
        const newAddress = {
          ...orderAddress,
          id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          label: orderAddress.label || "Recent Order Address",
          type: orderAddress.type || "other",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedAddresses = [...existingAddresses, newAddress];
        localStorage.setItem(
          savedAddressesKey,
          JSON.stringify(updatedAddresses),
        );
        console.log("✅ Address saved after booking");
      }
    } catch (error) {
      console.error("Failed to save address after booking:", error);
    }
  };

  const cartItems = getCartItems();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-0 h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Cart</h1>
        </div>

        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-6">Add some items to get started</p>
          <Button onClick={onBack} className="bg-green-600 hover:bg-green-700">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-3 sm:px-4 py-4 flex items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" onClick={onBack} className="p-0 h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base sm:text-lg font-semibold">
            Cart ({cartItems.length} items)
          </h1>
        </div>
      </div>

      <div className="p-2 space-y-2 pb-24">
        {/* Cart Items - Compact View */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 px-3 py-1">
            <CardTitle className="text-sm font-medium">
              Items ({cartItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0 px-3 pb-2">
            {cartItems.map(({ service, quantity }) => (
              <div
                key={service!.id}
                className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-md"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">
                    {service!.category.includes("Men")
                      ? "👔"
                      : service!.category.includes("Women")
                        ? "👗"
                        : service!.category.includes("Woolen")
                          ? "🧥"
                          : service!.category.includes("Steam")
                            ? "🔥"
                            : service!.category.includes("Iron")
                              ? "🏷️"
                              : "👕"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs break-words leading-tight">
                    {service!.name}
                  </h4>
                  <p className="text-xs text-green-600">₹{service!.price}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(service!.id, -1)}
                    className="h-5 w-5 p-0 text-xs"
                  >
                    <Minus className="h-2 w-2" />
                  </Button>
                  <span className="w-4 text-center font-medium text-xs">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(service!.id, 1)}
                    className="h-5 w-5 p-0 text-xs"
                  >
                    <Plus className="h-2 w-2" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs text-green-600">
                    ₹{service!.price * quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(service!.id)}
                    className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Zomato-style Address Section */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-600" />
                <span className="font-medium">
                  Delivery at{" "}
                  {selectedSavedAddress?.type === "home"
                    ? "Home"
                    : selectedSavedAddress?.type === "office"
                      ? "Work"
                      : addressData?.type === "home"
                        ? "Home"
                        : addressData?.type === "office"
                          ? "Work"
                          : "Location"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600"
                onClick={() => setShowZomatoAddressSelector(true)}
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {selectedSavedAddress || addressData?.fullAddress ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {selectedSavedAddress ? (
                    <>
                      {selectedSavedAddress.flatNo &&
                        `${selectedSavedAddress.flatNo}, `}
                      {selectedSavedAddress.fullAddress}
                    </>
                  ) : (
                    <>
                      {addressData.flatNo && `${addressData.flatNo}, `}
                      {addressData.fullAddress}
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-3">
                  No address selected
                </p>
                <Button
                  onClick={() => setShowZomatoAddressSelector(true)}
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Select Address
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact & Schedule Details - Compact */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 px-3 py-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-2 pt-0">
            <div>
              <Label htmlFor="phone" className="text-xs">
                Phone *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Pickup Schedule *</Label>
              <ProfessionalDateTimePicker
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onDateChange={setSelectedDate}
                onTimeChange={setSelectedTime}
              />
            </div>

            <div>
              <Label htmlFor="instructions" className="text-xs">
                Instructions (Optional)
              </Label>
              <Textarea
                id="instructions"
                placeholder="Special instructions..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bill Summary - Compact */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 px-3 py-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-2 pt-0">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({cartItems.length} items)</span>
              <span>₹{getSubtotal()}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>₹{getDeliveryCharge()}</span>
            </div>

            {/* Ultra Compact Coupon Section */}
            {!appliedCoupon ? (
              <div className="flex gap-1 pt-1">
                <Input
                  placeholder="Coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 h-7 text-xs"
                />
                <Button
                  onClick={applyCoupon}
                  variant="outline"
                  disabled={!couponCode.trim()}
                  className="h-7 px-2 text-xs"
                >
                  Apply
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-green-700 font-medium text-xs">
                    ✓ {appliedCoupon.code}
                  </span>
                  <span className="text-xs text-green-600">
                    ({appliedCoupon.discount}%)
                  </span>
                </div>
                <Button
                  onClick={removeCoupon}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-green-600 hover:bg-green-100"
                >
                  ✕
                </Button>
              </div>
            )}

            {appliedCoupon && (
              <div className="flex justify-between text-green-600 text-sm">
                <span>Discount</span>
                <span>-₹{getCouponDiscount()}</span>
              </div>
            )}

            <hr className="my-2" />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-green-600">₹{getTotal()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 safe-area-bottom">
        <div className="space-y-2">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div id="validation-errors">
              <FormValidation errors={validationErrors} />
            </div>
          )}

          <Button
            onClick={(e) => {
              console.log("🚀 Button clicked event triggered");
              e.preventDefault();
              e.stopPropagation();
              try {
                handleProceedToCheckout();
              } catch (error) {
                console.error("💥 Checkout handler failed:", error);
                addNotification(
                  createErrorNotification(
                    "Checkout Error",
                    "An unexpected error occurred. Please try again.",
                  ),
                );
              }
            }}
            disabled={cartItems.length === 0 || isProcessingCheckout}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessingCheckout ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : cartItems.length === 0 ? (
              "Add items to cart"
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Proceed to Checkout • ₹{getTotal()}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Zomato Address Selector */}
      <ZomatoAddressSelector
        isOpen={showZomatoAddressSelector}
        onClose={() => setShowZomatoAddressSelector(false)}
        onSelectAddress={handleAddressSelect}
        onAddNewAddress={() => {
          setShowZomatoAddressSelector(false);
          setShowZomatoAddAddressPage(true);
        }}
        currentUser={currentUser}
        selectedAddressId={selectedSavedAddress?.id}
      />

      {/* Zomato Add Address Page */}
      <ZomatoAddAddressPage
        isOpen={showZomatoAddAddressPage}
        onClose={() => setShowZomatoAddAddressPage(false)}
        onSave={handleNewAddressSave}
        currentUser={currentUser}
      />

      {/* Saved Addresses Modal (fallback) */}
      <SavedAddressesModal
        isOpen={showSavedAddresses}
        onClose={() => setShowSavedAddresses(false)}
        onSelectAddress={(address) => {
          setAddressData(address);
          setShowSavedAddresses(false);
        }}
        currentUser={currentUser}
      />
    </div>
  );
};

export default LaundryCart;
