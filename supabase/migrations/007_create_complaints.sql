-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 007: Create complaints table
-- Req 4.1 — Complaint records with SLA tracking
-- Req 4.9 — time_to_resolve_seconds for analytics
-- Req 8.6 — incident_reported and severity fields
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================

-- ============================================================
-- 1. COMPLAINTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                 UUID        NOT NULL REFERENCES sites(id),
  raised_by               UUID        NOT NULL REFERENCES client_users(id),
  assigned_to             UUID        REFERENCES users(id),
  category                VARCHAR(100) NOT NULL,
  description             TEXT        NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'open'
                            CHECK (status IN (
                              'open',
                              'in_progress',
                              'escalated_l2',
                              'escalated_l3',
                              'resolved',
                              'closed'
                            )),
  current_level           INT         NOT NULL DEFAULT 1
                            CHECK (current_level IN (1, 2, 3)),
  severity                VARCHAR(10)
                            CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  incident_reported       BOOLEAN     NOT NULL DEFAULT false,
  sla_deadline            TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  time_to_resolve_seconds BIGINT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of complaints for a site (Site Dashboard, Client Portal)
CREATE INDEX IF NOT EXISTS idx_complaints_site
  ON complaints (site_id);

-- Fast lookup by status (escalation engine, dashboards)
CREATE INDEX IF NOT EXISTS idx_complaints_status
  ON complaints (status);

-- Partial index: only index active SLA deadlines (excludes resolved/closed)
-- Used by the Escalation_Engine to efficiently poll for expired SLAs (Req 4.10)
CREATE INDEX IF NOT EXISTS idx_complaints_sla
  ON complaints (sla_deadline)
  WHERE status NOT IN ('resolved', 'closed');

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_complaints ON complaints;
CREATE TRIGGER set_updated_at_complaints
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
