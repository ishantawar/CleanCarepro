import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Search,
  MapPin,
  Navigation,
  Home,
  Building2,
  MapIcon,
  Phone,
  User,
} from "lucide-react";
import { locationService, Coordinates } from "@/services/locationService";

interface AddressData {
  flatNo: string;
  street: string;
  landmark: string;
  village: string;
  city: string;
  pincode: string;
  fullAddress: string;
  coordinates?: Coordinates;
  label?: string;
  type: "home" | "office" | "other";
  phone?: string;
  name?: string;
}

interface ZomatoAddAddressPageProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: AddressData) => void;
  currentUser?: any;
  editingAddress?: AddressData | null;
}

const ZomatoAddAddressPage: React.FC<ZomatoAddAddressPageProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  editingAddress,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    coordinates: Coordinates;
  } | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [addressType, setAddressType] = useState<"home" | "office" | "other">(
    "home",
  );
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize with user data
      if (currentUser) {
        setReceiverName(currentUser.name || currentUser.full_name || "");
        setReceiverPhone(currentUser.phone || "");
      }

      // If editing an address, populate the form
      if (editingAddress) {
        setSearchQuery(editingAddress.fullAddress);
        setSelectedLocation({
          address: editingAddress.fullAddress,
          coordinates: editingAddress.coordinates || { lat: 0, lng: 0 },
        });
        setAdditionalDetails(editingAddress.flatNo || "");
        setAddressType(editingAddress.type);
        setReceiverName(editingAddress.name || currentUser?.name || "");
        setReceiverPhone(editingAddress.phone || currentUser?.phone || "");
      }
    }
  }, [isOpen, currentUser, editingAddress]);

  const handleCurrentLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const coordinates = await locationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const address = await locationService.reverseGeocode(coordinates);

      setSelectedLocation({ address, coordinates });
      setSearchQuery(address);
    } catch (error) {
      console.error("Location detection failed:", error);
      // Use fallback location
      const fallbackCoords = { lat: 28.6139, lng: 77.209 };
      const fallbackAddress = "New Delhi, India";
      setSelectedLocation({
        address: fallbackAddress,
        coordinates: fallbackCoords,
      });
      setSearchQuery(fallbackAddress);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Mock suggestions - in real app, use Google Places API
      const mockSuggestions = [
        {
          description: `${query}, Delhi, India`,
          main_text: query,
          secondary_text: "Delhi, India",
        },
        {
          description: `${query}, Gurgaon, Haryana, India`,
          main_text: query,
          secondary_text: "Gurgaon, Haryana, India",
        },
        {
          description: `${query}, Noida, Uttar Pradesh, India`,
          main_text: query,
          secondary_text: "Noida, Uttar Pradesh, India",
        },
      ];

      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setSelectedLocation({
      address: suggestion.description,
      coordinates: { lat: 28.6139, lng: 77.209 }, // Mock coordinates
    });
    setShowSuggestions(false);
  };

  const handleSave = () => {
    if (!selectedLocation) return;

    const addressData: AddressData = {
      flatNo: additionalDetails,
      street: "",
      landmark: "",
      village: "",
      city: "",
      pincode: "",
      fullAddress: selectedLocation.address,
      coordinates: selectedLocation.coordinates,
      type: addressType,
      label:
        addressType === "home"
          ? "Home"
          : addressType === "office"
            ? "Work"
            : "Other",
      phone: receiverPhone,
      name: receiverName,
    };

    // Parse address components from the full address
    const addressParts = selectedLocation.address
      .split(",")
      .map((part) => part.trim());
    if (addressParts.length >= 2) {
      addressData.city = addressParts[addressParts.length - 2] || "";
      addressData.village = addressParts[1] || "";
      addressData.street = addressParts[0] || "";
    }

    onSave(addressData);
  };

  const isFormValid = () => {
    return (
      selectedLocation && receiverName && receiverPhone && additionalDetails
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
            <Search className="h-5 w-5 text-green-600" />
            <Input
              ref={searchInputRef}
              placeholder="Search for area, street name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="border-0 bg-transparent p-0 focus:ring-0 text-base placeholder:text-gray-500"
            />
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.main_text}
                  </div>
                  <div className="text-xs text-gray-600">
                    {suggestion.secondary_text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden">
        {/* Mock Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Interactive Map Area</p>
          </div>
        </div>

        {/* Location Pin */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-green-600 rounded-full p-3 shadow-lg">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">
            Move pin to your exact delivery location
          </div>
        </div>

        {/* Nearby Locations (Mock) */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-white rounded-lg p-2 shadow-md flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">33</span>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-md flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">79</span>
          </div>
        </div>

        {/* Use Current Location Button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleCurrentLocation}
            disabled={isDetectingLocation}
            className="bg-white text-green-600 border border-green-600 hover:bg-green-50 rounded-full px-6 py-2"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isDetectingLocation ? "Detecting..." : "Use current location"}
          </Button>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white p-4 space-y-6 max-h-96 overflow-y-auto">
        {/* Delivery Details */}
        {selectedLocation && (
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">
              Delivery details
            </h3>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-600 rounded-full p-1 mt-1">
                <MapPin className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {selectedLocation.address.split(",")[0]}
                </p>
                <p className="text-xs text-gray-600">
                  {selectedLocation.address
                    .split(",")
                    .slice(1)
                    .join(",")
                    .trim()}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="p-1">
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* Additional Address Details */}
        <div>
          <Label
            htmlFor="additional-details"
            className="text-sm font-medium text-gray-700"
          >
            Additional address details*
          </Label>
          <Textarea
            id="additional-details"
            placeholder="E.g. Floor, House no."
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            className="mt-2 min-h-[60px] resize-none"
          />
        </div>

        {/* Receiver Details */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-3">
            Receiver details for this address
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <User className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="Receiver name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="border-0 p-0 focus:ring-0"
              />
            </div>

            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-900">
                {receiverName || "Chaman"},{" "}
              </span>
              <Input
                placeholder="Phone number"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                className="border-0 p-0 focus:ring-0"
              />
              <Button variant="ghost" size="sm" className="p-1">
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>

        {/* Save Address As */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-3">
            Save address as
          </h3>
          <div className="flex gap-3">
            <Button
              variant={addressType === "home" ? "default" : "outline"}
              onClick={() => setAddressType("home")}
              className={`flex-1 ${
                addressType === "home"
                  ? "bg-green-600 text-white border-green-600"
                  : "text-gray-700 border-gray-300"
              }`}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button
              variant={addressType === "office" ? "default" : "outline"}
              onClick={() => setAddressType("office")}
              className={`flex-1 ${
                addressType === "office"
                  ? "bg-green-600 text-white border-green-600"
                  : "text-gray-700 border-gray-300"
              }`}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Work
            </Button>
            <Button
              variant={addressType === "other" ? "default" : "outline"}
              onClick={() => setAddressType("other")}
              className={`flex-1 ${
                addressType === "other"
                  ? "bg-green-600 text-white border-green-600"
                  : "text-gray-700 border-gray-300"
              }`}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Other
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleSave}
          disabled={!isFormValid()}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save address
        </Button>
      </div>
    </div>
  );
};

export default ZomatoAddAddressPage;
