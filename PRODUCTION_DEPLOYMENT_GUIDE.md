# CleanCare Pro - Production Deployment Guide

## 🚀 Overview

CleanCare Pro has been converted to a production-ready application with the following features:

- ✅ Removed all demo functionality
- ✅ Implemented MongoDB user and order management
- ✅ Added saved addresses functionality
- ✅ Google Sheets integration for order tracking
- ✅ Enhanced mobile responsiveness
- ✅ Production-level security and error handling
- ✅ Environment-based configuration

## 📋 Required Environment Variables

### Frontend Environment Variables (.env)

```env
# Production Environment Variables
VITE_NODE_ENV=production

# API Configuration
VITE_API_BASE_URL=https://cleancarepro-95it.onrender.com/api

# DVHosting SMS API
VITE_DVHOSTING_API_KEY=GLX2yKgdb9

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDoR3ACXJ3NuErlXwUBcZyexe7W6_atj1k

# Google Sheets Configuration
VITE_GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing
```

### Backend Environment Variables (backend/.env)

```env
# Production Environment Variables
NODE_ENV=production
PORT=3001

# Database Configuration
MONGODB_URI=mongodb+srv://sunflower110001:fV4LhLpWlKj5Vx87@cluster0.ic8p792.mongodb.net/cleancare_pro?retryWrites=true&w=majority
MONGODB_USERNAME=sunflower110001
MONGODB_PASSWORD=fV4LhLpWlKj5Vx87
MONGODB_CLUSTER=cluster0.ic8p792.mongodb.net

# JWT Configuration
JWT_SECRET=29eeed77d3fc53d082a67dcda641f0c91854a3ba41f299e64abbc21608e9a852f520bddbf339b7209500a911685cf9d77928cef42ccfcb3d6d9e3be4aa93d2cf

# CORS Configuration
ALLOWED_ORIGINS=https://cleancarepro-1-p2oc.onrender.com,http://192.168.56.1:8081

# DVHosting SMS API
DVHOSTING_API_KEY=GLX2yKgdb9

# Google Sheets Configuration
GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing
GOOGLE_SHEETS_ENABLED=true
```

## 🏗️ Architecture Changes

### Backend Changes Made:

1. **MongoDB Models**:
   - Enhanced `User` model with proper validation
   - Enhanced `Booking` model with comprehensive fields
   - New `Address` model for saved addresses

2. **API Routes**:
   - `/api/addresses` - Complete CRUD for user addresses
   - `/api/sheets/order` - Google Sheets integration endpoint
   - Enhanced booking routes with Google Sheets integration
   - Production security middleware

3. **Security Features**:
   - Helmet for security headers
   - Rate limiting for API protection
   - Compression for better performance
   - CORS configuration for production
   - Input validation and sanitization

4. **Error Handling**:
   - Global error handling middleware
   - Graceful shutdown handling
   - Health check endpoint with monitoring
   - Production logging with Morgan

### Frontend Changes Made:

1. **Removed Demo Code**:
   - Deleted `src/integrations/demo/`
   - Deleted `src/integrations/supabase/`
   - Deleted `src/integrations/adaptive/`

2. **Production Integration**:
   - New `src/integrations/production/client.ts` with real API calls
   - Updated MongoDB client to use production implementation
   - Environment-based configuration

3. **Mobile Enhancements**:
   - Enhanced mobile-first responsive design
   - Touch-friendly button sizing
   - Safe area handling for notched devices
   - Improved form inputs for mobile
   - Dark mode and accessibility support

4. **Google Sheets Integration**:
   - Automatic order submission to Google Sheets
   - Fallback to localStorage when offline
   - Production-ready configuration

## 📊 Google Sheets Setup

### Google Apps Script Setup:

1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Replace the default code with this:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      data.sheetName || "Orders",
    );

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: "Sheet not found" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Add data to the sheet
    sheet.appendRow([
      data.data.orderId,
      data.data.timestamp,
      data.data.customerName,
      data.data.customerPhone,
      data.data.customerAddress,
      data.data.services,
      data.data.totalAmount,
      data.data.pickupDate,
      data.data.pickupTime,
      data.data.status,
      data.data.paymentStatus,
      data.data.coordinates,
      data.data.city,
      data.data.pincode,
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "Google Sheets Order Webhook is running!",
  ).setMimeType(ContentService.MimeType.TEXT);
}
```

4. Deploy as a web app:
   - Click "Deploy" > "New deployment"
   - Choose "Web app" as type
   - Set execute as "Me"
   - Set access to "Anyone"
   - Copy the web app URL

5. Update the web app URL in your backend environment variables

### Google Sheet Setup:

1. Open your Google Sheet: [CleanCare Pro Orders](https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing)
2. Create a sheet named "Orders"
3. Add these headers in the first row:
   ```
   Order ID | Timestamp | Customer Name | Customer Phone | Customer Address | Services | Total Amount | Pickup Date | Pickup Time | Status | Payment Status | Coordinates | City | Pincode
   ```

## 🚀 Deployment Instructions

### Option 1: Render.com (Recommended)

#### Backend Deployment:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set these build settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server-laundry.js`
4. Add all backend environment variables from above
5. Deploy

#### Frontend Deployment:

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Set these build settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add all frontend environment variables from above
5. Deploy

### Option 2: Manual Server Deployment

#### Preparing for Deployment:

```bash
# Frontend
npm install
npm run build
# Upload dist/ folder to your web server

# Backend
cd backend
npm install --production
# Upload backend files to your server
# Set environment variables
# Start with: node server-laundry.js
```

## 🔧 Database Setup

### MongoDB Collections:

The application will automatically create these collections:

- `users` - User accounts and profiles
- `addresses` - Saved user addresses
- `bookings` - Service bookings and orders
- `riders` - Delivery riders (if applicable)

### Database Indexes:

All necessary indexes are automatically created by the Mongoose schemas.

## ��� Mobile Features

### Enhanced Mobile Experience:

- Touch-friendly buttons (minimum 44px)
- Optimized form inputs (prevents zoom on iOS)
- Safe area handling for notched devices
- Responsive grid layouts for different screen sizes
- Dark mode support
- Reduced motion support for accessibility
- High contrast mode support

### PWA Features:

- Service worker for offline functionality
- Web app manifest for installation
- Push notification support (backend ready)

## 🔍 Testing & Monitoring

### Health Checks:

- Backend: `https://your-backend-url.com/api/health`
- Frontend: Should load the application

### API Endpoints:

- `GET /api/health` - Server health status
- `POST /api/auth/send-otp` - Send OTP for login
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/addresses` - Get user addresses
- `POST /api/addresses` - Create new address
- `POST /api/sheets/order` - Send order to Google Sheets

### Testing Checklist:

- [ ] User registration and login
- [ ] Address management (create, update, delete, set default)
- [ ] Booking creation and management
- [ ] Google Sheets integration
- [ ] Mobile responsiveness
- [ ] SMS OTP functionality
- [ ] API rate limiting
- [ ] Error handling

## 🔐 Security Features

### Implemented Security:

- Helmet.js for security headers
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- JWT token authentication
- Password hashing with bcrypt
- Environment variable protection

### Production Security Checklist:

- [ ] Update JWT secret to a strong random value
- [ ] Configure CORS origins correctly
- [ ] Set up HTTPS/SSL certificates
- [ ] Monitor for security vulnerabilities
- [ ] Set up logging and monitoring
- [ ] Regular security updates

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**: Update `ALLOWED_ORIGINS` in backend/.env
2. **MongoDB Connection**: Verify `MONGODB_URI` format and credentials
3. **SMS Not Working**: Check `DVHOSTING_API_KEY` and API limits
4. **Google Sheets Not Working**: Verify Apps Script deployment and permissions

### Monitoring:

- Check application logs regularly
- Monitor API response times
- Track error rates and patterns
- Monitor database performance

## 📞 Support

### Application Features:

- User authentication with SMS OTP
- Address management with geolocation
- Service booking with real-time tracking
- Google Sheets integration for order management
- Mobile-optimized interface
- Production-ready architecture

### Next Steps After Deployment:

1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure backup strategies
4. Plan for scaling as user base grows
5. Consider adding analytics and user feedback

---

**Production Ready!** 🎉

The application is now ready for production deployment with real user management, order tracking, and mobile-optimized experience.
