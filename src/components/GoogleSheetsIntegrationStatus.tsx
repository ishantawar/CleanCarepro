import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, CheckCircle } from "lucide-react";
import { GOOGLE_SHEETS_CONFIG } from "@/config/googleSheets";

interface GoogleSheetsIntegrationStatusProps {
  className?: string;
}

const GoogleSheetsIntegrationStatus: React.FC<
  GoogleSheetsIntegrationStatusProps
> = ({ className = "" }) => {
  if (!GOOGLE_SHEETS_CONFIG.ENABLED) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 z-40 ${className}`}>
      <Badge
        variant="outline"
        className="bg-green-100 text-green-800 border-green-300 flex items-center gap-2 px-3 py-2 shadow-lg"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs font-medium">
          📊 Google Sheets Integration Active
        </span>
      </Badge>
    </div>
  );
};

export default GoogleSheetsIntegrationStatus;
