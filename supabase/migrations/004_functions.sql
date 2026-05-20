-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 004: Database Functions
-- ============================================================

-- ============================================================
-- 1. HAVERSINE DISTANCE FUNCTION
-- Calculates distance in meters between two GPS coordinates
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 6371000;  -- Earth radius in meters
    d_lat DECIMAL;
    d_lon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    d_lat := RADIANS(lat2 - lat1);
    d_lon := RADIANS(lon2 - lon1);
    a := SIN(d_lat / 2) * SIN(d_lat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(d_lon / 2) * SIN(d_lon / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 2. CHECK GEO-FENCE FUNCTION
-- Returns true if coordinates are within site's geo-fence
-- ============================================================
CREATE OR REPLACE FUNCTION is_within_geofence(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_site_id UUID
)
RETURNS TABLE (
    within_fence BOOLEAN,
    distance_meters DECIMAL,
    allowed_radius INT
) AS $$
DECLARE
    site_lat DECIMAL;
    site_lon DECIMAL;
    site_radius INT;
    dist DECIMAL;
BEGIN
    SELECT s.latitude, s.longitude, s.geofence_radius
    INTO site_lat, site_lon, site_radius
    FROM sites s WHERE s.id = p_site_id;

    dist := calculate_distance(p_latitude, p_longitude, site_lat, site_lon);

    RETURN QUERY SELECT
        (dist <= site_radius) AS within_fence,
        ROUND(dist, 2) AS distance_meters,
        site_radius AS allowed_radius;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. DAILY ATTENDANCE SUMMARY FUNCTION
-- Returns attendance counts for a given date
-- ============================================================
CREATE OR REPLACE FUNCTION get_daily_attendance_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    site_id UUID,
    site_name VARCHAR,
    total_assigned INT,
    present_count BIGINT,
    late_count BIGINT,
    absent_count BIGINT,
    not_checked_in BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS site_id,
        s.site_name,
        COALESCE(assigned.cnt, 0)::INT AS total_assigned,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_count,
        (COALESCE(assigned.cnt, 0) - COUNT(a.id))::BIGINT AS not_checked_in
    FROM sites s
    LEFT JOIN (
        SELECT gsa.site_id, COUNT(*)::INT AS cnt
        FROM guard_site_assignments gsa
        WHERE gsa.is_active = true
        GROUP BY gsa.site_id
    ) assigned ON assigned.site_id = s.id
    LEFT JOIN attendance a ON a.site_id = s.id AND a.attendance_date = p_date
    WHERE s.is_active = true
    GROUP BY s.id, s.site_name, assigned.cnt
    ORDER BY s.site_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 4. MONTHLY ATTENDANCE SUMMARY FOR A GUARD
-- ============================================================
CREATE OR REPLACE FUNCTION get_guard_monthly_attendance(
    p_guard_id UUID,
    p_month VARCHAR  -- format: '2026-05'
)
RETURNS TABLE (
    total_days BIGINT,
    days_present BIGINT,
    days_late BIGINT,
    days_absent BIGINT,
    total_hours DECIMAL
) AS $$
DECLARE
    month_start DATE;
    month_end DATE;
BEGIN
    month_start := (p_month || '-01')::DATE;
    month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    RETURN QUERY
    SELECT
        COUNT(DISTINCT a.attendance_date) AS total_days,
        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) AS days_present,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS days_late,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS days_absent,
        COALESCE(SUM(a.hours_worked), 0) AS total_hours
    FROM attendance a
    WHERE a.guard_id = p_guard_id
        AND a.attendance_date BETWEEN month_start AND month_end;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 5. GET BUSINESS DAYS IN A MONTH
-- ============================================================
CREATE OR REPLACE FUNCTION get_business_days(p_month VARCHAR)
RETURNS INT AS $$
DECLARE
    month_start DATE;
    month_end DATE;
    total_days INT := 0;
    current_day DATE;
BEGIN
    month_start := (p_month || '-01')::DATE;
    month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    current_day := month_start;

    WHILE current_day <= month_end LOOP
        -- Count all days (security works 7 days a week)
        total_days := total_days + 1;
        current_day := current_day + 1;
    END LOOP;

    RETURN total_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 6. DEACTIVATE PREVIOUS ASSIGNMENTS ON NEW ASSIGNMENT
-- Ensures a guard has only one active assignment
-- ============================================================
CREATE OR REPLACE FUNCTION deactivate_previous_assignments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE guard_site_assignments
        SET is_active = false, updated_at = NOW()
        WHERE guard_id = NEW.guard_id
            AND id != NEW.id
            AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deactivate_prev_assignments
    AFTER INSERT ON guard_site_assignments
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_previous_assignments();

-- ============================================================
-- 7. VALIDATE ATTENDANCE CHECK-IN
-- Prevents duplicate check-ins for same guard/date/shift
-- ============================================================
CREATE OR REPLACE FUNCTION validate_attendance_checkin()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INT;
BEGIN
    SELECT COUNT(*) INTO existing_count
    FROM attendance
    WHERE guard_id = NEW.guard_id
        AND attendance_date = NEW.attendance_date
        AND shift_type = NEW.shift_type
        AND check_in_time IS NOT NULL;

    IF existing_count > 0 THEN
        RAISE EXCEPTION 'Guard has already checked in for this shift today';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_checkin
    BEFORE INSERT ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION validate_attendance_checkin();

-- ============================================================
-- 8. CALCULATE HOURS WORKED ON CHECK-OUT
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_hours_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
        NEW.hours_worked := ROUND(
            EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0,
            2
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_hours
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_hours_on_checkout();
