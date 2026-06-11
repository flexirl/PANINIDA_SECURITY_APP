/**
 * Pan India Security — Design System Tokens
 * Extracted from the Stitch design specifications
 */

export const Colors = {
  // Primary
  primary: '#002752',
  primaryContainer: '#1a3d6d',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#8aa9df',
  onPrimaryFixed: '#001b3d',
  primaryFixedDim: '#a9c7ff',
  primaryFixed: '#d6e3ff',
  onPrimaryFixedVariant: '#264777',
  surfaceTint: '#3f5f91',
  inversePrimary: '#a9c7ff',

  // Secondary
  secondary: '#b02d21',
  secondaryContainer: '#fc6451',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#650001',
  onSecondaryFixed: '#410000',
  secondaryFixedDim: '#ffb4a9',
  secondaryFixed: '#ffdad5',
  onSecondaryFixedVariant: '#8e130c',

  // Tertiary
  tertiary: '#3f1f00',
  tertiaryContainer: '#5e3200',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#db9a60',
  tertiaryFixed: '#ffdcc1',
  tertiaryFixedDim: '#fdb87c',
  onTertiaryFixed: '#2e1500',
  onTertiaryFixedVariant: '#6a3b08',

  // Surface
  surface: '#faf9fd',
  surfaceBright: '#faf9fd',
  surfaceDim: '#dad9de',
  surfaceContainer: '#eeedf2',
  surfaceContainerHigh: '#e8e7ec',
  surfaceContainerHighest: '#e3e2e7',
  surfaceContainerLow: '#f4f3f8',
  surfaceContainerLowest: '#ffffff',
  surfaceVariant: '#e3e2e7',
  onSurface: '#1a1c1f',
  onSurfaceVariant: '#43474f',
  inverseSurface: '#2f3034',
  inverseOnSurface: '#f1f0f5',

  // Background
  background: '#faf9fd',
  onBackground: '#1a1c1f',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Outline
  outline: '#747780',
  outlineVariant: '#c3c6d0',

  // Status colors (from design brief)
  successGreen: '#27AE60',
  dangerRed: '#E74C3C',
  warningAmber: '#F39C12',
  infoBlue: '#2980B9',
};

export const Spacing = {
  stackSm: 8,
  stackMd: 16,
  stackLg: 24,
  screenPadding: 16,
  gutter: 12,
  buttonHeight: 48,
};

export const BorderRadius = {
  default: 4,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const Typography = {
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  h2: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  bodyBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },
  button: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
};
