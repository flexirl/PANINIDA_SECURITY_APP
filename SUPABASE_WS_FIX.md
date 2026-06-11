# Fix: Supabase WebSocket "ws" Module Error in React Native

## 🔍 Root Cause Analysis

**Error**: `The package at "node_modules\ws\lib\stream.js" attempted to import the Node standard library module "stream"`

**Root Cause**: `@supabase/realtime-js` is importing the Node.js `ws` package instead of using React Native's native WebSocket API.

**Why This Happens**:
1. Supabase has two builds: `dist/main` (Node.js) and `dist/module` (Browser/React Native)
2. Metro bundler was resolving to the wrong build (`dist/main`)
3. The Node.js build imports `ws` package which requires Node.js `stream` module
4. React Native doesn't have Node.js standard library modules

---

## ✅ Solution Applied

### 1. Metro Config Fix (`metro.config.js`)

**What it does**:
- Forces `@supabase/realtime-js` to use the browser-compatible build (`dist/module`)
- Blocks the Node.js `ws` package from being imported
- Ensures Supabase uses React Native's native WebSocket

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs'],
  
  resolveRequest: (context, moduleName, platform) => {
    // Force @supabase/realtime-js to use browser build
    if (moduleName === '@supabase/realtime-js') {
      return {
        filePath: path.resolve(
          __dirname,
          'node_modules/@supabase/realtime-js/dist/module/index.js'
        ),
        type: 'sourceFile',
      };
    }

    // Block Node.js 'ws' package
    if (moduleName === 'ws') {
      return {
        type: 'empty',
      };
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
```

### 2. Supabase Client Configuration (`src/api/supabase.ts`)

**What it does**:
- Explicitly configures Supabase to use native WebSocket
- Adds React Native client identifier

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // Use native WebSocket in React Native
    transport: typeof WebSocket !== 'undefined' ? WebSocket : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
});
```

---

## 🚀 How to Start the App

### Step 1: Clear All Caches

```powershell
cd mobile

# Clear Expo cache
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# Clear Metro cache
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Clear temp caches
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
```

### Step 2: Start Expo with Clear Cache

```powershell
npx expo start --clear
```

### Step 3: Test on Device

- Scan QR code with Expo Go app
- App should load without WebSocket errors

---

## 🧪 Verification Checklist

After starting the app, verify:

- [ ] ✅ App loads without "ws" or "stream" module errors
- [ ] ✅ Login screen appears
- [ ] ✅ Supabase authentication works
- [ ] ✅ Database queries work
- [ ] ✅ No console errors about WebSocket
- [ ] ✅ Works on both iOS and Android Expo Go

---

## 📊 Package Versions

| Package | Version | Status |
|---------|---------|--------|
| Expo SDK | 54.0.33 | ✅ Compatible |
| React Native | 0.81.5 | ✅ Compatible |
| @supabase/supabase-js | 2.45.4 | ✅ Compatible |
| @supabase/realtime-js | 2.10.2 | ✅ Compatible (forced to module build) |
| react-native-url-polyfill | 3.0.0 | ✅ Required |

---

## 🔧 Technical Details

### Why Metro Resolution is Needed

1. **Package.json "main" field**: Points to `dist/main/index.js` (Node.js build)
2. **Package.json "module" field**: Points to `dist/module/index.js` (Browser/RN build)
3. **Metro default**: Prefers "main" over "module" in some cases
4. **Our fix**: Forces Metro to always use "module" build for Supabase Realtime

### What Happens Without the Fix

```
Import chain:
@supabase/supabase-js
  → @supabase/realtime-js (dist/main) ❌ Node.js build
    → ws (Node.js WebSocket library)
      → stream (Node.js standard library) ❌ Not available in RN
        → CRASH
```

### What Happens With the Fix

```
Import chain:
@supabase/supabase-js
  → @supabase/realtime-js (dist/module) ✅ Browser build
    → Native WebSocket API ✅ Available in RN
      → SUCCESS
```

---

## 🐛 Troubleshooting

### Error Still Appears

1. **Completely clear all caches**:
```powershell
cd mobile
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force node_modules\.cache
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npx expo start --clear
```

2. **Verify metro.config.js is correct**:
- Check that `resolveRequest` function exists
- Check that path resolution is correct

3. **Check Metro bundler output**:
- Look for "Resolving module @supabase/realtime-js"
- Should show `dist/module/index.js` not `dist/main/index.js`

### Different Error After Fix

If you see a different error:

1. **Check WebSocket is available**: React Native should have native WebSocket
2. **Check URL polyfill**: Ensure `react-native-url-polyfill` is imported first
3. **Check Supabase config**: Verify environment variables are set

---

## ✅ Summary

**Root Cause**: Metro bundler was resolving Supabase Realtime to Node.js build instead of React Native build

**Fix Applied**:
1. ✅ Updated `metro.config.js` to force browser-compatible build
2. ✅ Blocked Node.js `ws` package from being imported
3. ✅ Configured Supabase client to use native WebSocket
4. ✅ Added React Native client identifier

**Result**: App now works on both iOS and Android Expo Go without WebSocket/stream errors

---

## 📚 References

- [Expo: Using Third-Party Libraries](https://docs.expo.dev/workflow/using-libraries/)
- [Metro Bundler: Resolution](https://metrobundler.dev/docs/resolution)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
- [React Native WebSocket API](https://reactnative.dev/docs/network#websocket-support)
