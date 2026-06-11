-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 010: Create workforce_attendance table
-- Req 5.6 — Extends attendance concept to all workforce_personnel
-- Req 5.4 — Geofence-verified check-in for Attendance Required categories
-- Req 5.5 — Manual entry allowed for Attendance Optional categories
-- Req 8.3 — Attendance correction approval by Supervisor
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================

-- ============================================================
-- 1. WORKFORCE_ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workforce_attendance (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id        UUID         NOT NULL REFERENCES workforce_personnel(id),
  site_id             UUID         NOT NULL REFERENCES sites(id),
  attendance_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
  shift_type          VARCHAR(20)  CHECK (shift_type IN ('day', 'night', 'rotational')),
  check_in_time       TIMESTAMPTZ,
  check_out_time      TIMESTAMPTZ,
  check_in_selfie     TEXT,                    -- Supabase Storage URL
  check_out_selfie    TEXT,                    -- Supabase Storage URL
  check_in_latitude   DECIMAL(10,8),
  check_in_longitude  DECIMAL(11,8),
  hours_worked        DECIMAL(4,2),
  status              VARCHAR(20)  NOT NULL DEFAULT 'absent'
                        CHECK (status IN (
                          'present',
                          'late',
                          'half_day',
                          'absent',
                          'corrected'
                        )),
  is_manual_entry     BOOLEAN      NOT NULL DEFAULT false,
  approved_by         UUID         REFERENCES users(id),  -- Supervisor who approved correction
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- One attendance record per personnel per date per shift
  CONSTRAINT uq_workforce_attendance_daily
    UNIQUE (personnel_id, attendance_date, shift_type)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of attendance history for a personnel member
CREATE INDEX IF NOT EXISTS idx_workforce_attendance_personnel
  ON workforce_attendance (personnel_id, attendance_date);

-- Fast lookup of all attendance for a site on a given date
-- (used by Site Dashboard Present Today count — Req 2.2, Req 5.7)
CREATE INDEX IF NOT EXISTS idx_workforce_attendance_site_date
  ON workforce_attendance (site_id, attendance_date);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_workforce_attendance ON workforce_attendance;
CREATE TRIGGER set_updated_at_workforce_attendance
  BEFORE UPDATE ON workforce_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
