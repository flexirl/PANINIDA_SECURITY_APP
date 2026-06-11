// ============================================================
// useFileUpload — Centralized File Upload Hook
// Req 2  — Single reusable interface for all uploads
// Req 5  — Client-side image compression
// Req 9  — Retry with exponential backoff + offline queue
// Req 14 — Error code → bilingual message mapping
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../api/supabase';
import {
  FileCategory,
  UPLOAD_CATEGORIES,
  RETRY_CONFIG,
  getUploadErrorMessage,
} from '../constants/uploadConfig';
import { loadUploadQueue, dequeueUpload, updateQueueItem, enqueueUpload, QueuedUpload } from './useUploadQueue';

// ─── Types ───

export interface UploadOptions {
  /** Local file URI from ImagePicker or camera */
  fileUri: string;
  /** Upload category determines bucket, compression, and validation rules */
  category: FileCategory;
  /** Reference IDs linking file to source records */
  personnelId?: string;
  siteId?: string;
  attendanceId?: string;
  incidentId?: string;
  /** Document type for workforce_documents upsert (e.g., 'aadhaar', 'photo') */
  documentType?: string;
  /** Optional metadata stored alongside the file */
  metadata?: Record<string, any>;
  /** Override default compression settings */
  compressionOverride?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** Skip client-side compression (for PDFs or pre-compressed images) */
  skipCompression?: boolean;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  filePath?: string;
  url?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  error?: {
    code: string;
    message: string;
  };
}

// ─── Hook ───

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Compresses an image according to category rules.
   * Uses expo-image-manipulator for client-side processing.
   */
  const compressImage = useCallback(
    async (
      uri: string,
      category: FileCategory,
      overrides?: UploadOptions['compressionOverride']
    ): Promise<{ uri: string; width: number; height: number }> => {
      const config = UPLOAD_CATEGORIES[category];
      const maxWidth = overrides?.maxWidth ?? config.compression.maxWidth;
      const quality = overrides?.quality ?? config.compression.quality;

      try {
        const result = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: maxWidth } }],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        return {
          uri: result.uri,
          width: result.width,
          height: result.height,
        };
      } catch (err) {
        console.warn('[useFileUpload] Compression failed, using original:', err);
        // Fallback to original file if compression fails
        return { uri, width: 0, height: 0 };
      }
    },
    []
  );

  /**
   * Uploads a file using XMLHttpRequest for progress tracking.
   * Falls back to fetch if XHR is not available.
   */
  const uploadWithProgress = useCallback(
    async (
      formData: FormData,
      token: string,
      onProgress?: (pct: number) => void,
      signal?: AbortSignal
    ): Promise<any> => {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const url = `${supabaseUrl}/functions/v1/upload-file`;

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            onProgress?.(pct);
            setProgress(pct);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject({
                code: response.code || 'UPLOAD_FAILED',
                message: response.message || `Upload failed with status ${xhr.status}`,
              });
            }
          } catch (parseErr) {
            reject({ code: 'PROCESSING_ERROR', message: 'Failed to parse server response' });
          }
        });

        xhr.addEventListener('error', () => {
          reject({ code: 'NETWORK_TIMEOUT', message: 'Network error during upload' });
        });

        xhr.addEventListener('timeout', () => {
          reject({ code: 'NETWORK_TIMEOUT', message: 'Upload timed out' });
        });

        // Handle abort
        if (signal) {
          signal.addEventListener('abort', () => {
            xhr.abort();
            reject({ code: 'CANCELLED', message: 'Upload cancelled' });
          });
        }

        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = RETRY_CONFIG.uploadTimeout;
        xhr.send(formData);
      });
    },
    []
  );

  /**
   * Main upload function with compression, retry, and error handling.
   */
  const upload = useCallback(
    async (options: UploadOptions): Promise<UploadResult> => {
      const {
        fileUri,
        category,
        personnelId,
        siteId,
        attendanceId,
        incidentId,
        documentType,
        metadata,
        compressionOverride,
        onProgress,
        skipCompression,
      } = options;

      // Reset state
      setUploading(true);
      setProgress(0);

      // Create abort controller for this upload
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // ── 1. Get auth token ──
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          return {
            success: false,
            error: { code: 'UNAUTHORIZED', message: getUploadErrorMessage('UNAUTHORIZED') },
          };
        }

        // ── 2. Client-side compression (Req 5) ──
        let processedUri = fileUri;
        const isPdf = fileUri.toLowerCase().endsWith('.pdf');

        if (!skipCompression && !isPdf) {
          onProgress?.(5); // Show initial progress for compression
          setProgress(5);
          const compressed = await compressImage(fileUri, category, compressionOverride);
          processedUri = compressed.uri;
          onProgress?.(10);
          setProgress(10);
        }

        // ── 3. Build FormData ──
        const formData = new FormData();
        const fileExtension = processedUri.split('.').pop() || 'jpg';
        const fileName = `upload_${Date.now()}.${fileExtension}`;

        formData.append('file', {
          uri: processedUri,
          type: isPdf ? 'application/pdf' : 'image/jpeg',
          name: fileName,
        } as any);

        formData.append('category', category);
        if (personnelId) formData.append('personnelId', personnelId);
        if (siteId) formData.append('siteId', siteId);
        if (attendanceId) formData.append('attendanceId', attendanceId);
        if (incidentId) formData.append('incidentId', incidentId);
        if (documentType) formData.append('documentType', documentType);
        if (metadata) formData.append('metadata', JSON.stringify(metadata));

        // ── 4. Upload with retry (Req 9) ──
        let lastError: any = null;

        for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
          if (abortController.signal.aborted) {
            return {
              success: false,
              error: { code: 'CANCELLED', message: getUploadErrorMessage('CANCELLED') },
            };
          }

          try {
            // Adjust progress offset for retries
            const progressOffset = attempt > 0 ? 10 : (skipCompression ? 0 : 10);
            const progressCallback = (pct: number) => {
              const adjusted = progressOffset + Math.round((pct / 100) * (100 - progressOffset));
              onProgress?.(adjusted);
              setProgress(adjusted);
            };

            const response = await uploadWithProgress(
              formData,
              token,
              progressCallback,
              abortController.signal
            );

            if (response.success) {
              onProgress?.(100);
              setProgress(100);

              return {
                success: true,
                fileId: response.data.fileId,
                filePath: response.data.filePath,
                url: response.data.url,
                fileSize: response.data.fileSize,
                mimeType: response.data.mimeType,
                category: response.data.category,
              };
            } else {
              lastError = {
                code: response.code || 'UPLOAD_FAILED',
                message: response.message || 'Upload failed',
              };
            }
          } catch (err: any) {
            lastError = {
              code: err.code || 'NETWORK_TIMEOUT',
              message: err.message || 'Network error',
            };

            // Don't retry for non-transient errors
            const nonRetryable = ['INVALID_FORMAT', 'FILE_TOO_LARGE', 'PERMISSION_DENIED', 'UNAUTHORIZED', 'CANCELLED'];
            if (nonRetryable.includes(lastError.code)) {
              break;
            }

            // Wait before retry (exponential backoff)
            if (attempt < RETRY_CONFIG.maxRetries) {
              const delay = RETRY_CONFIG.backoffDelays[attempt] || 8000;
              console.log(`[useFileUpload] Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${delay}ms`);
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        }

        // ── 5. All retries exhausted — queue for offline retry (Req 9.5) ──
        if (lastError?.code === 'NETWORK_TIMEOUT') {
          await enqueueUpload({
            fileUri,
            category,
            personnelId,
            siteId,
            attendanceId,
            incidentId,
            documentType,
            metadata,
            lastError: lastError.message,
          });
          console.log('[useFileUpload] Upload queued for offline retry');
        }

        return {
          success: false,
          error: {
            code: lastError?.code || 'UPLOAD_FAILED',
            message: getUploadErrorMessage(lastError?.code || 'UPLOAD_FAILED'),
          },
        };
      } catch (err: any) {
        console.error('[useFileUpload] Unexpected error:', err);
        return {
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: getUploadErrorMessage('PROCESSING_ERROR'),
          },
        };
      } finally {
        setUploading(false);
        abortControllerRef.current = null;
      }
    },
    [compressImage, uploadWithProgress]
  );

  /**
   * Cancels the current in-progress upload (Req 2.6).
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const [queuedCount, setQueuedCount] = useState(0);

  /**
   * Processes all pending offline uploads in the queue.
   */
  const processQueue = useCallback(async () => {
    const queue = await loadUploadQueue();
    if (queue.length === 0) {
      setQueuedCount(0);
      return;
    }

    console.log(`[useFileUpload] Offline queue: processing ${queue.length} items...`);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn('[useFileUpload] No auth token available, skipping offline queue processing.');
      return;
    }

    for (const item of queue) {
      if (item.retryCount >= RETRY_CONFIG.maxRetries) {
        console.warn(`[useFileUpload] Skipping queued item ${item.id} (max retries exhausted).`);
        continue;
      }

      try {
        const formData = new FormData();
        const fileExtension = item.fileUri.split('.').pop() || 'jpg';
        const fileName = `queued_${Date.now()}.${fileExtension}`;

        formData.append('file', {
          uri: item.fileUri,
          type: item.fileUri.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          name: fileName,
        } as any);

        formData.append('category', item.category);
        if (item.personnelId) formData.append('personnelId', item.personnelId);
        if (item.siteId) formData.append('siteId', item.siteId);
        if (item.attendanceId) formData.append('attendanceId', item.attendanceId);
        if (item.incidentId) formData.append('incidentId', item.incidentId);
        if (item.documentType) formData.append('documentType', item.documentType);
        if (item.metadata) formData.append('metadata', JSON.stringify(item.metadata));

        const response = await uploadWithProgress(formData, token);

        if (response.success) {
          console.log(`[useFileUpload] Successfully uploaded queued item ${item.id}`);
          await dequeueUpload(item.id);
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } catch (err: any) {
        const nextRetry = item.retryCount + 1;
        console.warn(`[useFileUpload] Failed to upload queued item ${item.id} (attempt ${nextRetry}):`, err.message);
        await updateQueueItem(item.id, {
          retryCount: nextRetry,
          lastError: err.message,
        });
      }
    }

    const updatedQueue = await loadUploadQueue();
    setQueuedCount(updatedQueue.length);
  }, [uploadWithProgress]);

  // Sync queue count on mount and listen to connectivity changes
  useEffect(() => {
    loadUploadQueue().then((q) => setQueuedCount(q.length));

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        processQueue();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [processQueue]);

  return {
    upload,
    uploading,
    progress,
    cancel,
    queuedCount,
    processQueue,
  };
}
