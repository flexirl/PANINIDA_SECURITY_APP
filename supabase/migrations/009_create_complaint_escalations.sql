-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 009: Create complaint_escalations table
-- Req 4.6  — Escalation audit log per complaint
-- Req 14.3 — No UPDATE or DELETE permitted on this table
--
-- IMPORTANT: This table is APPEND-ONLY (immutable).
-- No updated_at column is present by design.
-- No UPDATE or DELETE RLS policies will ever be created for
-- this table. Each escalation event is written once and
-- preserved permanently as an immutable audit record.
-- ============================================================

-- ============================================================
-- 1. COMPLAINT_ESCALATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_escalations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID        NOT NULL REFERENCES complaints(id),
  from_level   INT         NOT NULL,
  to_level     INT         NOT NULL,
  -- No updated_at column: this table is append-only (immutable per Req 14.3)
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  escalated_by TEXT        NOT NULL DEFAULT 'system', -- 'system' or a user_id
  reason       TEXT
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of all escalation events for a complaint
CREATE INDEX IF NOT EXISTS idx_complaint_escalations_complaint
  ON complaint_escalations (complaint_id);
