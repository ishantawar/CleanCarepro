import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, Edit3 } from "lucide-react";
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
}

interface UnifiedLocationInputProps {
  onAddressChange?: (address: AddressData) => void;
  initialAddress?: AddressData;
  className?: string;
  placeholder?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const UnifiedLocationInput: React.FC<UnifiedLocationInputProps> = ({
  onAddressChange,
  initialAddress,
  className = "",
  placeholder = "Enter your complete address",
}) => {
  const [address, setAddress] = useState<AddressData>({
    flatNo: initialAddress?.flatNo || "",
    street: initialAddress?.street || "",
    landmark: initialAddress?.landmark || "",
    village: initialAddress?.village || "",
    city: initialAddress?.city || "",
    pincode: initialAddress?.pincode || "",
    fullAddress: initialAddress?.fullAddress || "",
    coordinates: initialAddress?.coordinates,
  });

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLoadingGoogleMaps, setIsLoadingGoogleMaps] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    initialAddress?.fullAddress || "",
  );

  const autocompleteRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      initializeAutocomplete();
    } else {
      loadGoogleMapsAPI();
    }
  }, []);

  useEffect(() => {
    if (address.fullAddress !== inputValue) {
      setInputValue(address.fullAddress);
    }
  }, [address.fullAddress]);

  const loadGoogleMapsAPI = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not configured");
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }

    setIsLoadingGoogleMaps(true);
    const script = document.createElement("script");
    const callbackName = `initGoogleMaps_${Date.now()}`;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    (window as any)[callbackName] = () => {
      setIsLoadingGoogleMaps(false);
      initializeAutocomplete();
      delete (window as any)[callbackName];
    };

    document.head.appendChild(script);
  };

  const initializeAutocomplete = () => {
    if (!window.google || !searchInputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      searchInputRef.current,
      {
        types: ["address"],
        componentRestrictions: { country: "IN" },
        fields: ["address_components", "formatted_address", "geometry"],
      },
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (place.address_components) {
        parseGoogleMapsPlace(place);
      }
    });
  };

  const parseGoogleMapsPlace = (place: any) => {
    const components = place.address_components;
    const newAddress: AddressData = {
      flatNo: "",
      street: "",
      landmark: "",
      village: "",
      city: "",
      pincode: "",
      fullAddress: place.formatted_address || "",
      coordinates: place.geometry?.location
        ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }
        : undefined,
    };

    // Parse address components
    components.forEach((component: any) => {
      const types = component.types;
      const longName = component.long_name;

      if (types.includes("street_number")) {
        newAddress.flatNo = longName;
      } else if (types.includes("route")) {
        newAddress.street = longName;
      } else if (types.includes("sublocality_level_2")) {
        if (!newAddress.street) {
          newAddress.street = longName;
        } else {
          newAddress.street += `, ${longName}`;
        }
      } else if (
        types.includes("sublocality_level_1") ||
        types.includes("sublocality")
      ) {
        newAddress.village = longName;
      } else if (types.includes("locality")) {
        newAddress.city = longName;
      } else if (types.includes("postal_code")) {
        newAddress.pincode = longName;
      } else if (types.includes("administrative_area_level_1")) {
        if (!newAddress.city) {
          newAddress.city = longName;
        }
      }
    });

    setAddress(newAddress);
    setInputValue(newAddress.fullAddress);
    setIsEditing(false);

    if (onAddressChange) {
      onAddressChange(newAddress);
    }
  };

  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          });
        },
      );

      const coordinates: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      const addressString = await locationService.reverseGeocode(coordinates);

      if (addressString) {
        const newAddress: AddressData = {
          flatNo: "",
          street: "",
          landmark: "",
          village: "",
          city: "",
          pincode: "",
          fullAddress: addressString,
          coordinates,
        };

        // Try to parse the address string
        const parts = addressString.split(",").map((part) => part.trim());
        if (parts.length >= 3) {
          newAddress.street = parts[0] || "";
          newAddress.village = parts[1] || "";
          newAddress.city = parts[parts.length - 2] || "";

          // Extract pincode if present
          const lastPart = parts[parts.length - 1];
          const pincodeMatch = lastPart.match(/\d{6}/);
          if (pincodeMatch) {
            newAddress.pincode = pincodeMatch[0];
          }
        }

        setAddress(newAddress);
        setInputValue(addressString);

        if (onAddressChange) {
          onAddressChange(newAddress);
        }
      }
    } catch (error) {
      console.error("Location detection failed:", error);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Update address object with manual input
    const updatedAddress = {
      ...address,
      fullAddress: value,
    };

    setAddress(updatedAddress);

    if (onAddressChange) {
      onAddressChange(updatedAddress);
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="unified-address" className="text-sm font-medium">
          Pickup Address *
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={detectCurrentLocation}
            disabled={isDetectingLocation}
            className="text-xs h-8 px-2"
          >
            {isDetectingLocation ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Navigation className="h-3 w-3 mr-1" />
            )}
            Detect
          </Button>

          {inputValue && !isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleEdit}
              className="text-xs h-8 px-2"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            id="unified-address"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={!isEditing && inputValue.length > 0}
            className={`pl-10 min-h-[48px] ${
              !isEditing && inputValue.length > 0
                ? "bg-gray-50 cursor-pointer"
                : ""
            }`}
            onClick={() => {
              if (!isEditing && inputValue.length > 0) {
                toggleEdit();
              }
            }}
          />
        </div>

        {isLoadingGoogleMaps && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {inputValue && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-2">{inputValue}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedLocationInput;
