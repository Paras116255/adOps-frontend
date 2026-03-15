#!/bin/bash

# AdOps Dashboard Frontend - Quick Deployment Script
# This script builds the frontend and optionally deploys to a server

set -e  # Exit on any error

echo "🚀 AdOps Dashboard Frontend Deployment"
echo "======================================="
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your backend API URL:"
    echo ""
    echo "VITE_API_BASE_URL=https://api.yourdomain.com"
    echo ""
    exit 1
fi

# Display current API URL
API_URL=$(grep VITE_API_BASE_URL .env.production | cut -d '=' -f2)
echo "📡 Backend API URL: $API_URL"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build the application
echo "🏗️  Building production bundle..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Calculate bundle size
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "📊 Bundle size: $BUNDLE_SIZE"
echo ""

# Prompt for deployment method
echo "Choose deployment method:"
echo "  1) Local preview (test build locally)"
echo "  2) Deploy to server via SCP"
echo "  3) Build only (manual deployment)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🌐 Starting local preview..."
        echo "Preview will be available at: http://localhost:4173"
        echo "Press Ctrl+C to stop"
        echo ""
        npm run preview
        ;;
    2)
        echo ""
        read -p "Enter server address (user@host): " server
        read -p "Enter deployment path on server: " deploy_path

        echo ""
        echo "📤 Uploading files to $server:$deploy_path..."

        # Create directory if it doesn't exist
        ssh "$server" "mkdir -p $deploy_path"

        # Upload files
        rsync -avz --delete dist/ "$server:$deploy_path/"

        echo ""
        echo "✅ Deployment complete!"
        echo ""
        echo "Next steps:"
        echo "1. Configure Nginx on your server (see FRONTEND_DEPLOYMENT.md)"
        echo "2. Set up SSL certificate"
        echo "3. Update CORS settings in backend"
        ;;
    3)
        echo ""
        echo "✅ Build complete!"
        echo ""
        echo "Files are in: ./dist/"
        echo ""
        echo "To deploy manually:"
        echo "  • Upload dist/ folder to your web server"
        echo "  • Configure server for SPA routing"
        echo "  • Set up SSL certificate"
        echo ""
        echo "See FRONTEND_DEPLOYMENT.md for detailed instructions"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🎉 Done!"
