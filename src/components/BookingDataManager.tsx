import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  createSuccessNotification,
  createErrorNotification,
  createWarningNotification,
} from "@/utils/notificationUtils";
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Server,
  HardDrive,
} from "lucide-react";

interface BookingDataManagerProps {
  currentUser?: any;
}

const BookingDataManager: React.FC<BookingDataManagerProps> = ({
  currentUser,
}) => {
  const { addNotification } = useNotifications();
  const [mongoStatus, setMongoStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [localCount, setLocalCount] = useState(0);
  const [mongoCount, setMongoCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkDataStatus();
  }, [currentUser]);

  const checkDataStatus = async () => {
    try {
      setLoading(true);

      // Check local storage
      const localBookings = JSON.parse(
        localStorage.getItem("user_bookings") || "[]",
      );
      const userLocalBookings = currentUser
        ? localBookings.filter(
            (b: any) =>
              b.userId === currentUser._id ||
              b.userId === currentUser.id ||
              b.userId === currentUser.phone,
          )
        : [];
      setLocalCount(userLocalBookings.length);

      // Check MongoDB connection
      if (currentUser?._id) {
        try {
          const { bookingHelpers } = await import(
            "../integrations/mongodb/bookingHelpers"
          );
          const mongoResponse = await bookingHelpers.getUserBookings(
            currentUser._id,
          );

          if (mongoResponse.data) {
            setMongoStatus("connected");
            setMongoCount(mongoResponse.data.length);
            console.log(
              "✅ MongoDB connected, bookings:",
              mongoResponse.data.length,
            );
          } else if (mongoResponse.error) {
            setMongoStatus("disconnected");
            console.log("❌ MongoDB error:", mongoResponse.error);
          }
        } catch (error) {
          setMongoStatus("disconnected");
          console.log("❌ MongoDB connection failed:", error);
        }
      } else {
        setMongoStatus("disconnected");
      }
    } catch (error) {
      console.error("Error checking data status:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncToMongoDB = async () => {
    if (!currentUser?._id) {
      addNotification(
        createWarningNotification(
          "Sync Failed",
          "User ID not found. Please sign in again.",
        ),
      );
      return;
    }

    try {
      setLoading(true);

      const localBookings = JSON.parse(
        localStorage.getItem("user_bookings") || "[]",
      );
      const userLocalBookings = localBookings.filter(
        (b: any) =>
          b.userId === currentUser._id ||
          b.userId === currentUser.id ||
          b.userId === currentUser.phone,
      );

      if (userLocalBookings.length === 0) {
        addNotification(
          createWarningNotification(
            "No Data",
            "No local bookings found to sync.",
          ),
        );
        return;
      }

      const { bookingHelpers } = await import(
        "../integrations/mongodb/bookingHelpers"
      );
      let syncedCount = 0;

      for (const booking of userLocalBookings) {
        try {
          const mongoBookingData = {
            customer_id: currentUser._id,
            service: booking.services?.[0] || "Laundry Service",
            service_type: "laundry",
            services: booking.services || [],
            scheduled_date: booking.pickupDate,
            scheduled_time: booking.pickupTime,
            provider_name: "CleanCare Pro",
            address:
              typeof booking.address === "string"
                ? booking.address
                : booking.address?.fullAddress || "",
            coordinates: booking.address?.coordinates || { lat: 0, lng: 0 },
            additional_details: booking.contactDetails?.instructions || "",
            total_price: booking.totalAmount,
            discount_amount: 0,
            final_amount: booking.totalAmount,
            special_instructions: booking.contactDetails?.instructions || "",
            charges_breakdown: {
              base_price: booking.totalAmount,
              tax_amount: 0,
              service_fee: 0,
              discount: 0,
            },
          };

          const result = await bookingHelpers.createBooking(mongoBookingData);
          if (result.data) {
            syncedCount++;
          }
        } catch (error) {
          console.error("Failed to sync booking:", booking.id, error);
        }
      }

      addNotification(
        createSuccessNotification(
          "Sync Complete",
          `Successfully synced ${syncedCount} of ${userLocalBookings.length} bookings to MongoDB.`,
        ),
      );

      // Refresh status
      await checkDataStatus();
    } catch (error) {
      console.error("Sync error:", error);
      addNotification(
        createErrorNotification(
          "Sync Failed",
          "Failed to sync data to MongoDB. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const clearLocalData = () => {
    localStorage.removeItem("user_bookings");
    setLocalCount(0);
    addNotification(
      createSuccessNotification(
        "Cleared",
        "Local booking data cleared successfully.",
      ),
    );
  };

  const testMongoConnection = async () => {
    try {
      setLoading(true);
      const { bookingHelpers } = await import(
        "../integrations/mongodb/bookingHelpers"
      );

      // Create a test booking
      const testBooking = {
        customer_id: currentUser._id,
        service: "Test Laundry Service",
        service_type: "test",
        services: ["Test Service"],
        scheduled_date: new Date().toISOString().split("T")[0],
        scheduled_time: "10:00",
        provider_name: "CleanCare Pro",
        address: "Test Address",
        coordinates: { lat: 0, lng: 0 },
        additional_details: "Test booking - can be deleted",
        total_price: 100,
        discount_amount: 0,
        final_amount: 100,
        special_instructions: "This is a test booking",
        charges_breakdown: {
          base_price: 100,
          tax_amount: 0,
          service_fee: 0,
          discount: 0,
        },
      };

      const result = await bookingHelpers.createBooking(testBooking);

      if (result.data) {
        addNotification(
          createSuccessNotification(
            "MongoDB Connected",
            "Successfully created test booking in MongoDB database.",
          ),
        );
        await checkDataStatus();
      } else {
        throw new Error(
          result.error?.message || "Failed to create test booking",
        );
      }
    } catch (error) {
      console.error("MongoDB test failed:", error);
      addNotification(
        createErrorNotification(
          "MongoDB Test Failed",
          "Could not connect to MongoDB. Check backend connection.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Booking Data Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Please sign in to manage booking data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Booking Data Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="font-medium">Local Storage</span>
            </div>
            <div className="text-2xl font-bold">{localCount}</div>
            <div className="text-sm text-gray-600">bookings</div>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4" />
              <span className="font-medium">MongoDB</span>
              <Badge
                variant={
                  mongoStatus === "connected" ? "default" : "destructive"
                }
                className="text-xs"
              >
                {mongoStatus}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{mongoCount}</div>
            <div className="text-sm text-gray-600">bookings</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={checkDataStatus}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Status
          </Button>

          {mongoStatus === "disconnected" && (
            <Button
              onClick={testMongoConnection}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Test MongoDB Connection
            </Button>
          )}

          {localCount > mongoCount && mongoStatus === "connected" && (
            <Button
              onClick={syncToMongoDB}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sync to MongoDB ({localCount - mongoCount} pending)
            </Button>
          )}

          {localCount > 0 && (
            <Button
              onClick={clearLocalData}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              Clear Local Data
            </Button>
          )}
        </div>

        {/* Status Messages */}
        {mongoStatus === "connected" &&
          localCount === mongoCount &&
          mongoCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                All booking data is synced with MongoDB database.
              </span>
            </div>
          )}

        {mongoStatus === "disconnected" && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">
              MongoDB database is not connected. Data is stored locally only.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingDataManager;
