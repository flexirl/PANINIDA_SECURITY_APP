-- =============================================================================
-- Migration 019: Schedule Escalation Engine via pg_cron
-- =============================================================================
-- Schedules the escalation-engine Edge Function to run every 5 minutes.
-- The function checks for:
--   1. Complaints with expired SLA deadlines (escalates L1→L2→L3)
--   2. Replacement requests open >2 hours without assignment (notifies ops manager)
--
-- Prerequisites:
--   - pg_cron extension must be enabled in Supabase dashboard
--   - pg_net extension must be enabled for HTTP calls
--   - escalation-engine Edge Function must be deployed
--   - app.edge_function_url and app.service_role_key must be set in PostgreSQL config
--
-- This migration is idempotent: it unschedules any existing job with the same
-- name before creating a new one.
-- =============================================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if it exists (idempotent)
SELECT cron.unschedule('escalation-engine')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'escalation-engine'
);

-- Schedule the escalation engine to run every 5 minutes
SELECT cron.schedule(
  'escalation-engine',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/escalation-engine',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
