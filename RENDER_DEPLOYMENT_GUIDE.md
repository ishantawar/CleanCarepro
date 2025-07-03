# Render Deployment Guide

## ✅ Fixed Deployment Configuration

### Problem Solved

- **Issue**: Running two separate servers (frontend + backend) but Render only allows one port-bound process
- **Solution**: Backend now serves both API endpoints and static frontend files

### How It Works

1. **Build Phase** (`render:build`):

   ```bash
   npm install && npm run build && cd backend && npm install --production
   ```

   - Installs all dependencies
   - Builds frontend with Vite (creates `dist/` folder)
   - Installs production backend dependencies

2. **Start Phase** (`render:start`):
   ```bash
   NODE_ENV=production node backend/server-laundry.js
   ```

   - Starts single Express server
   - Serves static files from `dist/` folder
   - Handles API routes under `/api/*`
   - Handles frontend routing with catch-all route

### Backend Server Configuration

The `backend/server-laundry.js` now includes:

```javascript
// Serve static frontend files in production
if (productionConfig.isProduction()) {
  const frontendPath = path.join(__dirname, "../dist");
  app.use(express.static(frontendPath));
}

// API routes at /api/*
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
// ... other API routes

// Catch-all for frontend routing
if (productionConfig.isProduction()) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}
```

### Port Configuration

- Server listens on `process.env.PORT` (provided by Render)
- Falls back to `3001` for local development
- Single port serves both frontend and backend

### File Structure

```
project/
├── dist/                     # Built frontend (created by Vite)
├── backend/
│   ├── server-laundry.js     # Main server (serves frontend + API)
│   ├── config/
│   ├── routes/
│   └── ...
├── src/                      # Frontend source
└── package.json
```

### Environment Variables for Render

Set these in your Render dashboard:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
DVHOSTING_API_KEY=your_sms_api_key
GOOGLE_SHEETS_ENABLED=true
ALLOWED_ORIGINS=https://your-app.onrender.com
```

### Deployment Commands for Render

**Build Command:**

```bash
npm run render:build
```

**Start Command:**

```bash
npm run render:start
```

### Testing Locally

Test the production setup locally:

```bash
# Build and start production server
npm run start:prod

# Server will be available at http://localhost:3001
# Frontend: http://localhost:3001
# API: http://localhost:3001/api/*
```

### Benefits of This Setup

1. ✅ **Single Port**: Only one server process (required by Render)
2. ✅ **Simplified Deployment**: No need for multiple services
3. ✅ **Better Performance**: Reduced latency between frontend and backend
4. ✅ **Cost Effective**: Uses one dyno instead of two
5. ✅ **Easier Debugging**: Single logs stream
6. ✅ **Frontend Routing**: Proper SPA routing support

### Troubleshooting

If deployment fails:

1. **Check build logs** for frontend build errors
2. **Verify environment variables** are set correctly
3. **Check backend dependencies** are installed
4. **Ensure `dist/` folder** is created properly
5. **Check server startup logs** for configuration errors

### Development vs Production

- **Development**: Frontend (Vite) and backend run separately
- **Production**: Single backend server serves both frontend and API
