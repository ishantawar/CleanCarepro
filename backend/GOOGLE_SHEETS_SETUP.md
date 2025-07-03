# Google Sheets Integration Setup Guide

This guide will help you set up automatic synchronization between your MongoDB database and Google Sheets.

## Prerequisites

1. **MongoDB Replica Set**: Change streams require a replica set (MongoDB Atlas provides this by default)
2. **Google Cloud Project**: You'll need a Google Cloud project with Sheets API enabled

## Step-by-Step Setup

### 1. Create Google Cloud Project & Enable API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### 3. Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the JSON file

### 4. Create Google Sheet

1. Create a new Google Sheet
2. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```
3. Share the sheet with your service account email:
   - Click "Share"
   - Add the service account email (from the JSON file)
   - Give "Editor" permissions

### 5. Configure Environment Variables

Update your `backend/.env` file:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=your-actual-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...your-full-json-here...}
```

**Important**: Replace the placeholder values with your actual credentials!

### 6. Run Setup Script

```bash
cd backend
npm run setup:sheets
```

This will:

- Test the connection to Google Sheets
- Add column headers to your sheet
- Verify the integration is working

## Features

### Automatic Sync

Once configured, the system will automatically:

- **Insert**: Add new rows when bookings are created
- **Update**: Modify existing rows when bookings are updated
- **Delete**: Remove rows when bookings are deleted

### Data Columns

The following data is synced to Google Sheets:

| Column               | Description                 |
| -------------------- | --------------------------- |
| Booking ID           | Unique booking identifier   |
| Customer ID          | Customer reference          |
| Service              | Primary service type        |
| Service Type         | Service category            |
| Services List        | All selected services       |
| Scheduled Date       | Pickup/service date         |
| Scheduled Time       | Pickup/service time         |
| Provider Name        | Service provider            |
| Address              | Service location            |
| Coordinates          | GPS coordinates             |
| Total Price          | Original price              |
| Discount Amount      | Applied discounts           |
| Final Amount         | Final price after discounts |
| Payment Status       | Payment state               |
| Status               | Booking status              |
| Special Instructions | Customer notes              |
| Created At           | Booking creation time       |
| Updated At           | Last update time            |

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure the sheet is shared with the service account email
   - Check that the service account has "Editor" permissions

2. **"Sheet not found" errors**
   - Verify the GOOGLE_SHEET_ID is correct
   - Make sure the sheet exists and is accessible

3. **"API not enabled" errors**
   - Enable Google Sheets API in your Google Cloud project
   - Wait a few minutes for the API to be fully activated

4. **Change streams not working**
   - Ensure you're using MongoDB Atlas or a replica set
   - Check MongoDB connection logs

### Testing the Integration

1. **Manual Test**:

   ```bash
   cd backend
   npm run setup:sheets
   ```

2. **Live Test**:
   - Start the backend server
   - Create a new booking through the app
   - Check if it appears in Google Sheets

### Logs

Monitor the logs for integration status:

- `✅ Google Sheets integration initialized successfully`
- `📊 New booking added to Google Sheets: [booking-id]`
- `👂 Listening to MongoDB changes for Google Sheets sync...`

## Security Notes

- Keep your service account credentials secure
- Don't commit the actual JSON key to version control
- Consider using environment-specific service accounts
- Regularly rotate service account keys

## Performance Considerations

- The integration uses MongoDB change streams for real-time updates
- Each operation makes an API call to Google Sheets
- Google Sheets API has rate limits (100 requests per 100 seconds per user)
- For high-volume applications, consider batching operations

## Support

If you encounter issues:

1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Test the Google Sheets API connection manually
4. Ensure MongoDB change streams are working

For Google Sheets API documentation: https://developers.google.com/sheets/api
