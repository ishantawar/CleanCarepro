import React from "react";
import { Badge } from "@/components/ui/badge";
import { User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CustomerSummaryProps {
  currentUser: any;
  variant?: "compact" | "expanded";
  showCopyButton?: boolean;
}

const CustomerSummary: React.FC<CustomerSummaryProps> = ({
  currentUser,
  variant = "compact",
  showCopyButton = true,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!currentUser) return null;

  const handleCopyCustomerId = async () => {
    if (!currentUser.customer_id) return;

    try {
      await navigator.clipboard.writeText(currentUser.customer_id);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Customer ID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy customer ID",
        variant: "destructive",
      });
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <User className="h-4 w-4 text-gray-600" />
        <span className="text-sm text-gray-700">
          {currentUser.name || currentUser.full_name || "Customer"}
        </span>
        {currentUser.customer_id && (
          <Badge variant="outline" className="font-mono text-xs">
            {currentUser.customer_id}
          </Badge>
        )}
        {showCopyButton && currentUser.customer_id && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopyCustomerId}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {currentUser.name || currentUser.full_name || "Customer"}
            </h4>
            <p className="text-sm text-gray-600">+91 {currentUser.phone}</p>
          </div>
        </div>
        {currentUser.customer_id && (
          <div className="flex items-center gap-2">
            <Badge className="font-mono bg-blue-100 text-blue-700 hover:bg-blue-200">
              {currentUser.customer_id}
            </Badge>
            {showCopyButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCopyCustomerId}
                title="Copy Customer ID"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
      {currentUser.customer_id && (
        <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
          Use this Customer ID for booking inquiries and support
        </div>
      )}
    </div>
  );
};

export default CustomerSummary;
