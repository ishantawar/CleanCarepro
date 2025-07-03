import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Phone,
  User,
  Package,
  Home,
  Eye,
} from "lucide-react";

interface BookingConfirmedProps {
  bookingData: {
    bookingId: string;
    services: string[];
    totalAmount: number;
    pickupDate: string;
    pickupTime: string;
    address: any;
    customerName: string;
    customerPhone: string;
  };
  onGoHome: () => void;
  onViewBookings: () => void;
}

const BookingConfirmed: React.FC<BookingConfirmedProps> = ({
  bookingData,
  onGoHome,
  onViewBookings,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getAddressString = (address: any) => {
    if (typeof address === "string") return address;
    if (address?.fullAddress) return address.fullAddress;

    return [
      address?.flatNo,
      address?.street,
      address?.landmark,
      address?.village,
      address?.city,
      address?.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">
            Your laundry service has been successfully booked
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Booking ID Card */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Booking ID
            </h2>
            <div className="text-2xl font-bold text-green-900 tracking-wider">
              #{bookingData.bookingId.slice(-8).toUpperCase()}
            </div>
            <p className="text-sm text-green-700 mt-2">
              Save this ID for future reference
            </p>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Services Booked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookingData.services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium">{service}</span>
                  <Badge variant="secondary">Included</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Pickup Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">
                    {formatDate(bookingData.pickupDate)}
                  </p>
                  <p className="text-sm text-gray-600">Pickup Date</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">{bookingData.pickupTime}</p>
                  <p className="text-sm text-gray-600">Pickup Time</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Pickup Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">
              {getAddressString(bookingData.address)}
            </p>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">{bookingData.customerName}</p>
                  <p className="text-sm text-gray-600">Customer Name</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">{bookingData.customerPhone}</p>
                  <p className="text-sm text-gray-600">Phone Number</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-lg font-semibold text-blue-900">
                    Total Amount
                  </p>
                  <p className="text-sm text-blue-700">Including all charges</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-900">
                ₹{bookingData.totalAmount}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  Our team will contact you
                </p>
                <p className="text-sm text-amber-700">
                  We'll call to confirm your booking details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-amber-900">Pickup on schedule</p>
                <p className="text-sm text-amber-700">
                  Our rider will arrive at your specified time
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  Professional cleaning
                </p>
                <p className="text-sm text-amber-700">
                  Your clothes will be expertly cleaned and pressed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  Delivery back to you
                </p>
                <p className="text-sm text-amber-700">
                  Clean clothes delivered within 2-3 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          <Button
            onClick={onViewBookings}
            className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
          >
            <Eye className="h-5 w-5 mr-2" />
            View My Bookings
          </Button>
          <Button
            onClick={onGoHome}
            variant="outline"
            className="w-full py-6 text-lg"
          >
            <Home className="h-5 w-5 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
