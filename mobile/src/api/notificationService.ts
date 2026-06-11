import { supabase } from './supabase';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'shift_reminder' | 'attendance_alert' | 'salary_generated' | 'inspection_reminder' | 'recruitment_update' | 'general';
  is_read: boolean;
  created_at: string;
}

/**
 * Fetches user notifications.
 */
export async function getNotifications(filters?: { unread_only?: boolean }): Promise<NotificationItem[]> {
  const queryStr = filters?.unread_only ? '?unread=true' : '';

  const { data, error } = await supabase.functions.invoke(`notifications${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error fetching notifications:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve notification center feed');
  }

  return data.notifications || [];
}

/**
 * Marks an individual notification as read by UUID.
 */
export async function markAsRead(id: string): Promise<NotificationItem> {
  const { data, error } = await supabase.functions.invoke(`notifications?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
  });

  if (error) {
    console.error('Error marking notification as read:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to update alert state');
  }

  return data.notification;
}

/**
 * Bulk updates all unread notifications to read status.
 */
export async function markAllAsRead(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('notifications?action=read-all', {
    method: 'PUT',
  });

  if (error) {
    console.error('Error marking all notifications read:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to complete bulk mark all read');
  }

  return true;
}
