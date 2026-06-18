-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 035: Enable Realtime for notifications
-- ============================================================

-- Add notifications table to the supabase_realtime publication
-- This allows clients to listen to inserts/updates on this table instantly.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
