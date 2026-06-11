// ============================================================
// Upload Queue Manager — Persisted Offline Upload Queue
// Req 9  — Queue failed uploads for retry on connectivity restore
// Req 9.5 — Persist queue to survive app restarts
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPLOAD_QUEUE_STORAGE_KEY, FileCategory } from '../constants/uploadConfig';

export interface QueuedUpload {
  id: string;
  fileUri: string;
  category: FileCategory;
  personnelId?: string;
  siteId?: string;
  attendanceId?: string;
  incidentId?: string;
  documentType?: string;
  metadata?: Record<string, any>;
  retryCount: number;
  createdAt: string;
  lastError?: string;
}

/**
 * Loads the persisted upload queue from AsyncStorage.
 */
export async function loadUploadQueue(): Promise<QueuedUpload[]> {
  try {
    const raw = await AsyncStorage.getItem(UPLOAD_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[UploadQueue] Failed to load queue:', err);
    return [];
  }
}

/**
 * Saves the upload queue to AsyncStorage.
 */
export async function saveUploadQueue(queue: QueuedUpload[]): Promise<void> {
  try {
    await AsyncStorage.setItem(UPLOAD_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[UploadQueue] Failed to save queue:', err);
  }
}

/**
 * Adds a failed upload to the queue for later retry.
 */
export async function enqueueUpload(item: Omit<QueuedUpload, 'id' | 'retryCount' | 'createdAt'>): Promise<void> {
  const queue = await loadUploadQueue();
  const newItem: QueuedUpload = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
  queue.push(newItem);
  await saveUploadQueue(queue);
  console.log(`[UploadQueue] Enqueued upload: ${newItem.id} (${item.category})`);
}

/**
 * Removes a successfully uploaded item from the queue.
 */
export async function dequeueUpload(id: string): Promise<void> {
  const queue = await loadUploadQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await saveUploadQueue(filtered);
}

/**
 * Updates retry count and error for a queued item.
 */
export async function updateQueueItem(
  id: string,
  updates: Partial<Pick<QueuedUpload, 'retryCount' | 'lastError'>>
): Promise<void> {
  const queue = await loadUploadQueue();
  const index = queue.findIndex((item) => item.id === id);
  if (index >= 0) {
    queue[index] = { ...queue[index], ...updates };
    await saveUploadQueue(queue);
  }
}

/**
 * Clears all items from the queue.
 */
export async function clearUploadQueue(): Promise<void> {
  await AsyncStorage.removeItem(UPLOAD_QUEUE_STORAGE_KEY);
}
