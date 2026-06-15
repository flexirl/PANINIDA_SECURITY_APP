-- ============================================================
-- PAN INDIA SECURITY — Attendance System Overhaul
-- Migration 030: Strict Check-in/Check-out with Timer-Based Validation
--
-- Changes:
--   1. Add 'present_late' status to both attendance tables
--   2. Add check_out_latitude/longitude to workforce_attendance
--   3. Add configurable attendance thresholds to sites
--   4. Add remarks column to workforce_attendance if missing
--
-- Idempotent: Uses IF NOT EXISTS, DROP + recreate for constraints
-- ============================================================

-- ============================================================
-- 1. ADD 'present_late' STATUS TO workforce_attendance
-- ============================================================
ALTER TABLE workforce_attendance DROP CONSTRAINT IF EXISTS workforce_attendance_status_check;
ALTER TABLE workforce_attendance ADD CONSTRAINT workforce_attendance_status_check
  CHECK (status IN ('present', 'late', 'half_day', 'absent', 'corrected', 'present_late'));

-- ============================================================
-- 2. ADD 'present_late' STATUS TO legacy attendance TABLE
-- ============================================================
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'late', 'half_day', 'absent', 'present_late'));

-- ============================================================
-- 3. ADD CHECK-OUT GEOLOCATION TO workforce_attendance
--    (Legacy attendance table already has these columns)
-- ============================================================
ALTER TABLE workforce_attendance ADD COLUMN IF NOT EXISTS check_out_latitude DECIMAL(10,8);
ALTER TABLE workforce_attendance ADD COLUMN IF NOT EXISTS check_out_longitude DECIMAL(11,8);

-- ============================================================
-- 4. ADD CONFIGURABLE ATTENDANCE THRESHOLDS TO sites
-- ============================================================

-- Minutes after shift start before check-in is considered "late" (default: 120 = 2 hours)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS late_threshold_minutes INT DEFAULT 120;

-- Minimum hours worked to be marked "present" (default: 7 hours)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS min_hours_present DECIMAL(4,2) DEFAULT 7.00;

-- Minimum hours worked to be marked "half_day" (below this = absent)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS min_hours_half_day DECIMAL(4,2) DEFAULT 4.00;

-- ============================================================
-- 5. ADD REMARKS TO workforce_attendance IF MISSING
-- ============================================================
ALTER TABLE workforce_attendance ADD COLUMN IF NOT EXISTS remarks TEXT;
