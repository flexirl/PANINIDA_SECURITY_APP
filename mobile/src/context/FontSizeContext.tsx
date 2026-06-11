import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@app_font_scale';

export interface FontScalePreset {
  label: string;
  value: number;
  description: string;
}

export const FONT_SCALE_PRESETS: FontScalePreset[] = [
  { label: 'Default', value: 1.0, description: 'Standard size' },
  { label: 'Large', value: 1.15, description: 'Comfortable reading' },
  { label: 'Extra Large', value: 1.3, description: 'Easy to read' },
];

interface FontSizeContextType {
  fontScale: number;
  setFontScale: (scale: number) => void;
  scaledSize: (baseSize: number) => number;
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontScale: 1.0,
  setFontScale: () => {},
  scaledSize: (baseSize: number) => baseSize,
});

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 1.0 && parsed <= 1.5) {
            setFontScaleState(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load font scale preference:', err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setFontScale = useCallback(async (scale: number) => {
    setFontScaleState(scale);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, scale.toString());
    } catch (err) {
      console.warn('Failed to persist font scale preference:', err);
    }
  }, []);

  const scaledSize = useCallback(
    (baseSize: number) => Math.round(baseSize * fontScale),
    [fontScale]
  );

  const contextValue = useMemo(
    () => ({ fontScale, setFontScale, scaledSize }),
    [fontScale, setFontScale, scaledSize]
  );

  // Don't render children until preference is loaded to prevent flash
  if (!isLoaded) return null;

  return (
    <FontSizeContext.Provider value={contextValue}>
      {children}
    </FontSizeContext.Provider>
  );
}

/** Hook to access font scale utilities */
export function useFontScale() {
  return useContext(FontSizeContext);
}

/**
 * Hook that takes a static StyleSheet and returns a new object with all
 * fontSize and lineHeight values scaled by the current fontScale.
 * 
 * Usage in any screen:
 *   const s = useScaledStyles(styles);
 *   // then use s.title, s.body, etc. instead of styles.title, styles.body
 */
export function useScaledStyles<T extends Record<string, any>>(baseStyles: T): T {
  const { fontScale } = useContext(FontSizeContext);

  return useMemo(() => {
    // At default scale (1.0), return original styles — zero overhead
    if (fontScale === 1.0) return baseStyles;

    const scaled: any = {};
    for (const key in baseStyles) {
      const style = baseStyles[key];
      if (style && typeof style === 'object') {
        let modified = false;
        const newStyle: any = {};
        for (const prop in style) {
          const val = style[prop];
          if ((prop === 'fontSize' || prop === 'lineHeight') && typeof val === 'number') {
            newStyle[prop] = Math.round(val * fontScale);
            modified = true;
          } else {
            newStyle[prop] = val;
          }
        }
        scaled[key] = modified ? newStyle : style;
      } else {
        scaled[key] = style;
      }
    }
    return scaled as T;
  }, [baseStyles, fontScale]);
}
