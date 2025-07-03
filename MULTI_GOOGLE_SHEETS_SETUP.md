# Multiple Google Sheets Integration Guide

This guide shows you how to manage both **Service Catalog** and **Order Bookings** using separate Google Sheets, allowing your operations team to manage both efficiently.

## Overview

Your system now supports two separate Google Sheets:

1. **Services Sheet** - For managing your service catalog (prices, availability, images)
2. **Orders Sheet** - For tracking all customer bookings

## Benefits of Dual-Sheet Setup

- **Separation of Concerns**: Services and orders are managed separately
- **Team Access**: Different team members can access different sheets
- **Data Organization**: Cleaner data structure for both services and orders
- **Backup & Redundancy**: Your existing order booking sheet continues to work

## Environment Variables Setup

Add these variables to your `.env` file:

```env
# Enable Google Sheets integration
GOOGLE_SHEETS_ENABLED=true

# Services Management Sheet (NEW)
SERVICES_SHEET_ID=your_services_spreadsheet_id_here

# Orders Booking Sheet (EXISTING)
GOOGLE_SHEET_ID=your_existing_orders_spreadsheet_id_here

# Google Service Account (same for both sheets)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
# OR
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json

# Optional: Google Apps Script URL (fallback for orders)
GOOGLE_APPS_SCRIPT_URL=your_apps_script_url_here
```

## Sheet Structures

### 1. Services Sheet (`SERVICES_SHEET_ID`)

**Sheet Name:** `Services`

| Column | Header               | Example                     | Description                  |
| ------ | -------------------- | --------------------------- | ---------------------------- |
| A      | Category ID          | `wash-fold`                 | Unique category identifier   |
| B      | Category Name        | `Wash & Fold`               | Display name                 |
| C      | Category Icon        | `👕`                        | Emoji icon                   |
| D      | Category Color       | `from-blue-500 to-blue-600` | Tailwind classes             |
| E      | Category Description | `Professional washing...`   | Category description         |
| F      | Service ID           | `wf-regular`                | Unique service identifier    |
| G      | Service Name         | `Laundry and Fold`          | Service display name         |
| H      | Price                | `70`                        | Price in rupees              |
| I      | Unit                 | `per kg`                    | Pricing unit                 |
| J      | Description          | `Regular wash and fold`     | Service description          |
| K      | Popular              | `true`                      | Mark as popular (true/false) |
| L      | Enabled              | `true`                      | Enable/disable (true/false)  |
| M      | Image URL            | `https://...`               | Service image URL            |

### 2. Orders Sheet (`GOOGLE_SHEET_ID`)

**Sheet Name:** `Orders`

| Column | Header               | Example                  | Description              |
| ------ | -------------------- | ------------------------ | ------------------------ |
| A      | Order ID             | `order_123456`           | Unique order identifier  |
| B      | Customer Name        | `John Doe`               | Customer name            |
| C      | Customer Phone       | `+91 9876543210`         | Phone number             |
| D      | Customer Address     | `123 Main St, Delhi`     | Full address             |
| E      | Services             | `Wash & Fold, Dry Clean` | Comma-separated services |
| F      | Total Amount         | `250`                    | Order total in rupees    |
| G      | Pickup Date          | `2024-01-15`             | Scheduled pickup date    |
| H      | Pickup Time          | `10:00 AM`               | Pickup time slot         |
| I      | Status               | `pending`                | Order status             |
| J      | Payment Status       | `pending`                | Payment status           |
| K      | Coordinates          | `28.6139,77.2090`        | Location coordinates     |
| L      | Special Instructions | `Ring doorbell twice`    | Customer instructions    |
| M      | Created At           | `2024-01-15T10:30:00Z`   | Order creation timestamp |
| N      | Updated At           | `2024-01-15T10:30:00Z`   | Last update timestamp    |

## Setup Steps

### Step 1: Create Services Sheet

1. Create a new Google Sheets document for services
2. Name it "CleanCare Services Catalog"
3. Create a sheet named "Services" with the structure above
4. Note the spreadsheet ID from the URL
5. Add it as `SERVICES_SHEET_ID` in your environment variables

### Step 2: Verify Orders Sheet

1. Your existing orders sheet should continue working
2. Verify the `GOOGLE_SHEET_ID` environment variable points to your existing orders sheet
3. Ensure it has an "Orders" sheet with appropriate columns

### Step 3: Share Both Sheets

1. Share both sheets with your service account email
2. Give the service account "Editor" permissions
3. The service account email is found in your service account JSON key

### Step 4: Initialize Default Data

Run these endpoints to set up default data:

```bash
# Initialize services sheet with default services
GET /api/services/setup-sheet

# Add headers to orders sheet (if needed)
GET /api/sheets/health
```

### Step 5: Test the Integration

1. **Test Services**: Visit your app and verify services load
2. **Test Orders**: Place a test order and check both your database and Google Sheets
3. **Modify Services**: Edit a price in the services sheet and refresh the app

## How It Works

### Order Flow

1. **Customer places order** → Saved to MongoDB database
2. **Multi-sheet manager** → Tries to save to dedicated orders sheet
3. **Fallback system** → If multi-sheet fails, uses your existing Google Apps Script
4. **Confirmation** → Customer receives booking confirmation

### Services Flow

1. **Operations team** → Edits services in Google Sheets
2. **App cache** → Refreshes every 5 minutes automatically
3. **Fallback system** → If services sheet unavailable, uses static services
4. **Real-time updates** → Changes appear in the app within 5 minutes

## Managing Your Sheets

### For Services Management

1. **Add New Service**:
   - Add a new row in the Services sheet
   - Fill in all required columns
   - Set `Enabled` to `true`
   - Changes appear within 5 minutes

2. **Update Prices**:
   - Find the service row
   - Update the `Price` column
   - Save the sheet

3. **Disable Service**:
   - Set `Enabled` to `false`
   - Service will be hidden from the app

4. **Add Images**:
   - Upload image to cloud storage
   - Copy public URL to `Image URL` column

### For Orders Management

Your existing order management process continues to work:

1. **View Orders**: Check the Orders sheet for new bookings
2. **Update Status**: Change order status as needed
3. **Track Payments**: Update payment status
4. **Customer Service**: Use order details for support

## API Endpoints

### Services Management

- `GET /api/services/dynamic` - Get all services
- `GET /api/services/refresh` - Force refresh services
- `GET /api/services/setup-sheet` - Initialize services sheet

### Orders Management

- `POST /api/sheets/order` - Add new order (automatically called)
- `GET /api/sheets/health` - Check sheets connectivity

### Health Monitoring

- `GET /api/health` - Overall system health including sheets status

## Troubleshooting

### Services Not Loading

1. **Check Services Sheet**:
   - Verify `SERVICES_SHEET_ID` is correct
   - Ensure sheet is shared with service account
   - Check sheet name is "Services"

2. **Check Permissions**:
   - Service account has Editor access
   - Sheet is not private/restricted

3. **Check Data Format**:
   - Headers match expected structure
   - No missing required columns
   - Boolean values are "true"/"false"

### Orders Not Saving to Sheets

1. **Check Orders Sheet**:
   - Verify `GOOGLE_SHEET_ID` is correct
   - Ensure orders sheet exists and is accessible

2. **Check Fallback**:
   - If multi-sheet fails, Google Apps Script should work
   - Verify `GOOGLE_APPS_SCRIPT_URL` if using fallback

3. **Check Logs**:
   - Backend logs show which method was used
   - Look for error messages in server logs

### Common Error Messages

- **"Services sheet not configured"**: `SERVICES_SHEET_ID` not set
- **"Orders sheet not configured"**: `GOOGLE_SHEET_ID` not set
- **"Failed to read services sheet"**: Permission or sharing issue
- **"Multi-sheet manager failed"**: Using fallback method (this is OK)

## Best Practices

### Sheet Organization

1. **Use Clear Headers**: Follow the exact column structure
2. **Consistent Data**: Use consistent formats for dates, prices, etc.
3. **Regular Backups**: Download sheet backups periodically
4. **Access Control**: Only give access to team members who need it

### Service Management

1. **Test Changes**: Make small changes and verify in app
2. **Price Updates**: Update prices during low-traffic hours
3. **Image URLs**: Use reliable image hosting (CDN recommended)
4. **Popular Services**: Regularly review and update popular flags

### Order Management

1. **Regular Review**: Check orders sheet daily
2. **Status Updates**: Keep order status current
3. **Customer Service**: Use order details for support queries
4. **Data Analysis**: Export data for business insights

## Advanced Features

### Multiple Service Accounts

If you need different permissions for different sheets:

```env
# Separate service accounts (optional)
SERVICES_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
ORDERS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Custom Sheet Names

If your sheets have different names:

```env
# Override default sheet names (optional)
SERVICES_SHEET_NAME=MyServices
ORDERS_SHEET_NAME=MyOrders
```

### Regional Settings

For different date/number formats:

```env
# Locale settings (optional)
GOOGLE_SHEETS_LOCALE=en_IN
GOOGLE_SHEETS_TIMEZONE=Asia/Kolkata
```

## Support & Maintenance

### Regular Tasks

1. **Weekly**: Review new orders and service performance
2. **Monthly**: Update popular services based on data
3. **Quarterly**: Review and optimize service prices
4. **Annually**: Rotate service account keys for security

### Monitoring

1. **App Health**: Check `/api/health` endpoint regularly
2. **Sheet Access**: Verify sheets are accessible
3. **Error Logs**: Monitor backend logs for issues
4. **Performance**: Watch for slow sheet operations

---

This dual-sheet setup gives you the flexibility to manage services and orders separately while maintaining all existing functionality. Your operations team can now efficiently manage the service catalog while order tracking continues seamlessly.
