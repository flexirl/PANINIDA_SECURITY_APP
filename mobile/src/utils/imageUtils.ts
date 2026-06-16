// ============================================================
// Image URL Resolution Utility
// ============================================================
// Handles signed URL refresh for private storage buckets,
// backward-compatible URL detection, and in-memory caching.
//
// Signed URLs expire after 1 hour. This utility:
// 1. Detects whether a URL is a signed URL, public URL, or storage path
// 2. Refreshes expired signed URLs via the get-signed-url edge function
// 3. Caches resolved URLs in memory to avoid redundant network calls
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabase';

// ─── URL Format Detection ───

/**
 * Storage path format: storage://{bucket}/{filePath}
 * This is the new format we store for private buckets.
 */
const STORAGE_PREFIX = 'storage://';

/**
 * Supabase signed URL contains a `token=` query parameter.
 * Public URLs don't have this parameter.
 */
function isSignedUrl(url: string): boolean {
  return url.includes('token=') && url.includes('/storage/');
}

/**
 * Checks if a URL uses the new storage:// path format.
 */
function isStoragePath(url: string): boolean {
  return url.startsWith(STORAGE_PREFIX);
}

/**
 * Parses a storage path into bucket and file path.
 * Format: storage://{bucket}/{filePath}
 */
function parseStoragePath(url: string): { bucket: string; filePath: string } | null {
  if (!isStoragePath(url)) return null;
  const path = url.slice(STORAGE_PREFIX.length);
  const slashIndex = path.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    bucket: path.slice(0, slashIndex),
    filePath: path.slice(slashIndex + 1),
  };
}

/**
 * Extracts bucket and file path from a Supabase signed URL.
 * Example: https://xxx.supabase.co/storage/v1/object/sign/documents/abc/file.jpg?token=...
 */
function parseSignedUrl(url: string): { bucket: string; filePath: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // /storage/v1/object/sign/{bucket}/{...filePath}
    const signIndex = pathParts.indexOf('sign');
    if (signIndex === -1 || signIndex >= pathParts.length - 1) return null;
    const bucket = pathParts[signIndex + 1];
    const filePath = pathParts.slice(signIndex + 2).join('/');
    return { bucket, filePath };
  } catch {
    return null;
  }
}

/**
 * Checks if a Supabase public URL points to the storage service.
 * Public URLs: .../storage/v1/object/public/{bucket}/{filePath}
 */
function isPublicStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/');
}

/**
 * Extracts bucket and file path from a Supabase public URL.
 * Example: https://xxx.supabase.co/storage/v1/object/public/workforce-documents/abc/file.jpg
 */
function parsePublicUrl(url: string): { bucket: string; filePath: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // /storage/v1/object/public/{bucket}/{...filePath}
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex === -1 || publicIndex >= pathParts.length - 1) return null;
    const bucket = pathParts[publicIndex + 1];
    const filePath = pathParts.slice(publicIndex + 2).join('/');
    if (!bucket || !filePath) return null;
    return { bucket, filePath };
  } catch {
    return null;
  }
}

// ─── In-Memory Cache ───

interface CacheEntry {
  url: string;
  expiresAt: number; // Unix timestamp in ms
}

// Cache TTL: 50 minutes (signed URLs last 60 min, refresh 10 min early)
const CACHE_TTL_MS = 50 * 60 * 1000;

const urlCache = new Map<string, CacheEntry>();

function getCacheKey(bucketOrUrl: string, filePath?: string): string {
  if (filePath) return `${bucketOrUrl}/${filePath}`;
  return bucketOrUrl;
}

function getCachedUrl(key: string): string | null {
  const entry = urlCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    urlCache.delete(key);
    return null;
  }
  return entry.url;
}

function setCachedUrl(key: string, url: string): void {
  urlCache.set(key, {
    url,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ─── Core Resolution Functions ───

/**
 * Fetches a fresh signed URL from the get-signed-url edge function.
 */
async function fetchSignedUrl(bucket: string, filePath: string): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('No active session — cannot fetch signed URL');
  }

  const { data, error } = await supabase.functions.invoke('get-signed-url', {
    body: { bucket, filePath, expiresIn: 3600 },
  });

  if (error) {
    console.error('[imageUtils] get-signed-url error:', error.message);
    throw new Error(error.message || 'Failed to get signed URL');
  }

  if (!data?.success || !data?.data?.signedUrl) {
    throw new Error(data?.message || 'Invalid response from get-signed-url');
  }

  return data.data.signedUrl;
}

/**
 * Resolves an image URL to a viewable URL.
 *
 * Handles four URL formats:
 * 1. `storage://bucket/path` → fetches a fresh signed URL
 * 2. Expired signed URL → extracts bucket/path, fetches a fresh signed URL
 * 3. Public storage URL (private bucket) → converts to signed URL
 * 4. External URL → returns as-is
 *
 * Results are cached in memory for 50 minutes.
 */
export async function resolveImageUrl(rawUrl: string | null | undefined): Promise<string> {
  if (!rawUrl || rawUrl.trim() === '') {
    return '';
  }

  // Case 1: New storage:// path format
  if (isStoragePath(rawUrl)) {
    const parsed = parseStoragePath(rawUrl);
    if (!parsed) return rawUrl;

    const cacheKey = getCacheKey(parsed.bucket, parsed.filePath);
    const cached = getCachedUrl(cacheKey);
    if (cached) return cached;

    try {
      const signedUrl = await fetchSignedUrl(parsed.bucket, parsed.filePath);
      setCachedUrl(cacheKey, signedUrl);
      return signedUrl;
    } catch (err) {
      console.error('[imageUtils] Failed to resolve storage path:', err);
      return '';
    }
  }

  // Case 2: Old signed URL format (may be expired)
  if (isSignedUrl(rawUrl)) {
    const parsed = parseSignedUrl(rawUrl);
    if (!parsed) return rawUrl; // Can't parse → return as-is and hope for the best

    const cacheKey = getCacheKey(parsed.bucket, parsed.filePath);
    const cached = getCachedUrl(cacheKey);
    if (cached) return cached;

    try {
      const signedUrl = await fetchSignedUrl(parsed.bucket, parsed.filePath);
      setCachedUrl(cacheKey, signedUrl);
      return signedUrl;
    } catch (err) {
      console.warn('[imageUtils] Failed to refresh signed URL, returning original:', err);
      return rawUrl; // Return original — it might still work if not yet expired
    }
  }

  // Case 3: Public storage URL — bucket may be private, so generate signed URL
  if (isPublicStorageUrl(rawUrl)) {
    const parsed = parsePublicUrl(rawUrl);
    if (parsed) {
      const cacheKey = getCacheKey(parsed.bucket, parsed.filePath);
      const cached = getCachedUrl(cacheKey);
      if (cached) return cached;

      try {
        const signedUrl = await fetchSignedUrl(parsed.bucket, parsed.filePath);
        setCachedUrl(cacheKey, signedUrl);
        return signedUrl;
      } catch (err) {
        console.warn('[imageUtils] Failed to sign public URL, trying as-is:', err);
        return rawUrl; // Fallback: maybe bucket IS public
      }
    }
  }

  // Case 4: External URL → return as-is
  return rawUrl;
}

/**
 * Resolves multiple image URLs in parallel.
 * Useful for lists of documents.
 */
export async function resolveImageUrls(
  urls: (string | null | undefined)[]
): Promise<string[]> {
  return Promise.all(urls.map((url) => resolveImageUrl(url)));
}

/**
 * Checks if a URL needs resolution (is a storage path or signed URL).
 * Use this to decide if you need to call resolveImageUrl.
 */
export function needsResolution(url: string | null | undefined): boolean {
  if (!url) return false;
  return isStoragePath(url) || isSignedUrl(url);
}

// ─── React Hook ───

interface UseImageUrlResult {
  url: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * React hook that resolves an image URL and provides loading/error states.
 *
 * Usage:
 * ```tsx
 * const { url, loading, error, retry } = useImageUrl(document.file_url);
 * return <Image source={{ uri: url }} />;
 * ```
 */
export function useImageUrl(rawUrl: string | null | undefined): UseImageUrlResult {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const resolveCountRef = useRef(0);

  const resolve = useCallback(async () => {
    if (!rawUrl || rawUrl.trim() === '') {
      setUrl('');
      setLoading(false);
      setError(null);
      return;
    }

    // If it's a public URL that doesn't need resolution, set immediately
    if (!needsResolution(rawUrl)) {
      setUrl(rawUrl);
      setLoading(false);
      setError(null);
      return;
    }

    const currentResolve = ++resolveCountRef.current;
    setLoading(true);
    setError(null);

    try {
      const resolved = await resolveImageUrl(rawUrl);
      if (mountedRef.current && currentResolve === resolveCountRef.current) {
        setUrl(resolved);
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current && currentResolve === resolveCountRef.current) {
        setError(err?.message || 'Failed to load image');
        setUrl('');
        setLoading(false);
      }
    }
  }, [rawUrl]);

  useEffect(() => {
    mountedRef.current = true;
    resolve();
    return () => {
      mountedRef.current = false;
    };
  }, [resolve]);

  const retry = useCallback(() => {
    // Clear cache for this URL to force a fresh fetch
    if (rawUrl) {
      if (isStoragePath(rawUrl)) {
        const parsed = parseStoragePath(rawUrl);
        if (parsed) urlCache.delete(getCacheKey(parsed.bucket, parsed.filePath));
      } else if (isSignedUrl(rawUrl)) {
        const parsed = parseSignedUrl(rawUrl);
        if (parsed) urlCache.delete(getCacheKey(parsed.bucket, parsed.filePath));
      }
    }
    resolve();
  }, [rawUrl, resolve]);

  return { url, loading, error, retry };
}

/**
 * Clears the entire URL cache.
 * Call this on logout to prevent stale cached URLs.
 */
export function clearImageUrlCache(): void {
  urlCache.clear();
}
