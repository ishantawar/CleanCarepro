import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  ShoppingCart,
  Plus,
} from "lucide-react";
import ServiceEditor from "./ServiceEditor";

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSave: (updatedBooking: any) => void;
  mode?: "edit" | "add-services";
}

const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSave,
  mode = "edit",
}) => {
  const [formData, setFormData] = useState({
    scheduled_date:
      booking?.scheduled_date || booking?.pickupDate
        ? new Date(booking.scheduled_date || booking.pickupDate)
            .toISOString()
            .split("T")[0]
        : "",
    scheduled_time: booking?.scheduled_time || booking?.pickupTime || "",
    address:
      typeof booking?.address === "object" && booking?.address !== null
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
        : booking?.address || "",
    additional_details: booking?.additional_details || "",
  });

  const [selectedServices, setSelectedServices] = useState<string[]>(() => {
    if (booking?.services && Array.isArray(booking.services)) {
      return booking.services
        .map((service: any) =>
          typeof service === "object" ? service.name || "" : service,
        )
        .filter(Boolean);
    }
    if (booking?.service) {
      const service = booking.service;
      return [
        typeof service === "object" ? service.name || "" : service,
      ].filter(Boolean);
    }
    return [];
  });

  // Calculate initial total price from services, not final amount
  const [totalPrice, setTotalPrice] = useState(() => {
    const servicesPrice = booking?.total_price || booking?.totalAmount || 0;
    // Subtract delivery charge if it was included in the total
    const deliveryCharge = 50;
    const finalAmount = booking?.final_amount || booking?.totalAmount || 0;
    if (
      finalAmount > servicesPrice &&
      finalAmount - servicesPrice === deliveryCharge
    ) {
      return servicesPrice;
    }
    return servicesPrice || 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleSave = async () => {
    setIsLoading(true);

    try {
      console.log("💾 EditBookingModal handleSave called with:", {
        originalBooking: booking,
        bookingId: booking?.id,
        bookingMongoId: booking?._id,
        bookingKeys: booking ? Object.keys(booking) : [],
      });

      // Calculate delivery charge
      const deliveryCharge = 50;
      const finalAmount = totalPrice + deliveryCharge;

      // Ensure we preserve the booking ID correctly
      const bookingId = booking?.id || booking?._id;
      if (!bookingId) {
        throw new Error("No valid booking ID found in original booking object");
      }

      const updatedBooking = {
        ...booking,
        // Explicitly preserve the ID fields
        id: booking.id,
        _id: booking._id,
        scheduled_date: formData.scheduled_date,
        pickupDate: formData.scheduled_date, // Also update pickupDate
        scheduled_time: formData.scheduled_time,
        pickupTime: formData.scheduled_time, // Also update pickupTime
        address: formData.address,
        additional_details: formData.additional_details,
        services: selectedServices.map((service) => ({
          name: typeof service === "string" ? service : service.name || service,
          quantity: 1,
          price: Math.round(totalPrice / selectedServices.length),
        })),
        service:
          selectedServices.length === 1
            ? typeof selectedServices[0] === "string"
              ? selectedServices[0]
              : selectedServices[0].name
            : selectedServices
                .map((s) => (typeof s === "string" ? s : s.name))
                .join(", "),
        totalAmount: totalPrice,
        total_price: totalPrice,
        final_amount: finalAmount,
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("📤 Passing updatedBooking to onSave:", {
        updatedBooking,
        hasId: !!updatedBooking.id,
        hasMongoId: !!updatedBooking._id,
        idValue: updatedBooking.id,
        mongoIdValue: updatedBooking._id,
      });

      await onSave(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "add-services" ? (
              <>
                <Plus className="w-5 h-5 text-blue-600" />
                Add Services
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5 text-blue-600" />
                Edit Booking
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "add-services"
              ? "Add more services to your existing booking. The total amount will be updated."
              : "Update your booking details below. Changes will be saved immediately."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger
              value="details"
              className="flex items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Booking Details</span>
              <span className="sm:hidden">Details</span>
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="flex items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm"
            >
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Services</span>
              <span className="sm:hidden">Services</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Current Services Summary */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Selected Services
              </p>
              <div className="space-y-1 max-w-full overflow-hidden">
                {selectedServices.map((service, index) => (
                  <p key={index} className="text-blue-800 text-sm break-words">
                    •{" "}
                    {typeof service === "object"
                      ? service.name || JSON.stringify(service)
                      : service}
                  </p>
                ))}
                {selectedServices.length === 0 && (
                  <p className="text-blue-700 text-sm italic">
                    No services selected
                  </p>
                )}
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Services Total:</span>
                  <span>₹{totalPrice || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Delivery Charge:</span>
                  <span>₹50</span>
                </div>
                <hr className="border-blue-300" />
                <div className="flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span>₹{(totalPrice || 0) + 50}</span>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) =>
                  handleInputChange("scheduled_date", e.target.value)
                }
                className="rounded-xl"
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) =>
                  handleInputChange("scheduled_time", e.target.value)
                }
                className="rounded-xl"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter your service address"
                rows={3}
                className="rounded-xl"
              />
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="details" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Additional Details
              </Label>
              <Textarea
                id="details"
                value={formData.additional_details}
                onChange={(e) =>
                  handleInputChange("additional_details", e.target.value)
                }
                placeholder="Any special instructions or requirements"
                rows={3}
                className="rounded-xl"
              />
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <ServiceEditor
              selectedServices={selectedServices}
              onServicesChange={setSelectedServices}
              onPriceChange={setTotalPrice}
              mode={mode}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookingModal;
