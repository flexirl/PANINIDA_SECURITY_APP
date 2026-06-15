-- =============================================================================
-- Migration 020: Replacement Auto-Creation Trigger
-- =============================================================================
-- Automatically inserts a record into the `replacements` table when an
-- Attendance Required personnel member's daily attendance is marked 'absent'.
--
-- Idempotent: DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_create_replacement_on_absent()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
  v_attendance_required BOOLEAN;
  v_requester_id UUID;
BEGIN
  -- 1. Check if status is set to 'absent'
  IF NEW.status = 'absent' THEN
    
    -- 2. Lookup if the personnel's category requires attendance
    SELECT wc.attendance_required INTO v_attendance_required
    FROM workforce_personnel wp
    JOIN workforce_categories wc ON wp.category_id = wc.id
    WHERE wp.id = NEW.personnel_id;

    IF v_attendance_required = true THEN
      
      -- Resolve requested_by. Use approved_by if available (e.g. manual absent marking by supervisor),
      -- fallback to pre-seeded admin user.
      IF NEW.approved_by IS NOT NULL THEN
        v_requester_id := NEW.approved_by;
      ELSE
        v_requester_id := 'a0000000-0000-0000-0000-000000000001'; -- Rajesh Kumar (Admin)
      END IF;

      -- 3. Insert into replacements table
      -- ON CONFLICT uq_replacement_per_shift DO NOTHING ensures idempotency (Req 9.8)
      INSERT INTO replacements (
        absent_personnel_id,
        site_id,
        shift_date,
        status,
        requested_by,
        client_notified,
        vacancy_start
      ) VALUES (
        NEW.personnel_id,
        NEW.site_id,
        NEW.attendance_date,
        'requested',
        v_requester_id,
        false,
        NOW()
      )
      ON CONFLICT (absent_personnel_id, site_id, shift_date) DO NOTHING;

    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to workforce_attendance table
DROP TRIGGER IF EXISTS trg_auto_create_replacement_on_absent ON workforce_attendance;
CREATE TRIGGER trg_auto_create_replacement_on_absent
  AFTER INSERT OR UPDATE OF status
  ON workforce_attendance
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_replacement_on_absent();
