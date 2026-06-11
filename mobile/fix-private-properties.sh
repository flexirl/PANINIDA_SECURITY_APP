#!/bin/bash

# Fix for "SyntaxError: private properties are not supported"
# Run this script to apply all fixes automatically

echo "🔧 Fixing Private Properties Error..."
echo ""

# Step 1: Install missing Babel plugin
echo "📦 Installing @babel/plugin-transform-private-property-in-object..."
npm install --save-dev @babel/plugin-transform-private-property-in-object@^7.29.7

# Step 2: Clean install
echo ""
echo "🧹 Cleaning node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo ""
echo "📦 Reinstalling dependencies..."
npm install

# Step 3: Clear caches
echo ""
echo "🗑️  Clearing Metro bundler cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Step 4: Done
echo ""
echo "✅ Fix applied successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npx expo start --clear"
echo "2. Test on Android and iOS"
echo ""
echo "If the error persists, see PRIVATE_PROPERTIES_FIX.md for troubleshooting."
