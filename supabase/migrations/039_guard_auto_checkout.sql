-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 039: Guard Auto Checkout Strategy & Location Pings
--
-- Fixes applied:
--   1. Named CHECK constraint for checkout_method (matches project pattern)
--   2. Auto-close function joins sites to use per-site min_hours_present
--   3. Auto-close function calculates final status (present/present_late/half_day)
--   4. attendance_location_pings includes site_id for easier admin queries
--   5. RLS policies for attendance_location_pings
--   6. Better pg_cron handling with documentation
--
-- Idempotent: Uses IF NOT EXISTS, DROP + recreate for constraints/policies
-- ============================================================

-- ============================================================
-- 1. ADD checkout_method COLUMN TO workforce_attendance
-- ============================================================
ALTER TABLE workforce_attendance ADD COLUMN IF NOT EXISTS checkout_method VARCHAR(20) DEFAULT 'manual';

-- Named constraint (matches pattern in 030_attendance_status_overhaul.sql)
ALTER TABLE workforce_attendance DROP CONSTRAINT IF EXISTS workforce_attendance_checkout_method_check;
ALTER TABLE workforce_attendance ADD CONSTRAINT workforce_attendance_checkout_method_check
  CHECK (checkout_method IN ('manual', 'system_auto_forced'));

-- ============================================================
-- 2. CREATE attendance_location_pings TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_location_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES workforce_attendance(id) ON DELETE CASCADE,
  personnel_id UUID NOT NULL REFERENCES workforce_personnel(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If table already existed without site_id (from earlier migration run), add it now
ALTER TABLE attendance_location_pings ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alp_attendance_id ON attendance_location_pings(attendance_id);
CREATE INDEX IF NOT EXISTS idx_alp_personnel_id ON attendance_location_pings(personnel_id);
CREATE INDEX IF NOT EXISTS idx_alp_created_at ON attendance_location_pings(created_at);

-- ============================================================
-- 3. RLS POLICIES FOR attendance_location_pings
-- ============================================================
ALTER TABLE attendance_location_pings ENABLE ROW LEVEL SECURITY;

-- Admins have full access
DROP POLICY IF EXISTS alp_admin_all ON attendance_location_pings;
CREATE POLICY alp_admin_all ON attendance_location_pings FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- Operations manager can read all pings
DROP POLICY IF EXISTS alp_ops_read ON attendance_location_pings;
CREATE POLICY alp_ops_read ON attendance_location_pings FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- Supervisors can read pings for their assigned sites
DROP POLICY IF EXISTS alp_supervisor_read ON attendance_location_pings;
CREATE POLICY alp_supervisor_read ON attendance_location_pings FOR SELECT
  USING (
    current_user_role() = 'supervisor' AND
    site_id IN (SELECT current_supervisor_site_ids())
  );

-- Guards can insert their own pings (background task)
DROP POLICY IF EXISTS alp_self_insert ON attendance_location_pings;
CREATE POLICY alp_self_insert ON attendance_location_pings FOR INSERT
  WITH CHECK (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );

-- Guards can read their own pings
DROP POLICY IF EXISTS alp_self_read ON attendance_location_pings;
CREATE POLICY alp_self_read ON attendance_location_pings FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );

-- ============================================================
-- 4. AUTO-CLOSE STALE ATTENDANCE FUNCTION
-- ============================================================
-- This function:
--   a) Finds attendance sessions with no check_out_time older than 12 hours
--   b) Joins with the sites table to get the site's min_hours_present threshold
--   c) Sets check_out_time = check_in_time + 10 hours (default shift)
--   d) Calculates final status based on hours worked vs site thresholds
--   e) Marks checkout_method = 'system_auto_forced'
--
-- Called by pg_cron every hour.
-- ============================================================
CREATE OR REPLACE FUNCTION auto_close_stale_attendance() RETURNS void AS $$
DECLARE
  rec RECORD;
  computed_duration interval := '10 hours';
  stale_threshold interval := '12 hours';
  computed_hours numeric;
  site_min_present numeric;
  site_min_half_day numeric;
  final_status varchar;
  was_late boolean;
BEGIN
  FOR rec IN
    SELECT
      wa.id,
      wa.check_in_time,
      wa.status AS current_status,
      COALESCE(s.min_hours_present, 7) AS min_present,
      COALESCE(s.min_hours_half_day, 4) AS min_half_day
    FROM workforce_attendance wa
    LEFT JOIN sites s ON wa.site_id = s.id
    WHERE wa.check_out_time IS NULL
    AND (NOW() - wa.check_in_time) > stale_threshold
  LOOP
    -- Calculate hours from the default duration
    computed_hours := EXTRACT(EPOCH FROM computed_duration) / 3600;
    site_min_present := rec.min_present;
    site_min_half_day := rec.min_half_day;
    was_late := (rec.current_status = 'late');

    -- Determine final status using site thresholds (mirrors mobile checkOut logic)
    IF computed_hours < site_min_half_day THEN
      final_status := 'absent';
    ELSIF computed_hours < site_min_present THEN
      final_status := 'half_day';
    ELSE
      IF was_late THEN
        final_status := 'present_late';
      ELSE
        final_status := 'present';
      END IF;
    END IF;

    UPDATE workforce_attendance
    SET
      check_out_time = check_in_time + computed_duration,
      hours_worked = computed_hours,
      status = final_status,
      checkout_method = 'system_auto_forced',
      remarks = COALESCE(remarks, '') || ' | Auto-closed by system (forgot checkout)',
      updated_at = NOW()
    WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. SCHEDULE PG_CRON JOB
-- ============================================================
-- NOTE: pg_cron must be enabled in Supabase Dashboard first:
--   Database → Extensions → pg_cron → Enable
-- On free-tier Supabase, pg_cron may not be available.
-- If pg_cron is not available, you can call auto_close_stale_attendance()
-- manually via a Supabase Edge Function on a schedule instead.
-- ============================================================
DO $$
BEGIN
  -- Only attempt if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('auto_close_stale_attendance_job');
    EXCEPTION WHEN others THEN
      -- Job doesn't exist yet, that's fine
    END;
    -- Run every hour at minute 0
    PERFORM cron.schedule(
      'auto_close_stale_attendance_job',
      '0 * * * *',
      'SELECT auto_close_stale_attendance()'
    );
  END IF;
END $$;
