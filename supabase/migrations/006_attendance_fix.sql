-- ============================================================
-- FIX: Enforce One Attendance Per Guard Per Day Per Shift
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Delete duplicate attendance records (keep the earliest one)
DELETE FROM attendance
WHERE id NOT IN (
    SELECT DISTINCT ON (guard_id, attendance_date, shift_type) id
    FROM attendance
    ORDER BY guard_id, attendance_date, shift_type, created_at ASC
);

-- Step 2: Add UNIQUE constraint so DB prevents future duplicates
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS unique_guard_attendance_per_day;

ALTER TABLE attendance
  ADD CONSTRAINT unique_guard_attendance_per_day
  UNIQUE (guard_id, attendance_date, shift_type);

-- Step 3: Recreate the validation trigger with better error message
CREATE OR REPLACE FUNCTION validate_attendance_checkin()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INT;
BEGIN
    -- Ensure attendance_date is always set
    IF NEW.attendance_date IS NULL THEN
        NEW.attendance_date := CURRENT_DATE;
    END IF;

    SELECT COUNT(*) INTO existing_count
    FROM attendance
    WHERE guard_id = NEW.guard_id
        AND attendance_date = NEW.attendance_date
        AND shift_type = NEW.shift_type
        AND check_in_time IS NOT NULL;

    IF existing_count > 0 THEN
        RAISE EXCEPTION 'Guard has already checked in for % shift on %', NEW.shift_type, NEW.attendance_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_checkin ON attendance;
CREATE TRIGGER trg_validate_checkin
    BEFORE INSERT ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION validate_attendance_checkin();
