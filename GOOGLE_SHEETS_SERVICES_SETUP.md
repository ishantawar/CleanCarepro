# Google Sheets Services Management Setup

This guide helps you set up Google Sheets integration for dynamic service catalog management.

## Overview

Your operations team can now manage the website's service catalog directly from Google Sheets. This includes:

- Adding/removing services
- Updating prices and descriptions
- Managing service images
- Enabling/disabling services
- Setting popular services

## Prerequisites

1. **Google Cloud Project** with Sheets API enabled
2. **Service Account** with access to your Google Sheets
3. **Google Sheets document** to store service data

## Step 1: Create Google Sheets Document

1. Create a new Google Sheets document
2. Name it "CleanCare Services Catalog"
3. Note the Spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

## Step 2: Set Up Service Sheet Structure

Create a sheet named "Services" with the following columns:

| Column | Header               | Description                         | Example                                    |
| ------ | -------------------- | ----------------------------------- | ------------------------------------------ |
| A      | Category ID          | Unique category identifier          | `wash-fold`                                |
| B      | Category Name        | Display name for category           | `Wash & Fold`                              |
| C      | Category Icon        | Emoji for category                  | `👕`                                       |
| D      | Category Color       | Tailwind gradient class             | `from-blue-500 to-blue-600`                |
| E      | Category Description | Category description                | `Professional washing and folding service` |
| F      | Service ID           | Unique service identifier           | `wf-regular`                               |
| G      | Service Name         | Display name for service            | `Laundry and Fold`                         |
| H      | Price                | Service price in rupees             | `70`                                       |
| I      | Unit                 | Pricing unit                        | `per kg`                                   |
| J      | Description          | Service description                 | `Regular wash and fold service`            |
| K      | Popular              | Mark as popular (true/false)        | `true`                                     |
| L      | Enabled              | Enable/disable service (true/false) | `true`                                     |
| M      | Image URL            | Service image URL                   | `https://example.com/image.jpg`            |

## Step 3: Environment Variables

Add these variables to your `.env` file:

```env
# Google Sheets Services Configuration
GOOGLE_SHEETS_ENABLED=true
SERVICES_SHEET_ID=your_spreadsheet_id_here

# Google Service Account (choose one method)
# Method 1: JSON key as environment variable
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Method 2: Path to JSON key file
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
```

## Step 4: Share Sheets with Service Account

1. In your Google Sheets document, click "Share"
2. Add your service account email (found in the service account JSON)
3. Give it "Editor" access (or "Viewer" if you only want read access)

## Step 5: Initialize Default Services

Visit your backend URL to set up the initial services:

```
GET /api/services/setup-sheet
```

This will populate your Google Sheets with default services that you can then modify.

## Step 6: Test the Integration

1. **Check if services load**: Visit your app and verify services appear
2. **Test cache refresh**: Visit `/api/services/refresh` to force update
3. **Modify a service**: Change a price in Google Sheets and refresh to see changes

## Managing Services

### Adding a New Service

1. Open your Google Sheets document
2. Add a new row with the service details
3. Ensure the Category ID matches an existing category or create a new category
4. Set `Enabled` to `true`
5. Save the sheet - changes will appear within 5 minutes (cache duration)

### Updating Prices

1. Find the service row in Google Sheets
2. Update the `Price` column
3. Changes will be reflected in the app within 5 minutes

### Disabling a Service

1. Set the `Enabled` column to `false`
2. The service will be hidden from the app

### Adding Service Images

1. Upload images to a CDN or image hosting service
2. Copy the public URL
3. Paste the URL in the `Image URL` column

## Cache Behavior

- Services are cached for 5 minutes to improve performance
- To force refresh, visit: `/api/services/refresh`
- If Google Sheets is unavailable, the app falls back to static services

## Troubleshooting

### Services Not Loading

1. Check Google Sheets sharing permissions
2. Verify `SERVICES_SHEET_ID` environment variable
3. Check service account credentials
4. Look for errors in backend logs

### Images Not Displaying

1. Ensure image URLs are publicly accessible
2. Use HTTPS URLs
3. Consider using a CDN for better performance

### Services Not Updating

1. Check the 5-minute cache window
2. Force refresh at `/api/services/refresh`
3. Verify sheet structure matches expected columns

## API Endpoints

- `GET /api/services/dynamic` - Get all services (cached)
- `GET /api/services/refresh` - Force refresh from Google Sheets
- `GET /api/services/setup-sheet` - Initialize default services in Google Sheets

## Security Notes

1. Keep your service account JSON key secure
2. Only grant necessary permissions to the service account
3. Consider using read-only access if you don't need programmatic updates
4. Regularly rotate service account keys

## Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify Google Sheets API quotas
3. Test service account permissions manually
4. Contact your development team for assistance
