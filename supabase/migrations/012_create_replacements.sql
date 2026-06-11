-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 012: Create replacements table
-- Req 9.1 — Replacement record structure
-- Req 9.2 — Auto-created when Attendance Required personnel is absent
-- Req 9.3 — Status transitions: requested → assigned → completed/cancelled
-- Req 9.4 — client_notified set to true when status = 'assigned'
-- Req 9.5 — vacancy_start / vacancy_end track vacancy duration
-- Req 9.8 — UNIQUE constraint prevents duplicate replacement requests
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================

-- ============================================================
-- 1. REPLACEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS replacements (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  absent_personnel_id      UUID        NOT NULL REFERENCES workforce_personnel(id),
  replacement_personnel_id UUID        REFERENCES workforce_personnel(id),  -- nullable until assigned
  site_id                  UUID        NOT NULL REFERENCES sites(id),
  shift_date               DATE        NOT NULL,
  status                   VARCHAR(20) NOT NULL DEFAULT 'requested'
                             CHECK (status IN (
                               'requested',
                               'assigned',
                               'completed',
                               'cancelled'
                             )),
  requested_by             UUID        NOT NULL REFERENCES users(id),
  assigned_by              UUID        REFERENCES users(id),  -- nullable until assigned
  client_notified          BOOLEAN     NOT NULL DEFAULT false,
  vacancy_start            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vacancy_end              TIMESTAMPTZ,                        -- nullable: set when vacancy is filled
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevents duplicate replacement requests for the same person/site/date (Req 9.8)
  CONSTRAINT uq_replacement_per_shift
    UNIQUE (absent_personnel_id, site_id, shift_date)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of all replacements for a site on a given date
-- (used by Site Dashboard vacancy view — Req 2.2, Req 9.6)
CREATE INDEX IF NOT EXISTS idx_replacements_site_date
  ON replacements (site_id, shift_date);

-- Partial index for open/in-progress replacements only
-- (used by escalation check — Req 9.7)
CREATE INDEX IF NOT EXISTS idx_replacements_status_open
  ON replacements (status)
  WHERE status IN ('requested', 'assigned');

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_replacements ON replacements;
CREATE TRIGGER set_updated_at_replacements
  BEFORE UPDATE ON replacements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
