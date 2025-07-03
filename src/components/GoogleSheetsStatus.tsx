import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface GoogleSheetsStatusProps {
  isVisible?: boolean;
}

const GoogleSheetsStatus: React.FC<GoogleSheetsStatusProps> = ({
  isVisible = false,
}) => {
  const [status, setStatus] = useState<
    "checking" | "connected" | "disconnected" | "error"
  >("checking");
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sheets/test");
      const data = await response.json();

      if (data.success) {
        setStatus("connected");
      } else {
        setStatus("error");
      }
      setDetails(data);
    } catch (error) {
      setStatus("disconnected");
      setDetails({ message: "Unable to connect to backend" });
    } finally {
      setLoading(false);
    }
  };

  const syncBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sheets/sync", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        alert(`✅ Synced ${data.syncedBookings} bookings to Google Sheets`);
      } else {
        alert(`❌ Sync failed: ${data.message}`);
      }
    } catch (error) {
      alert("❌ Failed to sync bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      checkConnection();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "disconnected":
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200";
      case "disconnected":
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Google Sheets Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              {status === "checking"
                ? "Checking..."
                : status === "connected"
                  ? "Connected"
                  : status === "disconnected"
                    ? "Disconnected"
                    : "Error"}
            </span>
          </div>
          <Badge className={getStatusColor()}>
            {details?.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {details && (
          <div className="text-sm text-gray-600">
            <p>{details.message}</p>
            {details.sheetId && (
              <p className="mt-1">Sheet: {details.sheetId}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={checkConnection}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Test Connection
          </Button>

          {status === "connected" && (
            <Button
              onClick={syncBookings}
              disabled={loading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              Sync All Bookings
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 bg-white p-2 rounded border">
          <p className="font-medium mb-1">📊 Auto-sync Features:</p>
          <ul className="space-y-0.5">
            <li>• New bookings automatically added to sheets</li>
            <li>• Booking updates sync in real-time</li>
            <li>• Deleted bookings removed from sheets</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsStatus;
