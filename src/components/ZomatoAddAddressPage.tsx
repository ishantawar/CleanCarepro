import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { Loader } from "@googlemaps/js-api-loader";

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
  const [flatNo, setFlatNo] = useState("");
  const [floor, setFloor] = useState("");
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressType, setAddressType] = useState<"home" | "office" | "other">(
    "home",
  );
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [placesService, setPlacesService] =
    useState<google.maps.places.PlacesService | null>(null);
  const [autocompleteService, setAutocompleteService] =
    useState<google.maps.places.AutocompleteService | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (isOpen && mapRef.current && !mapInstance) {
      initializeMap();
    }
  }, [isOpen]);

  // Handle clicking outside suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        searchInputRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showSuggestions]);

  const initializeMap = async () => {
    try {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["places", "geometry"],
      });

      const google = await loader.load();

      // Default to India center
      const defaultCenter = { lat: 20.5937, lng: 78.9629 };

      const map = new google.maps.Map(mapRef.current!, {
        center: defaultCenter,
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      const placesService = new google.maps.places.PlacesService(map);
      const autocompleteService = new google.maps.places.AutocompleteService();

      setMapInstance(map);
      setPlacesService(placesService);
      setAutocompleteService(autocompleteService);
      setIsMapLoading(false);

      // Add click listener to map for pin placement
      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          handleMapClick(event.latLng);
        }
      });

      // Add default center marker for India
      const defaultMarker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        title: "Click anywhere on the map to select location",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' fill='%23dc2626'/%3e%3ccircle cx='12' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 24),
        },
        animation: google.maps.Animation.BOUNCE,
      });

      // Remove default marker after 3 seconds
      setTimeout(() => {
        defaultMarker.setMap(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to initialize Google Maps:", error);
      setIsMapLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Only populate if editing an existing address
      if (editingAddress) {
        setSearchQuery(editingAddress.fullAddress);
        setSelectedLocation({
          address: editingAddress.fullAddress,
          coordinates: editingAddress.coordinates || { lat: 0, lng: 0 },
        });
        setAdditionalDetails(editingAddress.flatNo || "");
        setAddressType(editingAddress.type);
        setReceiverName(editingAddress.name || "");
        setReceiverPhone(editingAddress.phone || "");

        // Update map position if editing
        if (mapInstance && editingAddress.coordinates) {
          updateMapLocation(editingAddress.coordinates);
        }
      } else {
        // Clear all fields for new address and autofill from account
        setSearchQuery("");
        setSelectedLocation(null);
        setAdditionalDetails("");
        setAddressType("home");

        // Autofill receiver details from current user account
        if (currentUser) {
          setReceiverName(currentUser.name || currentUser.full_name || "");
          setReceiverPhone(currentUser.phone || "");
        } else {
          setReceiverName("");
          setReceiverPhone("");
        }
      }
    }
  }, [isOpen, editingAddress, mapInstance, currentUser]);

  const updateMapLocation = useCallback(
    (coordinates: Coordinates) => {
      if (!mapInstance) return;

      mapInstance.setCenter(coordinates);
      mapInstance.setZoom(16);

      // Remove existing marker
      if (marker) {
        marker.setMap(null);
      }

      // Add new marker with enhanced visual feedback
      const newMarker = new google.maps.Marker({
        position: coordinates,
        map: mapInstance,
        draggable: true,
        animation: google.maps.Animation.DROP,
        title: "Drag to adjust location or click map to move pin",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='32' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' fill='%2316a34a' stroke='%23ffffff' stroke-width='1'/%3e%3ccircle cx='12' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32),
        },
      });

      // Add drag start listener for visual feedback
      newMarker.addListener("dragstart", () => {
        newMarker.setIcon({
          url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='32' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' fill='%23059669' stroke='%23ffffff' stroke-width='2'/%3e%3ccircle cx='12' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 36),
        });
      });

      // Add drag end listener with address update
      newMarker.addListener(
        "dragend",
        async (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            // Reset marker icon
            newMarker.setIcon({
              url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='32' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' fill='%2316a34a' stroke='%23ffffff' stroke-width='1'/%3e%3ccircle cx='12' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32),
            });

            // Update address
            await handleMapClick(event.latLng);
          }
        },
      );

      // Add bounce animation on click
      newMarker.addListener("click", () => {
        newMarker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => {
          newMarker.setAnimation(null);
        }, 700);
      });

      setMarker(newMarker);
    },
    [mapInstance, marker],
  );

  const handleMapClick = async (latLng: google.maps.LatLng) => {
    const coordinates = {
      lat: latLng.lat(),
      lng: latLng.lng(),
    };

    try {
      const address = await locationService.reverseGeocode(coordinates);
      setSelectedLocation({ address, coordinates });
      setSearchQuery(address);
      updateMapLocation(coordinates);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
  };

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
      updateMapLocation(coordinates);
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
      updateMapLocation(fallbackCoords);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Auto-fill address fields from full address string
  const autoFillAddressFields = (fullAddress: string) => {
    const parts = fullAddress.split(",").map((part) => part.trim());

    // Extract pincode
    const pincodeMatch = fullAddress.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      setPincode(pincodeMatch[0]);
    }

    // Try to extract city (usually second-to-last or third-to-last part)
    if (parts.length >= 2) {
      const cityPart = parts[parts.length - 3] || parts[parts.length - 2] || "";
      setCity(cityPart.replace(/\d{6}/, "").trim());
    }

    // Extract area/village (usually in middle parts)
    if (parts.length >= 3) {
      setArea(parts[1] || "");
    }

    // Extract street (usually first part)
    if (parts.length >= 1) {
      setStreet(parts[0] || "");
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Try multiple search methods for better suggestions
    try {
      let suggestions = [];

      // Method 1: Google Places API (primary)
      if (autocompleteService) {
        try {
          const request: google.maps.places.AutocompletionRequest = {
            input: query,
            componentRestrictions: { country: "in" },
            types: [
              "address",
              "establishment",
              "geocode",
              "locality",
              "sublocality",
            ],
            fields: [
              "place_id",
              "description",
              "structured_formatting",
              "types",
            ],
          };

          const predictions = await new Promise<
            google.maps.places.AutocompletePrediction[]
          >((resolve, reject) => {
            autocompleteService.getPlacePredictions(
              request,
              (predictions, status) => {
                if (
                  status === google.maps.places.PlacesServiceStatus.OK &&
                  predictions
                ) {
                  resolve(predictions);
                } else {
                  reject(new Error(`Places API error: ${status}`));
                }
              },
            );
          });

          suggestions = predictions.map((prediction) => ({
            description: prediction.description,
            main_text:
              prediction.structured_formatting?.main_text ||
              prediction.description,
            secondary_text:
              prediction.structured_formatting?.secondary_text || "",
            place_id: prediction.place_id,
            source: "google_places",
          }));
        } catch (placesError) {
          console.warn(
            "Google Places API failed, trying alternatives:",
            placesError,
          );
        }
      }

      // Method 2: Nominatim API fallback with enhanced search
      if (suggestions.length === 0) {
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, India&limit=10&addressdetails=1&countrycodes=in&extratags=1`,
            {
              headers: {
                "User-Agent": "CleanCare-App/1.0",
              },
            },
          );

          const nominatimData = await nominatimResponse.json();

          if (nominatimData && nominatimData.length > 0) {
            suggestions = nominatimData.map((item: any, index: number) => ({
              description: item.display_name,
              main_text: item.name || item.display_name.split(",")[0],
              secondary_text: item.display_name
                .split(",")
                .slice(1)
                .join(",")
                .trim(),
              place_id: `nominatim_${item.osm_id || index}`,
              coordinates: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              },
              source: "nominatim",
            }));
          }
        } catch (nominatimError) {
          console.warn("Nominatim API failed:", nominatimError);
        }
      }

      // Method 3: Enhanced local suggestions with better city coverage
      if (suggestions.length === 0) {
        const indianCities = [
          { name: "New Delhi", state: "Delhi" },
          { name: "Gurgaon", state: "Haryana" },
          { name: "Noida", state: "Uttar Pradesh" },
          { name: "Mumbai", state: "Maharashtra" },
          { name: "Bangalore", state: "Karnataka" },
          { name: "Chennai", state: "Tamil Nadu" },
          { name: "Hyderabad", state: "Telangana" },
          { name: "Pune", state: "Maharashtra" },
          { name: "Kolkata", state: "West Bengal" },
          { name: "Ahmedabad", state: "Gujarat" },
          { name: "Jaipur", state: "Rajasthan" },
          { name: "Chandigarh", state: "Punjab" },
        ];

        suggestions = indianCities
          .filter(
            (city) =>
              city.name.toLowerCase().includes(query.toLowerCase()) ||
              query.toLowerCase().includes(city.name.toLowerCase()),
          )
          .map((city) => ({
            description: `${query}, ${city.name}, ${city.state}, India`,
            main_text: query,
            secondary_text: `${city.name}, ${city.state}, India`,
            place_id: `local_${query}_${city.name.toLowerCase()}`,
            source: "local",
          }));
      }

      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error("All search methods failed:", error);
      // Ultimate fallback
      setSuggestions([
        {
          description: `${query}, India`,
          main_text: query,
          secondary_text: "India",
          place_id: `fallback_${query}`,
          source: "fallback",
        },
      ]);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionSelect = async (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setShowSuggestions(false);

    if (
      !placesService ||
      !suggestion.place_id ||
      suggestion.place_id.startsWith("mock_")
    ) {
      // Handle mock suggestions or when places service is not available
      let coordinates = { lat: 28.6139, lng: 77.209 }; // Default Delhi coordinates

      // Provide better coordinates based on city
      if (suggestion.description.includes("Mumbai")) {
        coordinates = { lat: 19.076, lng: 72.8777 };
      } else if (suggestion.description.includes("Bangalore")) {
        coordinates = { lat: 12.9716, lng: 77.5946 };
      } else if (suggestion.description.includes("Gurgaon")) {
        coordinates = { lat: 28.4595, lng: 77.0266 };
      } else if (suggestion.description.includes("Noida")) {
        coordinates = { lat: 28.5355, lng: 77.391 };
      } else if (suggestion.description.includes("Chennai")) {
        coordinates = { lat: 13.0827, lng: 80.2707 };
      } else if (suggestion.description.includes("Hyderabad")) {
        coordinates = { lat: 17.385, lng: 78.4867 };
      } else if (suggestion.description.includes("Pune")) {
        coordinates = { lat: 18.5204, lng: 73.8567 };
      }

      setSelectedLocation({
        address: suggestion.description,
        coordinates,
      });
      updateMapLocation(coordinates);

      return;
    }

    try {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: suggestion.place_id,
        fields: [
          "geometry.location",
          "formatted_address",
          "address_components",
        ],
      };

      placesService.getDetails(request, (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const coordinates = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setSelectedLocation({
            address: place.formatted_address || suggestion.description,
            coordinates,
          });

          updateMapLocation(coordinates);
        } else {
          console.error("Failed to get place details:", status);
          // Fallback to geocoding
          locationService
            .geocodeAddress(suggestion.description)
            .then((geocodeResult) => {
              setSelectedLocation({
                address: geocodeResult.formatted_address,
                coordinates: geocodeResult.coordinates,
              });
              updateMapLocation(geocodeResult.coordinates);
            })
            .catch((geocodeError) => {
              console.error("Geocoding fallback failed:", geocodeError);
            });
        }
      });
    } catch (error) {
      console.error("Place details request failed:", error);
    }
  };

  const handleSave = () => {
    if (!selectedLocation) return;

    // Build complete address from split fields
    const fullAddressParts = [
      flatNo && (floor || building)
        ? `${flatNo}, ${floor || ""} ${building || ""}`.trim()
        : flatNo,
      street,
      landmark,
      area,
      city,
      pincode,
    ].filter(Boolean);

    const completeAddress = fullAddressParts.join(", ");

    const addressData: AddressData = {
      flatNo: flatNo,
      street: street,
      landmark: landmark,
      village: area,
      city: city,
      pincode: pincode,
      fullAddress: completeAddress || selectedLocation.address,
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

    onSave(addressData);
  };

  const isFormValid = () => {
    return (
      selectedLocation &&
      receiverName.trim() &&
      receiverPhone.trim() &&
      receiverPhone.length >= 10
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-medium text-gray-900">Add Address</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="relative">
            <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
              <Search className="h-5 w-5 text-green-600 flex-shrink-0" />
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
                autoComplete="address-line1"
                autoCapitalize="words"
                spellCheck={false}
              />
            </div>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
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

        {/* Map Area - Reduced height for mobile */}
        <div className="h-64 sm:h-80 bg-gray-100 relative overflow-hidden">
          {/* Google Maps Container */}
          <div
            ref={mapRef}
            className="absolute inset-0 w-full h-full"
            style={{ minHeight: "200px" }}
          />

          {/* Map Loading Overlay */}
          {isMapLoading && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Loading map...</p>
              </div>
            </div>
          )}

          {/* Map Controls Overlay */}
          {!isMapLoading && (
            <>
              {/* Enhanced Map Instructions */}
              {!selectedLocation && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 text-white px-4 py-2 rounded-lg text-xs max-w-sm text-center hidden sm:block">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <MapPin className="h-3 w-3" />
                    <span>Pin Selection</span>
                  </div>
                  <p>
                    Search for an address or click anywhere on the map to place
                    a pin
                  </p>
                </div>
              )}

              {selectedLocation && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-green-600 bg-opacity-90 text-white px-4 py-2 rounded-lg text-xs max-w-sm text-center hidden sm:block">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <MapPin className="h-3 w-3" />
                    <span>Location Selected</span>
                  </div>
                  <p>Drag the pin to adjust or click elsewhere to move</p>
                </div>
              )}

              {/* Use Current Location Button */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                <Button
                  onClick={handleCurrentLocation}
                  disabled={isDetectingLocation}
                  className="bg-white text-green-600 border border-green-600 hover:bg-green-50 rounded-full px-4 py-2 shadow-lg text-sm"
                  size="sm"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {isDetectingLocation
                    ? "Detecting..."
                    : "Use current location"}
                </Button>
              </div>

              {/* Map Type Toggle - Smaller for mobile */}
              <div className="absolute top-2 right-2">
                <Button
                  onClick={() => {
                    if (mapInstance) {
                      const currentType = mapInstance.getMapTypeId();
                      mapInstance.setMapTypeId(
                        currentType === "roadmap" ? "satellite" : "roadmap",
                      );
                    }
                  }}
                  className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 text-xs px-2 py-1"
                  size="sm"
                >
                  <MapIcon className="h-3 w-3 mr-1" />
                  {mapInstance?.getMapTypeId() === "satellite"
                    ? "Map"
                    : "Satellite"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Form Section - Now fully scrollable */}
        <div className="bg-white p-4 space-y-6">
          {/* Delivery Details with Edit Option */}
          {selectedLocation && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900">
                  Delivery details
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(selectedLocation.address);
                    setShowSuggestions(false);
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }}
                  className="text-green-600 hover:text-green-700 text-sm px-2 py-1"
                >
                  Edit
                </Button>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="bg-green-600 rounded-full p-1 mt-1 flex-shrink-0">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {selectedLocation.address.split(",")[0]}
                  </p>
                  <p className="text-xs text-gray-600 break-words">
                    {selectedLocation.address
                      .split(",")
                      .slice(1)
                      .join(",")
                      .trim()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* House/Flat Details Section */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              House/Flat Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="flatNo"
                  className="text-sm font-medium text-gray-700"
                >
                  House/Flat Number *
                </Label>
                <Input
                  id="flatNo"
                  placeholder="e.g., 123, A-45"
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label
                  htmlFor="floor"
                  className="text-sm font-medium text-gray-700"
                >
                  Floor (Optional)
                </Label>
                <Input
                  id="floor"
                  placeholder="e.g., 2nd Floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="building"
                className="text-sm font-medium text-gray-700"
              >
                Building/Society (Optional)
              </Label>
              <Input
                id="building"
                placeholder="e.g., Sunrise Apartments"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          {/* Location Details Section */}
          <div className="bg-green-50 p-4 rounded-lg space-y-4">
            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Location Details (Auto-filled & Editable)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="street"
                  className="text-sm font-medium text-gray-700"
                >
                  Street/Road
                </Label>
                <Input
                  id="street"
                  placeholder="Street name"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label
                  htmlFor="landmark"
                  className="text-sm font-medium text-gray-700"
                >
                  Landmark (Optional)
                </Label>
                <Input
                  id="landmark"
                  placeholder="e.g., Near Metro"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label
                  htmlFor="area"
                  className="text-sm font-medium text-gray-700"
                >
                  Area/Village
                </Label>
                <Input
                  id="area"
                  placeholder="Area name"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label
                  htmlFor="city"
                  className="text-sm font-medium text-gray-700"
                >
                  City *
                </Label>
                <Input
                  id="city"
                  placeholder="City name"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label
                  htmlFor="pincode"
                  className="text-sm font-medium text-gray-700"
                >
                  Pincode *
                </Label>
                <Input
                  id="pincode"
                  placeholder="6-digit code"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  maxLength={6}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Receiver Details */}
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">
              Receiver details for this address
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="Receiver name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="border-0 p-0 focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900">
                  {receiverName || "Receiver"},{" "}
                </span>
                <Input
                  placeholder="Phone number"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="border-0 p-0 focus:ring-0"
                  type="tel"
                />
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

          {/* Bottom spacing for save button */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Save Button - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
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
