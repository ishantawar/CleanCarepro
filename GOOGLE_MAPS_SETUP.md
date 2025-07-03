# Google Maps Integration Setup

## Overview

The address search and map functionality in the app now uses Google Maps API for:

- Interactive map display for India
- Address search with autocomplete
- Reverse geocoding (coordinates to address)
- Place details and location selection

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain/localhost

### 2. Configure Environment Variables

Add your Google Maps API key to `.env` file:

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. API Restrictions (Recommended)

For security, restrict your API key to:

- **Application restrictions**: HTTP referrers (websites)
  - Add your domain: `https://yourdomain.com/*`
  - For development: `http://localhost:*`
- **API restrictions**: Limit to required APIs only
  - Maps JavaScript API
  - Places API
  - Geocoding API

## Features

### Address Search

- Real-time autocomplete suggestions for Indian addresses
- Restricted to India for better results
- Handles both establishments and addresses

### Interactive Map

- Click anywhere on map to select location
- Draggable marker for precise positioning
- Satellite/Map view toggle
- Focused on India with appropriate zoom levels

### Current Location

- GPS-based location detection
- Automatic address resolution
- Fallback to Delhi coordinates if location access denied

### Offline Fallback

- Mock suggestions when Google API is unavailable
- Basic geocoding through OpenStreetMap
- Graceful degradation for poor connectivity

## Implementation Details

### Components Modified

- `ZomatoAddAddressPage.tsx` - Enhanced with Google Maps integration

### Dependencies Added

- `@googlemaps/js-api-loader` - For loading Google Maps API

### API Usage

- **Places Autocomplete**: For search suggestions
- **Place Details**: For getting coordinates from place IDs
- **Maps JavaScript API**: For interactive map display
- **Geocoding**: For reverse geocoding (coordinates to address)

## Troubleshooting

### Map Not Loading

1. Check if `VITE_GOOGLE_MAPS_API_KEY` is set correctly
2. Verify API key has required APIs enabled
3. Check browser console for API errors
4. Ensure API key domain restrictions allow your domain

### Search Not Working

1. Verify Places API is enabled for your API key
2. Check API quotas and usage limits
3. Test with a simple query like "Delhi"

### Location Detection Fails

1. Ensure HTTPS for location access (required by browsers)
2. Check if user granted location permission
3. Fallback will use Delhi coordinates automatically

## Cost Considerations

### Free Tier Limits

- Maps JavaScript API: 28,000 map loads per month
- Places API: $17 worth of credits per month
- Geocoding API: $200 worth of credits per month

### Optimization Tips

- Cache search results to reduce API calls
- Debounce search input to avoid excessive requests
- Use session tokens for autocomplete to get better pricing
- Consider implementing client-side caching for frequently searched locations

## Development vs Production

### Development

- Use localhost restrictions
- Monitor API usage in Google Cloud Console
- Test with various address formats

### Production

- Update domain restrictions to production domain
- Set up billing alerts for API usage
- Consider implementing rate limiting
- Monitor API quotas and performance
