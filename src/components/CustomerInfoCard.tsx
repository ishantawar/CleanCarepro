import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Calendar, Package } from "lucide-react";

interface CustomerInfoCardProps {
  currentUser: any;
  bookingCount?: number;
  className?: string;
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  currentUser,
  bookingCount = 0,
  className = "",
}) => {
  if (!currentUser) return null;

  const memberSince = currentUser.created_at || currentUser.createdAt;
  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <Card
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {currentUser.name || currentUser.full_name || "Customer"}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                <Phone className="h-3 w-3" />
                <span>+91 {currentUser.phone}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            {currentUser.customer_id && (
              <Badge
                variant="secondary"
                className="font-mono text-xs bg-blue-100 text-blue-700"
              >
                {currentUser.customer_id}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Total Bookings</p>
              <p className="font-semibold text-gray-900">{bookingCount}</p>
            </div>
          </div>

          {memberSince && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-gray-600">Member Since</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(memberSince)}
                </p>
              </div>
            </div>
          )}
        </div>

        {currentUser.customer_id && (
          <div className="mt-3 p-2 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Customer ID:</strong> Use this ID for easy booking lookup
              and customer support
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerInfoCard;
