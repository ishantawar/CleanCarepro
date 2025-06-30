import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Minus,
  Trash2,
  Package,
  ShirtIcon as Shirt,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  laundryServices,
  LaundryService,
  getSortedServices,
} from "@/data/laundryServices";

interface ServiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface ServiceEditorProps {
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
  onPriceChange: (totalPrice: number) => void;
  mode: "edit" | "add-services";
}

const ServiceEditor: React.FC<ServiceEditorProps> = ({
  selectedServices,
  onServicesChange,
  onPriceChange,
  mode,
}) => {
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Get actual laundry services from the data
  const availableServices = getSortedServices().map(
    (service: LaundryService) => ({
      name: service.name,
      price: service.price,
      category: service.category,
      unit: service.unit,
      description: service.description,
    }),
  );

  // Parse selected services into ServiceItem format
  useEffect(() => {
    const parsedServices = selectedServices.map((service, index) => {
      // Handle both string and object formats
      if (typeof service === "object" && service !== null) {
        // Service is already an object with name, quantity, price
        return {
          name: service.name || service.service || "Unknown Service",
          quantity: service.quantity || 1,
          price: service.price || 35,
        };
      }

      // Handle string format
      const serviceStr = String(service);
      const match = serviceStr.match(/^(.+?)(?:\s*\(x(\d+)\))?$/);
      if (match) {
        const name = match[1].trim();
        const quantity = parseInt(match[2] || "1");
        const availableService = availableServices.find((s) => s.name === name);
        return {
          name,
          quantity,
          price: availableService?.price || 35, // Default price
        };
      }
      return {
        name: serviceStr,
        quantity: 1,
        price: 35,
      };
    });
    setServices(parsedServices);
  }, [selectedServices]);

  // Update parent when services change (with debounce to prevent flickering)
  useEffect(() => {
    const timer = setTimeout(() => {
      const serviceStrings = services.map((service) => ({
        name: service.name,
        quantity: service.quantity,
        price: service.price,
      }));
      onServicesChange(serviceStrings);

      const servicesTotal = services.reduce(
        (total, service) => total + service.price * service.quantity,
        0,
      );
      // Pass only services total to parent (delivery charge added separately)
      onPriceChange(servicesTotal);
    }, 100);

    return () => clearTimeout(timer);
  }, [services]);

  const updateServiceQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeService(index);
      return;
    }

    const updatedServices = [...services];
    updatedServices[index].quantity = newQuantity;
    setServices(updatedServices);
  };

  const removeService = (index: number) => {
    const updatedServices = services.filter((_, i) => i !== index);
    setServices(updatedServices);
  };

  const addAvailableService = (serviceName: string, price: number) => {
    const existingIndex = services.findIndex((s) => s.name === serviceName);

    if (existingIndex >= 0) {
      // Increase quantity if already exists
      updateServiceQuantity(
        existingIndex,
        services[existingIndex].quantity + 1,
      );
    } else {
      // Add new service
      const newService = { name: serviceName, quantity: 1, price };
      setServices([...services, newService]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Services - Compact View */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Selected Services ({services.length})
          </h3>
          {services.length > 0 && (
            <span className="text-sm font-bold text-green-600">
              ₹
              {services.reduce(
                (total, service) => total + service.price * service.quantity,
                0,
              )}
            </span>
          )}
        </div>

        {services.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-2">
            No services selected
          </p>
        ) : (
          <div className="space-y-2">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white p-2 rounded border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {service.name}
                  </p>
                  <p className="text-xs text-gray-600">₹{service.price} each</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateServiceQuantity(index, service.quantity - 1)
                      }
                      className="w-6 h-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {service.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateServiceQuantity(index, service.quantity + 1)
                      }
                      className="w-6 h-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 min-w-fit">
                    ₹{service.price * service.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeService(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 w-6 h-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Services - Compact Grid */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Services
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {availableServices.map((service) => {
            const isSelected = services.some((s) => s.name === service.name);
            return (
              <div
                key={service.name}
                className={`p-2 border rounded cursor-pointer transition-all ${
                  isSelected
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => addAvailableService(service.name, service.price)}
              >
                <p className="text-xs font-medium text-gray-900 mb-1 line-clamp-2">
                  {service.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-600">
                    ₹{service.price}
                  </span>
                  {isSelected && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-700 px-1 py-0"
                    >
                      ✓
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Summary - Compact */}
      {services.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex justify-between items-center text-sm">
            <span>Services Total:</span>
            <span className="font-semibold">
              ₹
              {services.reduce(
                (total, service) => total + service.price * service.quantity,
                0,
              )}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Delivery:</span>
            <span>₹50</span>
          </div>
          <hr className="my-2 border-green-300" />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total:</span>
            <span className="text-lg font-bold text-green-600">
              ₹
              {services.reduce(
                (total, service) => total + service.price * service.quantity,
                0,
              ) + 50}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceEditor;
