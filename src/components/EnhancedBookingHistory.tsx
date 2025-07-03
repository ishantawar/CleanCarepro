import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/contexts/NotificationContext";
import VirtualizedList from "./VirtualizedList";
import {
  createSuccessNotification,
  createErrorNotification,
  createWarningNotification,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  RefreshCw,
  Star,
  ArrowLeft,
  Package,
  CreditCard,
  User,
  MessageCircle,
} from "lucide-react";
import { BookingService } from "@/services/bookingService";
import EditBookingModal from "./EditBookingModal";
import GoogleSheetsInfo from "./GoogleSheetsInfo";
import { filterProductionBookings } from "@/utils/bookingFilters";

interface EnhancedBookingHistoryProps {
  currentUser?: any;
  onBack?: () => void;
  onLoginRequired?: () => void;
}

const EnhancedBookingHistory: React.FC<EnhancedBookingHistoryProps> =
  React.memo(({ currentUser, onBack, onLoginRequired }) => {
    const { addNotification } = useNotifications();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const [cancellingBooking, setCancellingBooking] = useState<string | null>(
      null,
    );
    const [showContactDialog, setShowContactDialog] = useState(false);
    const [contactBookingId, setContactBookingId] = useState<string | null>(
      null,
    );

    const loadBookings = async () => {
      if (!currentUser?.id && !currentUser?._id && !currentUser?.phone) {
        console.log("No user ID found for loading bookings");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Import MongoDB helpers
        const { bookingHelpers } = await import(
          "../integrations/mongodb/bookingHelpers"
        );
        const bookingService = BookingService.getInstance();

        console.log(
          "Loading bookings from MongoDB for user:",
          currentUser._id || currentUser.id,
        );

        // Try MongoDB first (but it will gracefully fallback if no backend)
        let mongoBookings = [];
        const userId = currentUser._id || currentUser.id || currentUser.phone;

        if (userId) {
          const mongoResponse = await bookingHelpers.getUserBookings(userId);
          if (
            mongoResponse.data &&
            Array.isArray(mongoResponse.data) &&
            mongoResponse.data.length > 0
          ) {
            mongoBookings = filterProductionBookings(mongoResponse.data).map(
              (booking: any) => ({
                id: booking._id,
                userId: booking.customer_id,
                services: booking.services || [booking.service],
                totalAmount: booking.final_amount || booking.total_price,
                status: booking.status,
                pickupDate: booking.scheduled_date,
                deliveryDate: booking.scheduled_date, // Could calculate +1 day
                pickupTime: booking.scheduled_time,
                deliveryTime: "18:00",
                address: booking.address,
                contactDetails: {
                  phone: currentUser.phone,
                  name: currentUser.full_name || currentUser.name,
                  instructions:
                    booking.additional_details || booking.special_instructions,
                },
                paymentStatus: booking.payment_status,
                createdAt: booking.created_at || booking.createdAt,
                updatedAt: booking.updated_at || booking.updatedAt,
              }),
            );
            console.log(
              "✅ Loaded bookings from MongoDB (filtered):",
              mongoBookings.length,
            );
            setBookings(mongoBookings);
            return;
          }
        }

        // Fallback to BookingService
        console.log("Loading bookings from BookingService...");
        const response = await bookingService.getCurrentUserBookings();

        if (response.success && response.bookings) {
          // Filter out demo bookings for production
          const productionBookings = filterProductionBookings(
            response.bookings,
          );

          console.log(
            "✅ Bookings loaded from BookingService (filtered):",
            productionBookings.length,
          );
          setBookings(productionBookings);
        } else {
          console.log("No bookings found or error:", response.error);
          setBookings([]);
        }
      } catch (error) {
        console.error("Error loading bookings:", error);
        setBookings([]);
        addNotification(
          createErrorNotification(
            "Loading Error",
            "Failed to load bookings. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    const refreshBookings = async () => {
      setRefreshing(true);
      try {
        // Clear local cache first
        localStorage.removeItem("user_bookings");

        await loadBookings();
        addNotification(
          createSuccessNotification(
            "Refreshed",
            "Booking history updated from database",
          ),
        );
      } catch (error) {
        console.error("Error refreshing bookings:", error);
        addNotification(
          createErrorNotification(
            "Refresh Failed",
            "Failed to refresh bookings",
          ),
        );
      } finally {
        setRefreshing(false);
      }
    };

    useEffect(() => {
      loadBookings();
    }, [currentUser]);

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case "pending":
          return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "confirmed":
          return "bg-blue-100 text-blue-800 border-blue-200";
        case "in_progress":
        case "in-progress":
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
      switch (status?.toLowerCase()) {
        case "confirmed":
          return <CheckCircle className="h-4 w-4" />;
        case "completed":
          return <CheckCircle className="h-4 w-4" />;
        case "cancelled":
          return <XCircle className="h-4 w-4" />;
        case "in_progress":
        case "in-progress":
          return <RefreshCw className="h-4 w-4 animate-spin" />;
        default:
          return <Clock className="h-4 w-4" />;
      }
    };

    const canCancelBooking = (booking: any) => {
      const status = booking.status?.toLowerCase();
      return status !== "cancelled" && status !== "completed";
    };

    const canEditBooking = (booking: any) => {
      const status = booking.status?.toLowerCase();
      return status === "pending" || status === "confirmed";
    };

    const handleCancelBooking = async (bookingId: string) => {
      if (!bookingId) {
        addNotification(createErrorNotification("Error", "Invalid booking ID"));
        return;
      }

      console.log("🔥 Starting booking cancellation for ID:", bookingId);
      setCancellingBooking(bookingId);

      try {
        const bookingService = BookingService.getInstance();
        const result = await bookingService.cancelBooking(bookingId);

        if (result.success) {
          // Update local state immediately for better UX
          setBookings((prev) =>
            prev.map((booking: any) => {
              const currentBookingId = booking.id || booking._id;
              const shouldUpdate =
                currentBookingId === bookingId ||
                currentBookingId?.toString() === bookingId ||
                (typeof currentBookingId === "object" &&
                  currentBookingId.toString() === bookingId);

              if (shouldUpdate) {
                console.log(
                  "✅ Updated booking status in local state:",
                  currentBookingId,
                );
                return {
                  ...booking,
                  status: "cancelled",
                  updatedAt: new Date().toISOString(),
                };
              }
              return booking;
            }),
          );

          addNotification(
            createSuccessNotification(
              "Booking Cancelled",
              "Your booking has been cancelled successfully",
            ),
          );
        } else {
          // Show a more user-friendly error message
          const errorMessage =
            result.error?.includes("localStorage") ||
            result.error?.includes("backend")
              ? "Booking has been cancelled locally. Changes will sync when connection is restored."
              : result.error || "Failed to cancel booking";

          // If it's a sync error but the booking was updated locally, show success
          if (result.error?.includes("localStorage")) {
            addNotification(
              createSuccessNotification(
                "Booking Cancelled",
                "Your booking has been cancelled successfully",
              ),
            );

            // Force update local state even if backend failed
            setBookings((prev) =>
              prev.map((booking: any) => {
                const currentBookingId = booking.id || booking._id;
                const shouldUpdate =
                  currentBookingId === bookingId ||
                  currentBookingId?.toString() === bookingId;

                return shouldUpdate
                  ? { ...booking, status: "cancelled" }
                  : booking;
              }),
            );
          } else {
            addNotification(
              createErrorNotification("Cancellation Failed", errorMessage),
            );
          }
        }
      } catch (error) {
        console.error("Error cancelling booking:", error);
        addNotification(
          createErrorNotification(
            "Cancellation Failed",
            "Network error. Please check your connection and try again.",
          ),
        );
      } finally {
        setCancellingBooking(null);
      }
    };

    const handleEditBooking = (booking: any) => {
      if (!canEditBooking(booking)) {
        addNotification(
          createWarningNotification(
            "Cannot Edit",
            "This booking cannot be edited in its current status",
          ),
        );
        return;
      }
      setEditingBooking(booking);
      setShowEditModal(true);
    };

    const handleSaveEditedBooking = async (updatedBooking: any) => {
      try {
        const bookingService = BookingService.getInstance();
        const bookingId = updatedBooking.id || updatedBooking._id;

        const result = await bookingService.updateBooking(
          bookingId,
          updatedBooking,
        );

        if (result.success) {
          // Update local state
          setBookings((prev) =>
            prev.map((booking: any) =>
              booking.id === bookingId || booking._id === bookingId
                ? {
                    ...booking,
                    ...updatedBooking,
                    updatedAt: new Date().toISOString(),
                  }
                : booking,
            ),
          );

          setShowEditModal(false);
          setEditingBooking(null);

          addNotification(
            createSuccessNotification(
              "Booking Updated",
              "Your booking has been updated successfully",
            ),
          );
        } else {
          addNotification(
            createErrorNotification(
              "Update Failed",
              result.error || "Failed to update booking",
            ),
          );
        }
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

    const handleContactSupport = (bookingId: string) => {
      setContactBookingId(bookingId);
      setShowContactDialog(true);
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr || dateStr === "N/A") {
        // Return today's date as fallback
        return new Date().toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      try {
        let date;
        if (dateStr.includes("-")) {
          const [year, month, day] = dateStr.split("-").map(Number);
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
          // Return today's date as fallback
          return new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }

        return date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch (error) {
        console.error("Error parsing date:", dateStr, error);
        // Return today's date as fallback
        return new Date().toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    };

    const calculateTotal = (booking: any) => {
      if (booking.totalAmount) return booking.totalAmount;
      if (booking.total_price) return booking.total_price;
      if (booking.final_amount) return booking.final_amount;

      // Calculate from services if available
      if (Array.isArray(booking.services)) {
        return booking.services.reduce((total: number, service: any) => {
          const price = service.price || service.amount || 0;
          const quantity = service.quantity || 1;
          return total + price * quantity;
        }, 0);
      }

      return 0;
    };

    if (!currentUser) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-12">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Sign In Required
              </h2>
              <p className="text-gray-600 mb-6">
                You need to sign in to view your booking history.
              </p>
              <Button
                onClick={onLoginRequired}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full py-3 rounded-xl text-white font-medium"
              >
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              Loading your bookings...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-3 py-3 sm:px-6 sm:py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900 p-1 sm:p-2"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                )}
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                    Booking History
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    {bookings.length}{" "}
                    {bookings.length === 1 ? "booking" : "bookings"} found
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <GoogleSheetsInfo />
                <Button
                  onClick={refreshBookings}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-3 py-3 sm:px-6 sm:py-8">
          {bookings.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  No Bookings Yet
                </h3>
                <p className="text-gray-600 mb-8">
                  Your booking history will appear here once you book a service.
                </p>
                <Button
                  onClick={onBack}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium"
                >
                  Book Your First Service
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.length > 20 ? (
                <VirtualizedList
                  items={bookings}
                  itemHeight={120}
                  containerHeight={600}
                  className="space-y-3"
                  renderItem={(booking: any, index) => {
                    const bookingId =
                      booking.id || booking._id || `booking_${index}`;
                    const services = Array.isArray(booking.services)
                      ? booking.services
                      : [booking.service || "Home Service"];
                    const total = calculateTotal(booking);
                    const hasRealId =
                      !!(booking.id || booking._id) &&
                      !bookingId.startsWith("booking_");
                    const isExpanded = expandedCard === bookingId;

                    const toggleExpand = () => {
                      setExpandedCard(isExpanded ? null : bookingId);
                    };

                return (
                  <Card
                    key={bookingId}
                    className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={toggleExpand}
                  >
                    {/* Compact Card Header - Always Visible */}
                    <CardHeader className="pb-2 px-3 py-3 bg-gradient-to-r from-green-50 to-blue-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                              #CC
                              {booking._id
                                ? booking._id.slice(-6).toUpperCase()
                                : new Date(
                                    booking.created_at ||
                                      booking.createdAt ||
                                      Date.now(),
                                  )
                                    .getTime()
                                    .toString()
                                    .slice(-6)}
                            </h3>
                            <Badge
                              className={`${getStatusColor(booking.status)} text-xs px-1.5 py-0.5`}
                            >
                              {booking.status || "pending"}
                            </Badge>
                          </div>

                          {/* Quick Info Row */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>
                                {services.reduce((total, service) => {
                                  const quantity =
                                    typeof service === "object"
                                      ? service.quantity || 1
                                      : 1;
                                  return total + quantity;
                                }, 0)}{" "}
                                item
                                {services.reduce((total, service) => {
                                  const quantity =
                                    typeof service === "object"
                                      ? service.quantity || 1
                                      : 1;
                                  return total + quantity;
                                }, 0) > 1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="hidden sm:inline">Pickup: </span>
                              <span>
                                {formatDate(
                                  booking.pickupDate || booking.scheduled_date,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {booking.pickupTime ||
                                  booking.scheduled_time ||
                                  "10:00 AM"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-green-600 font-semibold ml-auto">
                              <span>₹{total}</span>
                            </div>
                          </div>

                          {/* Order placed time */}
                          <div className="text-xs text-gray-500 mt-1">
                            Ordered:{" "}
                            {new Date(
                              booking.created_at ||
                                booking.createdAt ||
                                Date.now(),
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(
                              booking.created_at ||
                                booking.createdAt ||
                                Date.now(),
                            ).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {isExpanded ? "Less" : "More"}
                          </span>
                          <div
                            className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Expanded Content - Only Visible When Expanded */}
                    {isExpanded && (
                      <CardContent
                        className="px-3 pb-3 pt-2 space-y-3 bg-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Services Detail */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            Order Details
                          </h4>
                          <div className="space-y-2 bg-white p-2 rounded">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Order ID</span>
                              <span className="font-mono font-medium text-blue-600">
                                #CC
                                {booking._id
                                  ? booking._id.slice(-6).toUpperCase()
                                  : new Date(
                                      booking.created_at ||
                                        booking.createdAt ||
                                        Date.now(),
                                    )
                                      .getTime()
                                      .toString()
                                      .slice(-6)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">
                                No. of Items Booked
                              </span>
                              <span className="font-medium">
                                {services.reduce((total, service) => {
                                  const quantity =
                                    typeof service === "object"
                                      ? service.quantity || 1
                                      : 1;
                                  return total + quantity;
                                }, 0)}{" "}
                                items
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">
                                Order Placed Date
                              </span>
                              <span className="font-medium">
                                {new Date(
                                  booking.created_at ||
                                    booking.createdAt ||
                                    Date.now(),
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}{" "}
                                at{" "}
                                {new Date(
                                  booking.created_at ||
                                    booking.createdAt ||
                                    Date.now(),
                                ).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Order Value</span>
                              <span className="font-bold text-green-600">
                                ₹{total}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-1">
                              Services:
                            </p>
                            {services.map((service: any, idx: number) => {
                              const serviceName =
                                typeof service === "object"
                                  ? service.name || service.service
                                  : service;
                              const quantity =
                                typeof service === "object"
                                  ? service.quantity || 1
                                  : 1;
                              // Get actual service price from laundry services data or booking data
                              let price = 50; // Default price

                              if (
                                typeof service === "object" &&
                                service.price
                              ) {
                                price = service.price;
                              } else if (
                                booking.item_prices &&
                                booking.item_prices.length > 0
                              ) {
                                // Find matching price from stored item_prices
                                const matchingPrice = booking.item_prices.find(
                                  (item: any) =>
                                    item.service_name === serviceName,
                                );
                                if (matchingPrice) {
                                  price = matchingPrice.unit_price;
                                }
                              } else {
                                // Import and use laundry services to get original prices
                                try {
                                  import("@/data/laundryServices").then(
                                    ({ getServiceById, getSortedServices }) => {
                                      const allServices = getSortedServices();
                                      const matchingService = allServices.find(
                                        (s) =>
                                          s.name.toLowerCase() ===
                                            serviceName.toLowerCase() ||
                                          serviceName
                                            .toLowerCase()
                                            .includes(s.name.toLowerCase()),
                                      );
                                      if (matchingService) {
                                        price = matchingService.price;
                                      }
                                    },
                                  );
                                } catch (error) {
                                  console.error(
                                    "Error loading service prices:",
                                    error,
                                  );
                                }

                                // Fallback: Use known service prices
                                const servicePriceMap: {
                                  [key: string]: number;
                                } = {
                                  kurta: 140,
                                  "kurta qty: 1": 140,
                                  jacket: 300,
                                  "jacket (full/half sleeves)": 300,
                                  "jacket (full/half sleeves) qty: 1": 300,
                                  shirt: 90,
                                  trouser: 120,
                                  jeans: 120,
                                  coat: 220,
                                  sweater: 200,
                                  sweatshirt: 200,
                                  saree: 210,
                                  lehenga: 330,
                                  dress: 330,
                                  "laundry and fold": 70,
                                  "laundry and iron": 120,
                                  "steam iron": 30,
                                };

                                const lowerServiceName =
                                  serviceName.toLowerCase();
                                for (const [key, value] of Object.entries(
                                  servicePriceMap,
                                )) {
                                  if (lowerServiceName.includes(key)) {
                                    price = value;
                                    break;
                                  }
                                }
                              }

                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center bg-white p-2 rounded text-xs"
                                >
                                  <span className="font-medium">
                                    {serviceName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">
                                      Qty: {quantity}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                      ₹{price * quantity}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Schedule Details */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-3 w-3 text-green-600" />
                              <span className="font-medium text-gray-900 text-xs">
                                Pickup
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-900">
                              {formatDate(
                                booking.pickupDate || booking.scheduled_date,
                              )}
                            </p>
                            <p className="text-xs text-green-600">
                              {booking.pickupTime ||
                                booking.scheduled_time ||
                                "10:00"}
                            </p>
                          </div>

                          <div className="p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-3 w-3 text-emerald-600" />
                              <span className="font-medium text-gray-900 text-xs">
                                Delivery
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-900">
                              {formatDate(booking.deliveryDate) ||
                                formatDate(
                                  booking.created_at || booking.createdAt,
                                ) ||
                                "Date TBD"}
                            </p>
                            <p className="text-xs text-emerald-600">
                              {booking.deliveryTime || "18:00"}
                            </p>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 mb-1 text-xs">
                                Service Address
                              </p>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {typeof booking.address === "object" &&
                                booking.address !== null
                                  ? booking.address.fullAddress ||
                                    [
                                      booking.address.flatNo,
                                      booking.address.street,
                                      booking.address.landmark,
                                      booking.address.village,
                                      booking.address.city,
                                      booking.address.pincode,
                                    ]
                                      .filter(Boolean)
                                      .join(", ") ||
                                    "Address not provided"
                                  : booking.address || "Address not provided"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2 text-xs flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-green-600" />
                            Price Breakdown
                          </h4>

                          <div className="space-y-1 text-xs">
                            {/* Calculate service total and delivery fee */}
                            {(() => {
                              const deliveryFee = 50; // Standard delivery fee
                              const serviceTotal = Math.max(
                                0,
                                total - deliveryFee,
                              );

                              return (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                      Services Total
                                    </span>
                                    <span className="font-medium">
                                      ₹{serviceTotal}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                      Delivery Fee
                                    </span>
                                    <span className="font-medium">
                                      ₹{deliveryFee}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}

                            {booking.discount_amount &&
                              booking.discount_amount > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-green-600">
                                    Discount
                                  </span>
                                  <span className="font-medium text-green-600">
                                    -₹{booking.discount_amount}
                                  </span>
                                </div>
                              )}

                            <Separator className="my-1" />

                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-900">
                                Total Amount
                              </span>
                              <span className="font-bold text-green-600">
                                ₹{total}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-1">
                              <span className="text-gray-500">
                                Payment Status
                              </span>
                              <Badge
                                variant={
                                  (booking.payment_status ||
                                    booking.paymentStatus) === "paid"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {(
                                  booking.payment_status ||
                                  booking.paymentStatus ||
                                  "pending"
                                ).toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2 border-t">
                          {hasRealId ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                {canEditBooking(booking) && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditBooking(booking);
                                    }}
                                    variant="outline"
                                    className="text-xs py-2 border-green-200 text-green-600 hover:bg-green-50"
                                    size="sm"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit Order
                                  </Button>
                                )}

                                {canCancelBooking(booking) && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="text-xs py-2 border-red-200 text-red-600 hover:bg-red-50"
                                        disabled={
                                          cancellingBooking === bookingId
                                        }
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        {cancellingBooking === bookingId
                                          ? "Cancelling..."
                                          : "Cancel"}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="mx-4">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Cancel Booking?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to cancel this
                                          booking? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                        <AlertDialogCancel className="w-full sm:w-auto">
                                          Keep Booking
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => {
                                            if (bookingId) {
                                              handleCancelBooking(bookingId);
                                            }
                                          }}
                                          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                        >
                                          Yes, Cancel Booking
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>

                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContactSupport(bookingId);
                                }}
                                variant="outline"
                                className="w-full text-xs py-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                                size="sm"
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Contact Support
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContactSupport(bookingId);
                              }}
                              variant="outline"
                              className="w-full text-xs py-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                              size="sm"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Contact Support
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
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

        {/* Contact Support Dialog */}
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                Contact Support
              </DialogTitle>
              <DialogDescription>
                Get help with your booking #{contactBookingId}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Phone Support
                </h4>
                <p className="text-blue-800 font-mono text-lg">
                  +91 9876543210
                </p>
                <p className="text-sm text-blue-600 mt-1">Available 24/7</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">
                  WhatsApp Support
                </h4>
                <p className="text-green-800 font-mono text-lg">
                  +91 9876543210
                </p>
                <p className="text-sm text-green-600 mt-1">Quick responses</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowContactDialog(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  window.open("tel:+919876543210", "_self");
                  setShowContactDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  });

EnhancedBookingHistory.displayName = "EnhancedBookingHistory";

export default EnhancedBookingHistory;