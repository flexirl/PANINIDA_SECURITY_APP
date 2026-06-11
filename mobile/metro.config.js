const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ============================================================================
// CRITICAL: DOMException polyfill injection
// ============================================================================
// This injects our DOMException polyfill at the very TOP of the JS bundle,
// BEFORE React Native's own initialization (setUpDefaultReactNativeEnvironment).
//
// Why this is needed:
// - RN 0.81.5's setUpDOM.js registers DOMRect, Node, Element, etc. but NOT DOMException
// - During RN init, modules like whatwg-fetch reference DOMException from global scope
// - Hermes throws ReferenceError for undefined globals
// - A polyfill in index.ts runs AFTER RN init, which is too late
//
// serializer.getPolyfills returns file paths that Metro prepends to the bundle.
// These execute before ANY module evaluation, including React Native setup.
// ============================================================================
const originalGetPolyfills = config.serializer?.getPolyfills;

config.serializer = {
  ...config.serializer,
  getPolyfills: (options) => {
    // Get the default polyfills from Expo/React Native
    const defaultPolyfills = originalGetPolyfills ? originalGetPolyfills(options) : [];
    
    // Prepend our DOMException polyfill so it runs FIRST
    return [
      path.resolve(__dirname, 'shims/domexception-polyfill.js'),
      ...defaultPolyfills,
    ];
  },
};

// Configure transformer
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Configure resolver to use React Native compatible builds
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs'],
  
  // Custom resolution to fix Supabase Realtime WebSocket issues
  resolveRequest: (context, moduleName, platform) => {
    // Force @supabase/realtime-js to resolve to browser-compatible build
    if (moduleName === '@supabase/realtime-js') {
      return {
        filePath: path.resolve(
          __dirname,
          'node_modules/@supabase/realtime-js/dist/module/index.js'
        ),
        type: 'sourceFile',
      };
    }

    // Block Node.js 'ws' package - Supabase Realtime should use native WebSocket
    if (moduleName === 'ws') {
      return {
        type: 'empty',
      };
    }

    // Block 'undici' - Node.js HTTP client that references DOMException globally
    // and should never be bundled in React Native
    if (moduleName === 'undici' || moduleName.startsWith('undici/')) {
      return {
        type: 'empty',
      };
    }

    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
