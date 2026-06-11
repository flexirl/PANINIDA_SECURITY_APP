# Verification and Startup Script for Pan India Security Mobile App
# This script verifies the fix and starts the Expo development server

Write-Host "🔍 Pan India Security - App Verification & Startup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify metro.config.js exists and has the fix
Write-Host "Step 1: Verifying metro.config.js..." -ForegroundColor Yellow
if (Test-Path "metro.config.js") {
    $metroContent = Get-Content "metro.config.js" -Raw
    if ($metroContent -match "@supabase/realtime-js" -and $metroContent -match "dist/module") {
        Write-Host "✅ metro.config.js is correctly configured" -ForegroundColor Green
    } else {
        Write-Host "❌ metro.config.js is missing the Supabase fix" -ForegroundColor Red
        Write-Host "Please check SUPABASE_WS_FIX.md for the correct configuration" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ metro.config.js not found" -ForegroundColor Red
    exit 1
}

# Step 2: Verify supabase.ts has the realtime config
Write-Host "Step 2: Verifying supabase.ts configuration..." -ForegroundColor Yellow
if (Test-Path "src\api\supabase.ts") {
    $supabaseContent = Get-Content "src\api\supabase.ts" -Raw
    if ($supabaseContent -match "realtime:" -and $supabaseContent -match "transport") {
        Write-Host "✅ supabase.ts is correctly configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  supabase.ts might be missing realtime configuration" -ForegroundColor Yellow
        Write-Host "The app should still work, but check SUPABASE_WS_FIX.md if issues occur" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ src\api\supabase.ts not found" -ForegroundColor Red
    exit 1
}

# Step 3: Verify required packages are installed
Write-Host "Step 3: Verifying required packages..." -ForegroundColor Yellow
$packages = @(
    "@supabase/supabase-js",
    "react-native-url-polyfill",
    "@react-native-async-storage/async-storage"
)

$allInstalled = $true
foreach ($package in $packages) {
    if (Test-Path "node_modules\$($package.Replace('/', '\'))") {
        Write-Host "  ✅ $package installed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $package NOT installed" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host ""
    Write-Host "Running npm install to install missing packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Clear all caches
Write-Host ""
Write-Host "Step 4: Clearing all caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
Write-Host "✅ All caches cleared" -ForegroundColor Green

# Step 5: Verify environment variables
Write-Host ""
Write-Host "Step 5: Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "EXPO_PUBLIC_SUPABASE_URL" -and $envContent -match "EXPO_PUBLIC_SUPABASE_ANON_KEY") {
        Write-Host "✅ Environment variables configured in .env" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env file exists but might be missing Supabase variables" -ForegroundColor Yellow
        Write-Host "Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "Make sure Supabase environment variables are configured" -ForegroundColor Yellow
}

# Step 6: Display summary
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ Verification Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "� Starting Expo Development Server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Once the server starts:" -ForegroundColor Yellow
Write-Host "  1. Scan the QR code with Expo Go app" -ForegroundColor Yellow
Write-Host "  2. Wait for the app to load" -ForegroundColor Yellow
Write-Host "  3. Check for any errors in the console" -ForegroundColor Yellow
Write-Host ""
Write-Host "Expected behavior:" -ForegroundColor Green
Write-Host "  ✅ No 'ws' or 'stream' module errors" -ForegroundColor Green
Write-Host "  ✅ Login screen appears" -ForegroundColor Green
Write-Host "  ✅ Supabase connection works" -ForegroundColor Green
Write-Host ""
Write-Host "If you see errors, check:" -ForegroundColor Yellow
Write-Host "  📄 SUPABASE_WS_FIX.md - Complete fix documentation" -ForegroundColor Yellow
Write-Host "  📄 START_APP.md - Startup instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 7: Start Expo
npx expo start --clear
