// ============================================================
// CachedImage — Drop-in Image replacement with URL resolution
// ============================================================
// Automatically resolves signed URLs, shows loading shimmer,
// handles errors with fallback icon and retry button.
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  ImageStyle,
  ViewStyle,
  ImageResizeMode,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useImageUrl } from '../utils/imageUtils';
import { Colors } from '../constants/theme';

interface CachedImageProps {
  /** The raw image URL (can be signed URL, storage:// path, or public URL) */
  uri: string | null | undefined;
  /** Image styles */
  style?: ImageStyle | ImageStyle[];
  /** Container styles (wraps the image) */
  containerStyle?: ViewStyle | ViewStyle[];
  /** Resize mode (default: 'cover') */
  resizeMode?: ImageResizeMode;
  /** Fallback icon name (MaterialIcons) when no image or error */
  fallbackIcon?: string;
  /** Fallback icon size */
  fallbackIconSize?: number;
  /** Fallback icon color */
  fallbackIconColor?: string;
  /** Show retry button on error */
  showRetry?: boolean;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

export default function CachedImage({
  uri,
  style,
  containerStyle,
  resizeMode = 'cover',
  fallbackIcon = 'image',
  fallbackIconSize = 32,
  fallbackIconColor = Colors.outline,
  showRetry = true,
  onLoad,
  onError,
}: CachedImageProps) {
  const { url, loading: resolving, error: resolveError, retry } = useImageUrl(uri);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
    onError?.();
  }, [onError]);

  const handleRetry = useCallback(() => {
    setImageError(false);
    setImageLoading(true);
    retry();
  }, [retry]);

  const showLoading = resolving || (imageLoading && url && !imageError);
  const showError = resolveError || (imageError && !resolving);
  const showImage = url && !resolveError && !imageError;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Image */}
      {showImage && (
        <Image
          source={{ uri: url }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Loading overlay */}
      {showLoading && (
        <View style={[styles.overlay, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      {/* Error state */}
      {showError && (
        <View style={[styles.overlay, styles.errorOverlay]}>
          <MaterialIcons
            name={fallbackIcon as any}
            size={fallbackIconSize}
            color={fallbackIconColor}
          />
          {showRetry && (
            <TouchableOpacity
              onPress={handleRetry}
              style={styles.retryButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="refresh" size={14} color={Colors.primary} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* No image provided */}
      {!uri && !resolving && (
        <View style={[styles.overlay, styles.emptyOverlay]}>
          <MaterialIcons
            name={fallbackIcon as any}
            size={fallbackIconSize}
            color={fallbackIconColor}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Lightweight version for inline use (e.g., avatars in lists)
 * — no retry button, smaller fallback icon
 */
export function CachedAvatar({
  uri,
  size = 48,
  style,
  fallbackText,
}: {
  uri: string | null | undefined;
  size?: number;
  style?: ViewStyle | ViewStyle[];
  fallbackText?: string;
}) {
  const { url, loading } = useImageUrl(uri);
  const [imageError, setImageError] = useState(false);

  const avatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
  };

  if (loading) {
    return (
      <View style={[avatarStyle, styles.avatarFallback, style]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!url || imageError) {
    return (
      <View style={[avatarStyle, styles.avatarFallback, style]}>
        {fallbackText ? (
          <Text style={[styles.avatarFallbackText, { fontSize: size * 0.35 }]}>
            {fallbackText}
          </Text>
        ) : (
          <MaterialIcons name="person" size={size * 0.5} color={Colors.outline} />
        )}
      </View>
    );
  }

  return (
    <View style={[avatarStyle, style]}>
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size }}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  errorOverlay: {
    backgroundColor: Colors.surfaceContainerLow,
    gap: 8,
  },
  emptyOverlay: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  avatarFallback: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
});
