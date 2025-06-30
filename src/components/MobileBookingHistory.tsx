import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  createSuccessNotification,
  createErrorNotification,
} from "@/utils/notificationUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Phone,
  RefreshCw,
  Star,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { BookingService } from "@/services/bookingService";
import { adaptiveBookingHelpers } from "@/integrations/adaptive/bookingHelpers";
import EditBookingModal from "./EditBookingModal";
import { clearAllUserData } from "@/utils/clearStorage";

interface MobileBookingHistoryProps {
  currentUser?: any;
  onBack?: () => void;
}

const MobileBookingHistory: React.FC<MobileBookingHistoryProps> = ({
  currentUser,
  onBack,
}) => {
  const { addNotification } = useNotifications();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [addingServicesBooking, setAddingServicesBooking] = useState(null);
  const [showAddServicesModal, setShowAddServicesModal] = useState(false);

  const loadBookings = async () => {
    if (!currentUser?.id && !currentUser?._id && !currentUser?.phone) {
      console.log("No user ID found for loading bookings");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const bookingService = BookingService.getInstance();

      console.log("Loading bookings for current user...");
      // Use the new method that automatically handles user ID resolution
      const response = await bookingService.getCurrentUserBookings();

      if (response.success && response.bookings) {
        console.log("Bookings loaded successfully:", response.bookings.length);
        setBookings(response.bookings);
      } else {
        console.log("No bookings found or error:", response.error);
        setBookings([]);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBookings = async () => {
    setRefreshing(true);
    try {
      // Force reload from backend/localStorage
      await loadBookings();
    } catch (error) {
      console.error("Error refreshing bookings:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [currentUser]);

  // Debug function to check booking structure
  useEffect(() => {
    if (bookings.length > 0) {
      console.log(
        "🐛 DEBUG: Current bookings structure:",
        bookings.map((b) => ({
          id: b.id,
          _id: b._id,
          status: b.status,
          services: b.services,
          totalAmount: b.totalAmount,
          total_price: b.total_price,
          final_amount: b.final_amount,
        })),
      );
    }
  }, [bookings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      console.log("🔄 Attempting to cancel booking:", bookingId);
      console.log(
        "📋 Current bookings:",
        bookings.map((b) => ({ id: b.id || b._id, status: b.status })),
      );

      // Update local state immediately for better UX
      const updatedBookings = bookings.map((booking: any) => {
        const matches = booking.id === bookingId || booking._id === bookingId;
        console.log(
          `📝 Checking booking ${booking.id || booking._id} against ${bookingId}: ${matches}`,
        );
        return matches
          ? {
              ...booking,
              status: "cancelled",
            }
          : booking;
      });

      console.log(
        "📊 Updated bookings:",
        updatedBookings.map((b) => ({ id: b.id || b._id, status: b.status })),
      );
      setBookings(updatedBookings);

      // Use BookingService for cancellation
      const bookingService = BookingService.getInstance();
      const result = await bookingService.cancelBooking(bookingId);

      console.log("📋 Cancellation result:", result);

      if (result.success) {
        addNotification(
          createSuccessNotification(
            "Booking Cancelled",
            "Your booking has been cancelled successfully!",
          ),
        );

        // Refresh to get latest data
        await refreshBookings();
      } else {
        // Revert local state if backend failed
        setBookings(bookings);
        addNotification(
          createErrorNotification(
            "Cancellation Failed",
            result.error || "Failed to cancel booking",
          ),
        );
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      // Revert local state on error
      setBookings(bookings);
      addNotification(
        createErrorNotification(
          "Cancellation Failed",
          "Failed to cancel booking. Please try again.",
        ),
      );
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    await cancelBooking(bookingId);
  };

  const handleAddServices = (booking: any) => {
    setAddingServicesBooking(booking);
    setShowAddServicesModal(true);
  };

  const handleSaveAddedServices = async (updatedBooking: any) => {
    try {
      // Update the booking with new services
      const { data, error } = await adaptiveBookingHelpers.updateBooking(
        updatedBooking._id || updatedBooking.id,
        updatedBooking,
      );

      if (error) {
        addNotification(
          createErrorNotification(
            "Update Failed",
            `Failed to add services: ${error.message}`,
          ),
        );
        return;
      }

      // Update the bookings list
      const updatedBookings = bookings.map((booking: any) =>
        (booking._id || booking.id) ===
        (updatedBooking._id || updatedBooking.id)
          ? updatedBooking
          : booking,
      );

      setBookings(updatedBookings);
      setShowAddServicesModal(false);
      setAddingServicesBooking(null);
      addNotification(
        createSuccessNotification(
          "Services Added",
          "Services have been added to your booking successfully!",
        ),
      );
    } catch (error) {
      console.error("Error adding services:", error);
      addNotification(
        createErrorNotification(
          "Update Failed",
          "Failed to add services. Please try again.",
        ),
      );
    }
  };

  const canCancelBooking = (booking: any) => {
    const bookingDate = new Date(booking.scheduled_date);
    const now = new Date();
    const diffHours =
      (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return (
      booking.status !== "cancelled" &&
      booking.status !== "completed" &&
      diffHours > 2
    ); // Can cancel if more than 2 hours away
  };

  const canEditBooking = (booking: any) => {
    const bookingDate = new Date(booking.scheduled_date);
    const now = new Date();
    const diffHours =
      (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return (
      booking.status !== "cancelled" &&
      booking.status !== "completed" &&
      diffHours > 4
    ); // Can edit if more than 4 hours away
  };

  const handleEditBooking = (booking: any) => {
    setEditingBooking(booking);
    setShowEditModal(true);
  };

  const handleSaveEditedBooking = async (updatedBooking: any) => {
    try {
      const { data, error } = await adaptiveBookingHelpers.updateBooking(
        updatedBooking._id,
        updatedBooking,
      );

      if (error) {
        addNotification(
          createErrorNotification(
            "Update Failed",
            `Failed to update booking: ${error.message}`,
          ),
        );
        return;
      }

      // Update the bookings list
      const updatedBookings = bookings.map((booking: any) =>
        booking._id === updatedBooking._id ? data : booking,
      );

      setBookings(updatedBookings);
      setShowEditModal(false);
      setEditingBooking(null);
      addNotification(
        createSuccessNotification(
          "Booking Updated",
          "Your booking has been updated successfully!",
        ),
      );
    } catch (error) {
      console.error("Error updating booking:", error);
      addNotification(
        createErrorNotification(
          "Update Failed",
          "Failed to update booking. Please try again.",
        ),
      );
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to view your booking history.
            </p>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full py-3 rounded-xl">
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              Loading your bookings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              onClick={onBack || (() => window.history.back())}
              variant="ghost"
              className="text-white hover:bg-white/20 p-1.5 rounded-xl flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                My Bookings
              </h1>
              <p className="text-green-100 text-xs">
                {bookings.length}{" "}
                {bookings.length === 1 ? "booking" : "bookings"} found
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (confirm("Clear all data and start fresh?")) {
                  clearAllUserData();
                  setBookings([]);
                  addNotification(
                    createSuccessNotification(
                      "Data Cleared",
                      "All local data has been cleared. Refresh to start fresh.",
                    ),
                  );
                }
              }}
              variant="ghost"
              className="text-white hover:bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0 text-xs"
              title="Clear All Data"
            >
              🗑️
            </Button>
            <Button
              onClick={refreshBookings}
              variant="ghost"
              className="text-white hover:bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-3 sm:px-4 py-4 space-y-3 sm:space-y-4 overflow-x-hidden bg-white/10 backdrop-blur-sm rounded-t-3xl mt-2">
        {loading ? (
          <Card className="max-w-md mx-auto bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="text-center py-8 sm:py-12">
              <RefreshCw className="h-8 w-8 text-green-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-700">Loading your bookings...</p>
            </CardContent>
          </Card>
        ) : bookings.length === 0 ? (
          <Card className="max-w-md mx-auto bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="text-center py-8 sm:py-12 px-4">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No Bookings Yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Start by booking your first service!
              </p>
              <Button
                onClick={onBack}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full py-3 rounded-xl text-sm sm:text-base shadow-lg"
              >
                Book a Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking: any, index) => {
            // Safety wrapper to prevent any object rendering
            const SafeText = ({ children }: { children: any }) => {
              if (children === null || children === undefined) return null;
              if (
                typeof children === "string" ||
                typeof children === "number" ||
                typeof children === "boolean"
              ) {
                return <>{children}</>;
              }
              if (typeof children === "object") {
                console.warn("Prevented object rendering:", children);
                return <>Object (prevented)</>;
              }
              return <>{String(children)}</>;
            };

            try {
              // Comprehensive data sanitization to prevent object rendering
              const sanitizeValue = (value: any, fallback: any = "") => {
                if (value === null || value === undefined) return fallback;
                if (
                  typeof value === "string" ||
                  typeof value === "number" ||
                  typeof value === "boolean"
                )
                  return value;
                if (typeof value === "object" && value.name) return value.name;
                if (typeof value === "object" && value.fullAddress)
                  return value.fullAddress;
                if (typeof value === "object") return JSON.stringify(value);
                return fallback;
              };

              const sanitizeServices = (services: any) => {
                if (!Array.isArray(services)) return [];

                // Calculate individual service price based on total
                const totalAmount =
                  booking.totalAmount ||
                  booking.total_price ||
                  booking.final_amount ||
                  0;
                const serviceCount = services.length || 1;
                const defaultPrice = Math.round(totalAmount / serviceCount);

                return services.map((service, index) => {
                  if (typeof service === "string") {
                    return {
                      name: service,
                      quantity: 1,
                      price: defaultPrice,
                      id: `service_${index}`,
                    };
                  }
                  if (typeof service === "object" && service) {
                    return {
                      name: sanitizeValue(
                        service.name || service.service,
                        "Unknown Service",
                      ),
                      quantity:
                        typeof service.quantity === "number"
                          ? service.quantity
                          : 1,
                      price:
                        typeof service.price === "number"
                          ? service.price
                          : typeof service.amount === "number"
                            ? service.amount
                            : defaultPrice,
                      id: service.id || `service_${index}`,
                    };
                  }
                  return {
                    name: String(service) || "Unknown Service",
                    quantity: 1,
                    price: defaultPrice,
                    id: `service_${index}`,
                  };
                });
              };

              const safeBooking = {
                id: sanitizeValue(
                  booking.id || booking._id,
                  `booking_${index}`,
                ),
                service: sanitizeValue(booking.service, "Home Service"),
                provider_name: sanitizeValue(
                  booking.provider_name,
                  "HomeServices Pro",
                ),
                status: sanitizeValue(booking.status, "pending"),
                services: sanitizeServices(booking.services),
                additional_details: sanitizeValue(
                  booking.additional_details,
                  "",
                ),
                pickupDate: sanitizeValue(booking.pickupDate, ""),
                deliveryDate: sanitizeValue(booking.deliveryDate, ""),
                scheduled_date: sanitizeValue(booking.scheduled_date, ""),
                pickupTime: sanitizeValue(booking.pickupTime, ""),
                deliveryTime: sanitizeValue(booking.deliveryTime, ""),
                scheduled_time: sanitizeValue(booking.scheduled_time, ""),
                address: sanitizeValue(booking.address, "Address not provided"),
                totalAmount:
                  typeof booking.totalAmount === "number"
                    ? booking.totalAmount
                    : 0,
                total_price:
                  typeof booking.total_price === "number"
                    ? booking.total_price
                    : 0,
                final_amount:
                  typeof booking.final_amount === "number"
                    ? booking.final_amount
                    : 0,
                discount_amount:
                  typeof booking.discount_amount === "number"
                    ? booking.discount_amount
                    : 0,
                payment_status: sanitizeValue(
                  booking.payment_status,
                  "pending",
                ),
                paymentStatus: sanitizeValue(booking.paymentStatus, "pending"),
                charges_breakdown: {
                  tax_amount:
                    typeof booking.charges_breakdown?.tax_amount === "number"
                      ? booking.charges_breakdown.tax_amount
                      : 0,
                },
              };

              return (
                <Card
                  key={safeBooking.id || index}
                  className="border-0 shadow-lg rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
                >
                  <CardHeader className="pb-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base font-bold text-gray-900 mb-1 truncate">
                          {safeBooking.service}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-green-600 truncate font-medium">
                          by {safeBooking.provider_name}
                        </p>
                      </div>
                      <Badge
                        className={`${getStatusColor(safeBooking.status)} border font-medium`}
                      >
                        {getStatusIcon(safeBooking.status)}
                        <span className="ml-1 capitalize">
                          {safeBooking.status}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 p-3">
                    {/* Booked Services */}
                    {safeBooking.services &&
                      Array.isArray(safeBooking.services) &&
                      safeBooking.services.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-900 text-xs">
                            Booked Services
                          </h4>
                          {safeBooking.services.map(
                            (service: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-xs">
                                    <SafeText>{service.name}</SafeText>
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Qty: {service.quantity}
                                  </p>
                                </div>
                                {service.price > 0 && (
                                  <p className="font-semibold text-blue-600 text-xs">
                                    ₹{service.price}
                                  </p>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}

                    {/* Pickup & Delivery Slots */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-gray-900 text-xs">
                            Pickup
                          </span>
                        </div>
                        <p className="text-xs text-gray-900">
                          {(() => {
                            const dateStr =
                              safeBooking.pickupDate ||
                              safeBooking.scheduled_date;
                            if (!dateStr) return "Date TBD";

                            try {
                              let date;
                              if (dateStr.includes("-")) {
                                // YYYY-MM-DD format - parse as local date
                                const [year, month, day] = dateStr
                                  .split("-")
                                  .map(Number);
                                date = new Date(year, month - 1, day);
                              } else {
                                date = new Date(dateStr);
                              }

                              // Validate date
                              if (isNaN(date.getTime())) return "Date TBD";

                              return date.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              });
                            } catch (error) {
                              console.error(
                                "Error parsing date:",
                                dateStr,
                                error,
                              );
                              return "Date TBD";
                            }
                          })()}
                        </p>
                        <p className="text-xs text-green-600">
                          {safeBooking.pickupTime ||
                            safeBooking.scheduled_time ||
                            "10:00"}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-gray-900 text-sm">
                            Delivery
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {safeBooking.deliveryDate
                            ? new Date(
                                safeBooking.deliveryDate,
                              ).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })
                            : safeBooking.scheduled_date
                              ? (() => {
                                  // Calculate delivery date (next day after pickup)
                                  const dateStr = safeBooking.scheduled_date;
                                  let date;

                                  if (dateStr && dateStr.includes("-")) {
                                    const [year, month, day] =
                                      dateStr.split("-");
                                    date = new Date(
                                      parseInt(year),
                                      parseInt(month) - 1,
                                      parseInt(day) + 1,
                                    );
                                  } else if (dateStr) {
                                    date = new Date(dateStr);
                                    date.setDate(date.getDate() + 1);
                                  } else {
                                    return "Date TBD";
                                  }

                                  return date.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  });
                                })()
                              : "Date TBD"}
                        </p>
                        <p className="text-xs text-emerald-600">
                          {safeBooking.deliveryTime || "Time TBD"}
                        </p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-3 p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                      <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                          Service Address
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          <SafeText>
                            {safeBooking.address || "Address not provided"}
                          </SafeText>
                        </p>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        Price Breakdown
                      </h4>

                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
                        {/* Service Total */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">
                            Services Total
                          </span>
                          <span className="font-medium">
                            ₹
                            {(() => {
                              const servicesTotal = safeBooking.services.reduce(
                                (total: number, service: any) => {
                                  return (
                                    total +
                                    (service.price * service.quantity || 0)
                                  );
                                },
                                0,
                              );
                              return servicesTotal > 0
                                ? servicesTotal
                                : safeBooking.totalAmount ||
                                    safeBooking.total_price ||
                                    safeBooking.final_amount ||
                                    0;
                            })()}
                          </span>
                        </div>

                        {/* Discount if applicable */}
                        {safeBooking.discount_amount &&
                          safeBooking.discount_amount > 0 && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-green-600">
                                Discount
                              </span>
                              <span className="font-medium text-green-600">
                                -₹{safeBooking.discount_amount}
                              </span>
                            </div>
                          )}

                        {/* Tax if applicable */}
                        {safeBooking.charges_breakdown?.tax_amount && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Tax</span>
                            <span className="font-medium">
                              ₹{safeBooking.charges_breakdown.tax_amount}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-green-200 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">
                              Total Amount
                            </span>
                            <span className="text-xl font-bold text-green-600">
                              ₹
                              {(() => {
                                const servicesTotal =
                                  safeBooking.services.reduce(
                                    (total: number, service: any) => {
                                      return (
                                        total +
                                        (service.price * service.quantity || 0)
                                      );
                                    },
                                    0,
                                  );
                                const actualTotal =
                                  servicesTotal > 0
                                    ? servicesTotal
                                    : safeBooking.final_amount ||
                                      safeBooking.totalAmount ||
                                      safeBooking.total_price ||
                                      0;
                                return actualTotal;
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              Payment Status
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                (safeBooking.payment_status ||
                                  safeBooking.paymentStatus) === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {(
                                safeBooking.payment_status ||
                                safeBooking.paymentStatus ||
                                "pending"
                              ).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    {safeBooking.additional_details && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="font-medium text-gray-900 mb-1">
                          Additional Notes
                        </p>
                        <p className="text-sm text-gray-600">
                          {(() => {
                            if (
                              typeof booking.additional_details === "string"
                            ) {
                              return booking.additional_details;
                            }
                            if (
                              typeof booking.additional_details === "object" &&
                              booking.additional_details
                            ) {
                              return JSON.stringify(booking.additional_details);
                            }
                            return "No additional details";
                          })()}
                        </p>
                      </div>
                    )}

                    {/* Comprehensive Actions */}
                    <div className="space-y-3 pt-3">
                      {/* Primary Actions Row */}
                      <div className="grid grid-cols-2 gap-3">
                        {(safeBooking.status === "pending" ||
                          safeBooking.status === "confirmed") && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleEditBooking(safeBooking)}
                              className="flex-1 rounded-xl border-2 border-green-200 hover:bg-green-50 text-green-600 font-medium py-3"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="flex-1 rounded-xl border-2 border-red-200 hover:bg-red-50 text-red-600 font-medium py-3"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Cancel Booking
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this
                                    booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Keep Booking
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleCancelBooking(safeBooking.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Yes, Cancel
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}

                        {safeBooking.status === "completed" && (
                          <Button
                            variant="outline"
                            className="col-span-2 rounded-xl border-2 border-amber-200 hover:bg-amber-50 text-amber-600 font-medium py-3"
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Rate & Review Service
                          </Button>
                        )}
                      </div>

                      {/* Secondary Actions Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          variant="ghost"
                          className="rounded-xl border border-blue-200 hover:bg-blue-50 text-blue-600 font-medium py-3 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                          onClick={() => handleAddServices(safeBooking)}
                          aria-label={`Add more services to booking ${safeBooking.service || "Home Service"}`}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add More Services
                        </Button>

                        <Button
                          variant="ghost"
                          className="rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-3"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } catch (error) {
              console.error("Error rendering booking:", error, booking);
              return (
                <Card
                  key={booking.id || index}
                  className="border-0 shadow-lg rounded-2xl overflow-hidden bg-red-50"
                >
                  <CardContent className="text-center py-8">
                    <p className="text-red-600">Error loading booking</p>
                  </CardContent>
                </Card>
              );
            }
          })
        )}
      </div>

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingBooking(null);
          }}
          booking={editingBooking}
          onSave={handleSaveEditedBooking}
        />
      )}

      {/* Add Services Modal */}
      {addingServicesBooking && (
        <EditBookingModal
          isOpen={showAddServicesModal}
          onClose={() => {
            setShowAddServicesModal(false);
            setAddingServicesBooking(null);
          }}
          booking={addingServicesBooking}
          onSave={handleSaveAddedServices}
          mode="add-services"
        />
      )}
    </div>
  );
};

export default MobileBookingHistory;
