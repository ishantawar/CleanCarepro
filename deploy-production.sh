#!/bin/bash

# CleanCare Pro Production Deployment Script
# This script prepares the application for production deployment

set -e  # Exit on any error

echo "🚀 Starting CleanCare Pro Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf backend/node_modules/
rm -rf node_modules/

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install
cd ..

# Check for environment files
print_status "Checking environment configuration..."

if [ ! -f ".env" ]; then
    print_warning "Frontend .env file not found. Creating from template..."
    cat > .env << EOF
# Production Environment Variables
VITE_NODE_ENV=production
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_DVHOSTING_API_KEY=your_dvhosting_api_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing
EOF
    print_warning "Please update the .env file with your actual values!"
fi

if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found. Creating from template..."
    cat > backend/.env << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_here
ALLOWED_ORIGINS=https://your-frontend-url.com
DVHOSTING_API_KEY=your_dvhosting_api_key
GOOGLE_SHEETS_ENABLED=true
EOF
    print_warning "Please update the backend/.env file with your actual values!"
fi

# Validate environment variables
print_status "Validating environment variables..."

# Check required frontend environment variables
if [ -z "${VITE_API_BASE_URL:-}" ]; then
    print_error "VITE_API_BASE_URL is not set in .env"
fi

if [ -z "${VITE_DVHOSTING_API_KEY:-}" ]; then
    print_error "VITE_DVHOSTING_API_KEY is not set in .env"
fi

# Build frontend for production
print_status "Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend build completed successfully!"
else
    print_error "Frontend build failed!"
    exit 1
fi

# Test backend configuration
print_status "Testing backend configuration..."
cd backend
node -e "
try {
  const config = require('./config/production');
  config.validateConfig();
  console.log('✅ Backend configuration is valid');
} catch (error) {
  console.error('❌ Backend configuration error:', error.message);
  process.exit(1);
}
"
cd ..

# Create production build info
print_status "Creating build information..."
cat > dist/build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "1.0.0",
  "environment": "production",
  "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)"
}
EOF

# Create Docker files for containerized deployment
print_status "Creating Docker configuration..."

# Frontend Dockerfile
cat > Dockerfile.frontend << EOF
FROM nginx:alpine

# Copy built frontend files
COPY dist/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF

# Backend Dockerfile
cat > Dockerfile.backend << EOF
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { hostname: 'localhost', port: 3001, path: '/api/health', timeout: 2000 }; \
  const request = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); \
  request.on('error', () => process.exit(1)); \
  request.end();"

# Start the application
CMD ["node", "server-laundry.js"]
EOF

# Nginx configuration for frontend
cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files \$uri \$uri/ /index.html;
        }

        # Cache static assets
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Security
        location ~ /\\.ht {
            deny all;
        }
    }
}
EOF

# Docker Compose for local testing
cat > docker-compose.yml << EOF
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - backend/.env
    depends_on:
      - mongo
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
EOF

# Create deployment summary
print_status "Creating deployment summary..."
cat > DEPLOYMENT.md << EOF
# CleanCare Pro Deployment Guide

## Build Information
- Build Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Version: 1.0.0
- Environment: Production
- Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')

## Required Environment Variables

### Frontend (.env)
\`\`\`
VITE_NODE_ENV=production
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_DVHOSTING_API_KEY=GLX2yKgdb9
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDoR3ACXJ3NuErlXwUBcZyexe7W6_atj1k
VITE_GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/1kQeHBoXgSLI7nDJyCA-rUqmkQhnWjRHSawm6hzTAj1s/edit?usp=sharing
\`\`\`

### Backend (backend/.env)
\`\`\`
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://sunflower110001:fV4LhLpWlKj5Vx87@cluster0.ic8p792.mongodb.net/cleancare_pro?retryWrites=true&w=majority
JWT_SECRET=29eeed77d3fc53d082a67dcda641f0c91854a3ba41f299e64abbc21608e9a852f520bddbf339b7209500a911685cf9d77928cef42ccfcb3d6d9e3be4aa93d2cf
ALLOWED_ORIGINS=https://cleancarepro.onrender.com,http://192.168.56.1:8081
DVHOSTING_API_KEY=GLX2yKgdb9
GOOGLE_SHEETS_ENABLED=true
\`\`\`

## Deployment Options

### Option 1: Render.com (Recommended)
1. Create a new Web Service for the backend
2. Create a new Static Site for the frontend
3. Set environment variables in Render dashboard
4. Deploy using Git integration

### Option 2: Docker Deployment
\`\`\`bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individually
docker build -f Dockerfile.frontend -t cleancare-frontend .
docker build -f Dockerfile.backend -t cleancare-backend .
\`\`\`

### Option 3: Manual Server Deployment
\`\`\`bash
# Frontend (serve with nginx or any static server)
npm run build
# Upload dist/ folder to your web server

# Backend (Node.js server)
cd backend
npm install --production
node server-laundry.js
\`\`\`

## Health Checks
- Backend: https://your-backend-url.com/api/health
- Frontend: Should load the app interface

## Important Notes
1. Update CORS origins in backend/.env to match your frontend URL
2. Configure Google Apps Script for Sheets integration
3. Set up MongoDB database with proper credentials
4. Test SMS functionality with DVHosting API
5. Monitor application logs for any issues

## Troubleshooting
- Check environment variables are set correctly
- Verify MongoDB connection string
- Ensure CORS origins include your frontend domain
- Test API endpoints individually
EOF

print_success "Production deployment preparation completed!"
print_status "Next steps:"
echo "  1. Review and update environment variables in .env files"
echo "  2. Deploy backend to your hosting service (Render, Heroku, etc.)"
echo "  3. Deploy frontend to your hosting service or CDN"
echo "  4. Update CORS origins to match your production URLs"
echo "  5. Test the application thoroughly"
echo ""
print_status "Files created:"
echo "  - dist/ (production build)"
echo "  - Dockerfile.frontend"
echo "  - Dockerfile.backend"
echo "  - docker-compose.yml"
echo "  - nginx.conf"
echo "  - DEPLOYMENT.md"
echo ""
print_success "Deployment ready! 🎉"
