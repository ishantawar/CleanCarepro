import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Loader2,
  Navigation,
  X,
  Search,
  Home,
  Building2,
  MapIcon,
  CheckCircle,
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
  type?: "home" | "office" | "other";
}

interface EnhancedIndiaAddressFormProps {
  onAddressChange?: (address: AddressData) => void;
  onAddressUpdate?: (address: AddressData) => void;
  initialAddress?: AddressData;
  className?: string;
  showLabel?: boolean;
}

interface GooglePlacePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

const EnhancedIndiaAddressForm: React.FC<EnhancedIndiaAddressFormProps> = ({
  onAddressChange,
  onAddressUpdate,
  initialAddress,
  className = "",
  showLabel = false,
}) => {
  // Address state - split into house details and location details
  const [houseDetails, setHouseDetails] = useState({
    flatNo: initialAddress?.flatNo || "",
    floor: "",
    building: "",
  });

  const [locationDetails, setLocationDetails] = useState({
    street: initialAddress?.street || "",
    landmark: initialAddress?.landmark || "",
    village: initialAddress?.village || "",
    city: initialAddress?.city || "",
    pincode: initialAddress?.pincode || "",
    fullAddress: initialAddress?.fullAddress || "",
    coordinates: initialAddress?.coordinates,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GooglePlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [addressType, setAddressType] = useState<"home" | "office" | "other">(
    initialAddress?.type || "home",
  );
  const [addressLabel, setAddressLabel] = useState(initialAddress?.label || "");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  // Initialize Google Maps services
  useEffect(() => {
    if (window.google?.maps?.places) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
      const map = new window.google.maps.Map(document.createElement("div"));
      placesService.current = new window.google.maps.places.PlacesService(map);
    }
  }, []);

  // Debounced search for addresses
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        await searchAddresses(query);
      } catch (error) {
        console.error("Error searching addresses:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [],
  );

  // Search addresses across India using Google Places API
  const searchAddresses = async (query: string) => {
    if (!autocompleteService.current) return;

    const request = {
      input: query,
      componentRestrictions: { country: "in" }, // Restrict to India
      types: ["address", "establishment", "geocode"],
    };

    autocompleteService.current.getPlacePredictions(
      request,
      (predictions: GooglePlacePrediction[], status: any) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setSuggestions(predictions);
        } else {
          // Fallback to Nominatim for better India coverage
          searchWithNominatim(query);
        }
      },
    );
  };

  // Fallback search using Nominatim (OpenStreetMap)
  const searchWithNominatim = async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, India&limit=8&addressdetails=1&countrycodes=in`,
        {
          headers: {
            "User-Agent": "CleanCare-App/1.0",
          },
        },
      );

      const data = await response.json();
      if (data && data.length > 0) {
        const nominatimSuggestions = data.map((item: any) => ({
          description: item.display_name,
          place_id: `nominatim_${item.osm_id}`,
          structured_formatting: {
            main_text: item.name || item.display_name.split(",")[0],
            secondary_text: item.display_name
              .split(",")
              .slice(1)
              .join(", ")
              .trim(),
          },
          coordinates: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          },
          source: "nominatim",
        }));
        setSuggestions(nominatimSuggestions);
      }
    } catch (error) {
      console.error("Nominatim search error:", error);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);
    debouncedSearch(value);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      if (suggestion.source === "nominatim") {
        // Handle Nominatim suggestion
        parseAndFillAddress(suggestion.description, suggestion.coordinates);
      } else {
        // Handle Google Places suggestion
        await getPlaceDetails(suggestion.place_id);
      }
    } catch (error) {
      console.error("Error getting place details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get detailed place information from Google Places
  const getPlaceDetails = async (placeId: string) => {
    if (!placesService.current) return;

    const request = {
      placeId: placeId,
      fields: ["formatted_address", "geometry", "address_components"],
    };

    placesService.current.getDetails(request, (place: any, status: any) => {
      if (
        status === window.google.maps.places.PlacesServiceStatus.OK &&
        place
      ) {
        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        parseAndFillAddress(
          place.formatted_address,
          coordinates,
          place.address_components,
        );
      }
    });
  };

  // Parse address and fill form fields with enhanced house number detection
  const parseAndFillAddress = (
    address: string,
    coordinates: Coordinates,
    addressComponents?: any[],
  ) => {
    let parsedCity = "";
    let parsedPincode = "";
    let parsedStreet = "";
    let parsedVillage = "";
    let parsedFlatNo = "";
    let parsedBuilding = "";

    if (addressComponents) {
      // Parse Google Places address components
      addressComponents.forEach((component) => {
        const types = component.types;
        if (
          types.includes("locality") ||
          types.includes("administrative_area_level_2")
        ) {
          parsedCity = component.long_name;
        } else if (types.includes("postal_code")) {
          parsedPincode = component.long_name;
        } else if (types.includes("route")) {
          parsedStreet = component.long_name;
        } else if (types.includes("administrative_area_level_3")) {
          parsedVillage = component.long_name;
        } else if (types.includes("street_number")) {
          parsedFlatNo = component.long_name;
        } else if (types.includes("premise") || types.includes("subpremise")) {
          // Extract building or complex name
          if (!parsedBuilding) {
            parsedBuilding = component.long_name;
          }
        }
      });
    } else {
      // Parse plain address string with enhanced house number extraction
      const parts = address.split(",").map((part) => part.trim());

      // Try to extract pincode
      const pincodeMatch = address.match(/\b\d{6}\b/);
      if (pincodeMatch) {
        parsedPincode = pincodeMatch[0];
      }

      // Enhanced house number extraction using utility function
      const extractedDetails = locationService.extractHouseNumber(address);

      if (extractedDetails.houseNumber) {
        parsedFlatNo = extractedDetails.houseNumber;
      }

      if (extractedDetails.building) {
        parsedBuilding = extractedDetails.building;
      }

      // Use cleaned address for further parsing
      const cleanedParts = extractedDetails.cleanedAddress
        ? extractedDetails.cleanedAddress.split(",").map((part) => part.trim())
        : parts.slice(parsedFlatNo ? 1 : 0);

      // Try to extract city (usually second-to-last or third-to-last part)
      if (cleanedParts.length >= 2) {
        parsedCity =
          cleanedParts[cleanedParts.length - 3] ||
          cleanedParts[cleanedParts.length - 2] ||
          "";
        parsedCity = parsedCity.replace(/\d{6}/, "").trim(); // Remove pincode if present
      }

      // Extract street (usually first part of cleaned address)
      if (cleanedParts.length >= 1) {
        parsedStreet = cleanedParts[0] || "";
        // Clean up street name
        parsedStreet = parsedStreet
          .replace(/^\d+[A-Z]*\s*[-\/]?\s*/i, "")
          .trim();
      }

      // Extract village/area from remaining parts
      if (cleanedParts.length >= 2) {
        parsedVillage = cleanedParts[1] || "";
        parsedVillage = parsedVillage.replace(/\d{6}/, "").trim();
      }
    }

    // Update house details if we found house number or building info
    const newHouseDetails = {
      ...houseDetails,
      ...(parsedFlatNo && { flatNo: parsedFlatNo }),
      ...(parsedBuilding && { building: parsedBuilding }),
    };

    const newLocationDetails = {
      street: parsedStreet,
      landmark: "",
      village: parsedVillage,
      city: parsedCity,
      pincode: parsedPincode,
      fullAddress: address,
      coordinates: coordinates,
    };

    setHouseDetails(newHouseDetails);
    setLocationDetails(newLocationDetails);
    notifyAddressChange(newHouseDetails, newLocationDetails);
  };

  // Detect current location
  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true);

    try {
      const result = await locationService.getCurrentLocation();
      if (result.success && result.coordinates) {
        const addressResult = await locationService.reverseGeocode(
          result.coordinates,
        );
        if (addressResult.success && addressResult.address) {
          setSearchQuery(addressResult.address);
          parseAndFillAddress(addressResult.address, result.coordinates);
        }
      } else {
        console.error("Failed to get current location:", result.error);
      }
    } catch (error) {
      console.error("Location detection error:", error);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Notify parent component of address changes
  const notifyAddressChange = (
    house: typeof houseDetails,
    location: typeof locationDetails,
  ) => {
    const fullAddress: AddressData = {
      flatNo: house.flatNo,
      street: location.street,
      landmark: location.landmark,
      village: location.village,
      city: location.city,
      pincode: location.pincode,
      fullAddress: location.fullAddress,
      coordinates: location.coordinates,
      label: addressLabel,
      type: addressType,
    };

    if (onAddressChange) {
      onAddressChange(fullAddress);
    }
    if (onAddressUpdate) {
      onAddressUpdate(fullAddress);
    }
  };

  // Handle house details change
  const handleHouseDetailsChange = (field: string, value: string) => {
    const newHouseDetails = { ...houseDetails, [field]: value };
    setHouseDetails(newHouseDetails);
    notifyAddressChange(newHouseDetails, locationDetails);
  };

  // Handle location details change
  const handleLocationDetailsChange = (field: string, value: string) => {
    const newLocationDetails = { ...locationDetails, [field]: value };
    setLocationDetails(newLocationDetails);
    notifyAddressChange(houseDetails, newLocationDetails);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Address Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Address in India
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search for any address in India..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(true)}
              className="pr-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.place_id}-${index}`}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {suggestion.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={detectCurrentLocation}
            disabled={isDetectingLocation}
            className="w-full flex items-center gap-2"
          >
            {isDetectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Use Current Location
          </Button>
        </CardContent>
      </Card>

      {/* House/Flat Details - Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            House/Flat Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="flatNo">House/Flat Number *</Label>
              <Input
                id="flatNo"
                type="text"
                placeholder="e.g., 123, A-45, Plot 67"
                value={houseDetails.flatNo}
                onChange={(e) =>
                  handleHouseDetailsChange("flatNo", e.target.value)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="floor">Floor (Optional)</Label>
              <Input
                id="floor"
                type="text"
                placeholder="e.g., Ground Floor, 2nd Floor"
                value={houseDetails.floor}
                onChange={(e) =>
                  handleHouseDetailsChange("floor", e.target.value)
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="building">Building/Society Name (Optional)</Label>
            <Input
              id="building"
              type="text"
              placeholder="e.g., Sunrise Apartments, Blue Ridge Society"
              value={houseDetails.building}
              onChange={(e) =>
                handleHouseDetailsChange("building", e.target.value)
              }
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location Details - Auto-filled but Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">Street/Road</Label>
              <Input
                id="street"
                type="text"
                placeholder="Street or road name"
                value={locationDetails.street}
                onChange={(e) =>
                  handleLocationDetailsChange("street", e.target.value)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="landmark">Landmark (Optional)</Label>
              <Input
                id="landmark"
                type="text"
                placeholder="e.g., Near Metro Station"
                value={locationDetails.landmark}
                onChange={(e) =>
                  handleLocationDetailsChange("landmark", e.target.value)
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="village">Area/Village</Label>
              <Input
                id="village"
                type="text"
                placeholder="Area or village"
                value={locationDetails.village}
                onChange={(e) =>
                  handleLocationDetailsChange("village", e.target.value)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                type="text"
                placeholder="City name"
                value={locationDetails.city}
                onChange={(e) =>
                  handleLocationDetailsChange("city", e.target.value)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                type="text"
                placeholder="6-digit pincode"
                value={locationDetails.pincode}
                onChange={(e) =>
                  handleLocationDetailsChange("pincode", e.target.value)
                }
                maxLength={6}
                pattern="[0-9]{6}"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Type and Label */}
      {showLabel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {[
                { key: "home", label: "Home", icon: Home },
                { key: "office", label: "Office", icon: Building2 },
                { key: "other", label: "Other", icon: MapIcon },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  type="button"
                  variant={addressType === key ? "default" : "outline"}
                  onClick={() =>
                    setAddressType(key as "home" | "office" | "other")
                  }
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>

            {addressType === "other" && (
              <div>
                <Label htmlFor="addressLabel">Address Label</Label>
                <Input
                  id="addressLabel"
                  type="text"
                  placeholder="e.g., Mom's House, Gym"
                  value={addressLabel}
                  onChange={(e) => setAddressLabel(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default EnhancedIndiaAddressForm;
