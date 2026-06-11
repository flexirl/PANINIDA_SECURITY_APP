/**
 * React Native Polyfills
 * 
 * NOTE: The critical DOMException polyfill is now injected at the Metro bundler
 * level via serializer.getPolyfills in metro.config.js. This runs BEFORE React
 * Native initialization, which is the only way to fix the "[runtime not ready]:
 * ReferenceError: Property 'DOMException' doesn't exist" error.
 * 
 * This file serves as a secondary safety net and handles other polyfills.
 * Import this file at the very top of your app entry point (index.ts).
 */

// URL polyfill (required for Supabase)
import 'react-native-url-polyfill/auto';

// DOMException safety net - the primary polyfill is in shims/domexception-polyfill.js
// which runs at the Metro bundle level. This import is kept as a fallback.
import './domException';

// Export empty object to make this a module
export {};
