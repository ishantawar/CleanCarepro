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

  // Update parent when services change
  useEffect(() => {
    const serviceStrings = services.map((service) => ({
      name: service.name,
      quantity: service.quantity,
      price: service.price,
    }));
    onServicesChange(serviceStrings);

    const totalPrice = services.reduce(
      (total, service) => total + service.price * service.quantity,
      0,
    );
    onPriceChange(totalPrice);
  }, [services, onServicesChange, onPriceChange]);

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
    <div className="space-y-6">
      {/* Current Services */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Current Services
        </h3>

        {services.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No services selected</p>
            <p className="text-sm">Add services from the options below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service, index) => (
              <Card key={index} className="border-blue-100 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {service.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ₹{service.price} per item
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateServiceQuantity(index, service.quantity - 1)
                          }
                          className="w-8 h-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {service.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateServiceQuantity(index, service.quantity + 1)
                          }
                          className="w-8 h-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-blue-600">
                          ₹{service.price * service.quantity}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Services Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Services
        </h3>

        {/* Available Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableServices.map((service) => {
            const isSelected = services.some((s) => s.name === service.name);

            return (
              <Card
                key={service.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected
                    ? "border-green-500 bg-green-50"
                    : "hover:border-gray-300"
                }`}
                onClick={() => addAvailableService(service.name, service.price)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                        {service.name}
                      </h4>
                      <p className="text-xs text-gray-500 mb-2">
                        {service.category}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          ₹{service.price}
                        </span>
                        <span className="text-xs text-gray-500">
                          {service.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 ml-2">
                      {isSelected && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700"
                        >
                          Added
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={isSelected ? "secondary" : "outline"}
                        className="w-8 h-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Total */}
      {services.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Services Total</span>
                <span className="text-sm">
                  ₹
                  {services.reduce(
                    (total, service) =>
                      total + service.price * service.quantity,
                    0,
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delivery Charge</span>
                <span className="text-sm">₹50</span>
              </div>
              <hr className="border-gray-300" />
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Amount</span>
                <span className="text-xl font-bold text-green-600">
                  ₹
                  {services.reduce(
                    (total, service) =>
                      total + service.price * service.quantity,
                    0,
                  ) + 50}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {services.reduce((total, service) => total + service.quantity, 0)}{" "}
              items • Delivery included
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceEditor;
