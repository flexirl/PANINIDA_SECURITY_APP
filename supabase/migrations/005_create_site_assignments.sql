-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 005: Create site_assignments table
-- Req 2.5 — Site assignment tracking
-- Req 2.6 — Auto-deactivate previous assignment on new insert
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS + CREATE
-- ============================================================

-- ============================================================
-- 1. SITE_ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS site_assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID        NOT NULL REFERENCES sites(id),
  personnel_id UUID        NOT NULL REFERENCES workforce_personnel(id),
  shift_type   VARCHAR(20) CHECK (shift_type IN ('day', 'night', 'rotational')),
  start_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date     DATE,                          -- NULL means currently active
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PARTIAL INDEXES (only index active rows for performance)
-- ============================================================

-- Fast lookup of active assignments for a site (used by Site Dashboard)
CREATE INDEX IF NOT EXISTS idx_site_assignments_site
  ON site_assignments (site_id)
  WHERE is_active = true;

-- Fast lookup of active assignments for a personnel record
CREATE INDEX IF NOT EXISTS idx_site_assignments_personnel
  ON site_assignments (personnel_id)
  WHERE is_active = true;

-- ============================================================
-- 3. DEACTIVATE PREVIOUS ASSIGNMENT TRIGGER FUNCTION
-- Req 2.6: When a new active assignment is inserted for a
-- personnel, all previous active assignments for that same
-- personnel are deactivated (is_active=false, end_date=today).
-- ============================================================
CREATE OR REPLACE FUNCTION deactivate_previous_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only act when the new assignment is active
  IF NEW.is_active = true THEN
    UPDATE site_assignments
       SET is_active  = false,
           end_date   = CURRENT_DATE,
           updated_at = NOW()
     WHERE personnel_id = NEW.personnel_id
       AND id           != NEW.id
       AND is_active    = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_prev_site_assignment ON site_assignments;
CREATE TRIGGER trg_deactivate_prev_site_assignment
  AFTER INSERT ON site_assignments
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_previous_assignment();

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_site_assignments ON site_assignments;
CREATE TRIGGER set_updated_at_site_assignments
  BEFORE UPDATE ON site_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
