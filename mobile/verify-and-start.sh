#!/bin/bash

# Verification and Startup Script for React Native App
# This script verifies all fixes are in place and starts the app

echo "========================================"
echo "React Native App - Verification & Start"
echo "========================================"
echo ""

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the mobile directory"
    exit 1
fi

echo "✅ Step 1: Checking package.json..."

# Check Supabase version
SUPABASE_VERSION=$(grep -o '"@supabase/supabase-js": "[^"]*"' package.json | cut -d'"' -f4)

if [ "$SUPABASE_VERSION" = "2.45.4" ]; then
    echo "   ✅ Supabase version: $SUPABASE_VERSION (Correct)"
else
    echo "   ❌ Supabase version: $SUPABASE_VERSION (Should be 2.45.4)"
    echo "   Run: npm install @supabase/supabase-js@2.45.4"
    exit 1
fi

echo ""
echo "✅ Step 2: Checking .npmrc..."

if [ -f ".npmrc" ]; then
    if grep -q "legacy-peer-deps" ".npmrc"; then
        echo "   ✅ .npmrc exists with legacy-peer-deps"
    else
        echo "   ⚠️  .npmrc exists but missing legacy-peer-deps"
    fi
else
    echo "   ❌ .npmrc not found"
    echo "   Creating .npmrc..."
    echo "legacy-peer-deps=true" > .npmrc
    echo "   ✅ .npmrc created"
fi

echo ""
echo "✅ Step 3: Checking metro.config.js..."

if [ -f "metro.config.js" ]; then
    if grep -q "moduleName === 'ws'" "metro.config.js"; then
        echo "   ✅ metro.config.js has ws blocking"
    else
        echo "   ❌ metro.config.js missing ws blocking"
        exit 1
    fi
else
    echo "   ❌ metro.config.js not found"
    exit 1
fi

echo ""
echo "✅ Step 4: Checking node_modules..."

if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
    
    # Check installed Supabase version
    if [ -f "node_modules/@supabase/supabase-js/package.json" ]; then
        INSTALLED_VERSION=$(grep -o '"version": "[^"]*"' node_modules/@supabase/supabase-js/package.json | head -1 | cut -d'"' -f4)
        
        if [ "$INSTALLED_VERSION" = "2.45.4" ]; then
            echo "   ✅ Installed Supabase: $INSTALLED_VERSION (Correct)"
        else
            echo "   ❌ Installed Supabase: $INSTALLED_VERSION (Should be 2.45.4)"
            echo "   Run: rm -rf node_modules && npm install"
            exit 1
        fi
    fi
else
    echo "   ❌ node_modules not found"
    echo "   Run: npm install"
    exit 1
fi

echo ""
echo "✅ Step 5: Checking babel.config.js..."

if [ -f "babel.config.js" ]; then
    if grep -q "@babel/plugin-transform-private-property-in-object" "babel.config.js"; then
        echo "   ✅ babel.config.js has private property support"
    else
        echo "   ⚠️  babel.config.js missing private property plugin"
    fi
else
    echo "   ❌ babel.config.js not found"
fi

echo ""
echo "========================================"
echo "✅ All Verifications Passed!"
echo "========================================"
echo ""

echo "🚀 Starting Expo..."
echo ""
echo "After Expo starts, you can:"
echo "  - Press 'a' for Android emulator"
echo "  - Press 'i' for iOS simulator"
echo "  - Scan QR code with Expo Go app"
echo ""

# Clear caches and start
echo "Clearing caches..."
rm -rf .expo 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null

echo "Starting Expo with --clear flag..."
echo ""

# Start Expo
npx expo start --clear
