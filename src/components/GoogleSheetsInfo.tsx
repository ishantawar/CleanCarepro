import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  FileSpreadsheet,
  CheckCircle,
  Info,
  Copy,
  Download,
} from "lucide-react";
import { GOOGLE_SHEETS_CONFIG } from "@/config/googleSheets";
import { useToast } from "@/hooks/use-toast";

interface GoogleSheetsInfoProps {
  className?: string;
}

const GoogleSheetsInfo: React.FC<GoogleSheetsInfoProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleCopyScript = async () => {
    const script = `function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 10).setValues([
        ['Order ID', 'Timestamp', 'Customer Name', 'Phone', 'Address', 'Services', 'Total Amount', 'Pickup Date', 'Pickup Time', 'Status']
      ]);
    }
    
    // Add new row
    sheet.appendRow([
      data.data.orderId,
      data.data.timestamp,
      data.data.customerName,
      data.data.customerPhone,
      data.data.customerAddress,
      data.data.services,
      data.data.totalAmount,
      data.data.pickupDate,
      data.data.pickupTime,
      data.data.status
    ]);
    
    return ContentService.createTextOutput('Success');
  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}`;

    try {
      await navigator.clipboard.writeText(script);
      toast({
        title: "Script Copied!",
        description: "Google Apps Script code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the script manually",
        variant: "destructive",
      });
    }
  };

  const handleOpenSheet = () => {
    window.open(GOOGLE_SHEETS_CONFIG.SHEET_URL, "_blank");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={`flex items-center gap-2 ${className}`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Google Sheets Integration
            {GOOGLE_SHEETS_CONFIG.ENABLED && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                Active
              </Badge>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Google Sheets Integration
            </DialogTitle>
            <DialogDescription>
              All customer bookings are automatically saved to a Google Sheet
              for easy tracking and management.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Integration Status:</span>
                    <Badge
                      className={
                        GOOGLE_SHEETS_CONFIG.ENABLED
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {GOOGLE_SHEETS_CONFIG.ENABLED ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sheet Name:</span>
                    <span className="font-mono text-sm">
                      {GOOGLE_SHEETS_CONFIG.SHEET_NAME}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Auto-Save Bookings:</span>
                    <Badge className="bg-blue-100 text-blue-700">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What Gets Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {GOOGLE_SHEETS_CONFIG.HEADERS.map((header, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{header}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleOpenSheet}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Google Sheet
                </Button>

                <Button
                  onClick={handleCopyScript}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Apps Script Code
                </Button>
              </CardContent>
            </Card>

            {/* Setup Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                  <Info className="h-5 w-5" />
                  Setup Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-800">
                <p>• All bookings are automatically saved to Google Sheets</p>
                <p>• Data includes customer details, services, and pricing</p>
                <p>• Failed saves are retried automatically</p>
                <p>• No manual intervention required</p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GoogleSheetsInfo;
