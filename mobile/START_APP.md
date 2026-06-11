# 🚀 Quick Start Guide - Pan India Security Mobile App

## ✅ Prerequisites

- Node.js and npm installed
- Expo Go app installed on your phone (iOS or Android)
- Supabase project configured with environment variables

---

## 🎯 Quick Start (Recommended)

### Option 1: Use the Verification Script (Windows PowerShell)

```powershell
cd mobile
.\verify-and-start.ps1
```

This script will:
- ✅ Verify all configurations are correct
- ✅ Check required packages are installed
- ✅ Clear all caches
- ✅ Start the Expo development server

### Option 2: Manual Start

```powershell
cd mobile
npx expo start --clear
```

---

## 📱 Testing on Your Device

1. **Start the development server** (using one of the options above)
2. **Open Expo Go** app on your phone
3. **Scan the QR code** displayed in the terminal
4. **Wait for the app to load** (first load may take 1-2 minutes)

---

## ✅ Expected Behavior

When the app loads successfully, you should see:

- ✅ **No errors** about "ws" or "stream" modules
- ✅ **Login screen** appears with phone number input
- ✅ **No WebSocket errors** in the console
- ✅ **Supabase connection** works (you can test by trying to login)

---

## ❌ Troubleshooting

### Error: "ws" or "stream" module not found

**Solution**: The fix should already be applied. If you still see this error:

1. Clear all caches:
```powershell
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force node_modules\.cache
```

2. Restart with clear flag:
```powershell
npx expo start --clear
```

3. If still not working, check `SUPABASE_WS_FIX.md` for detailed troubleshooting

### Error: "Cannot find module '@supabase/supabase-js'"

**Solution**: Install dependencies:
```powershell
npm install
```

### Error: "EXPO_PUBLIC_SUPABASE_URL is not defined"

**Solution**: Create or update `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### App loads but crashes immediately

**Solution**: Check the error message in the Expo Go app or terminal. Common issues:

1. **Supabase credentials**: Verify `.env` file has correct values
2. **Network connection**: Ensure your phone and computer are on the same network
3. **Firewall**: Check if firewall is blocking the connection

---

## 📚 Documentation

- **SUPABASE_WS_FIX.md** - Complete fix documentation for WebSocket issues
- **PRIVATE_PROPERTIES_FIX.md** - Fix for private properties syntax errors
- **package.json** - All dependencies and versions

---

## 🔧 Development Commands

```powershell
# Start development server
npm start

# Start with cache cleared
npx expo start --clear

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage
```

---

## 📊 Current Configuration

| Component | Status |
|-----------|--------|
| Metro Config | ✅ Configured for Supabase |
| Supabase Client | ✅ Configured for React Native |
| WebSocket | ✅ Using native WebSocket API |
| URL Polyfill | ✅ Installed and imported |
| AsyncStorage | ✅ Configured for auth persistence |

---

## 🎉 Success Indicators

Your app is working correctly if:

1. ✅ App loads without errors
2. ✅ Login screen is visible and functional
3. ✅ No console errors about missing modules
4. ✅ Supabase authentication works
5. ✅ Database queries work
6. ✅ Navigation between screens works

---

## 💡 Tips

- **First load is slow**: The first time you load the app, it may take 1-2 minutes to bundle
- **Subsequent loads are fast**: After the first load, hot reloading is instant
- **Shake device**: Shake your device to open the Expo developer menu
- **Reload**: Press 'r' in the terminal to reload the app
- **Clear cache**: Press 'Shift + r' to clear cache and reload

---

## 🆘 Need Help?

If you're still experiencing issues:

1. Check `SUPABASE_WS_FIX.md` for detailed troubleshooting
2. Verify all environment variables are set correctly
3. Ensure you're using the correct Expo SDK version (54.0.33)
4. Check that your phone and computer are on the same network

---

## 🚀 Ready to Go!

Run the verification script to start:

```powershell
.\verify-and-start.ps1
```

Or start manually:

```powershell
npx expo start --clear
```

Happy coding! 🎉
