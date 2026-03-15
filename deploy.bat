@echo off
REM AdOps Dashboard Frontend - Quick Deployment Script (Windows)

echo.
echo ========================================
echo   AdOps Dashboard Frontend Deployment
echo ========================================
echo.

REM Check if .env.production exists
if not exist ".env.production" (
    echo [ERROR] .env.production file not found!
    echo.
    echo Please create .env.production with your backend API URL:
    echo.
    echo VITE_API_BASE_URL=https://api.yourdomain.com
    echo.
    pause
    exit /b 1
)

REM Display current API URL
for /f "tokens=2 delims==" %%a in ('findstr VITE_API_BASE_URL .env.production') do set API_URL=%%a
echo Backend API URL: %API_URL%
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

REM Build the application
echo [INFO] Building production bundle...
call npm run build

REM Check if build was successful
if not exist "dist" (
    echo [ERROR] Build failed - dist directory not found
    pause
    exit /b 1
)

echo [SUCCESS] Build successful!
echo.

REM Show menu
echo Choose deployment method:
echo   1. Local preview (test build locally)
echo   2. Build only (manual deployment)
echo   3. Deploy to Vercel
echo.
set /p choice="Enter choice [1-3]: "

if "%choice%"=="1" (
    echo.
    echo [INFO] Starting local preview...
    echo Preview will be available at: http://localhost:4173
    echo Press Ctrl+C to stop
    echo.
    call npm run preview
) else if "%choice%"=="2" (
    echo.
    echo [SUCCESS] Build complete!
    echo.
    echo Files are in: .\dist\
    echo.
    echo To deploy manually:
    echo   - Upload dist\ folder to your web server
    echo   - Configure server for SPA routing
    echo   - Set up SSL certificate
    echo.
    echo See FRONTEND_DEPLOYMENT.md for detailed instructions
    echo.
    pause
) else if "%choice%"=="3" (
    echo.
    echo [INFO] Deploying to Vercel...
    echo.
    echo Make sure you have Vercel CLI installed:
    echo   npm install -g vercel
    echo.
    call vercel --prod
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Done!
echo.
pause
