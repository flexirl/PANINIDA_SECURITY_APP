-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 016: Create backward-compatibility views
-- Req 12.4 — Compatibility views keep legacy Edge Functions working
--             during and after migration to workforce_personnel.
--
-- These views are intentionally thin wrappers so that the
-- existing Edge Functions (/functions/v1/guards,
-- /functions/v1/attendance, /functions/v1/assignments) continue
-- to return data in the same shape they always have, without
-- any code changes to those functions.
--
-- Idempotent: CREATE OR REPLACE VIEW (safe to re-run)
-- ============================================================

-- ============================================================
-- 1. GUARDS COMPATIBILITY VIEW
-- Maps workforce_personnel (category = 'Guard' / prefix 'PIS')
-- back to the column shape of the legacy `guards` table.
--
-- Columns present in guards but NOT in workforce_personnel:
--   height, weight, education, police_verification
-- → returned as NULL so callers receive the expected column
--   names without errors.
-- ============================================================
CREATE OR REPLACE VIEW guards_compat_view AS
  SELECT
    wp.id,
    wp.user_id,
    wp.aadhaar_number,
    wp.pan_number,
    wp.address,
    wp.photo_url,
    -- Legacy-only columns not stored in workforce_personnel
    NULL::DECIMAL(5,2)   AS height,
    NULL::DECIMAL(5,2)   AS weight,
    NULL::VARCHAR(100)   AS education,
    NULL::BOOLEAN        AS police_verification,
    wp.base_salary,
    wp.joining_date,
    wp.shift_type,
    wp.emergency_contact_name,
    wp.emergency_contact_phone,
    wp.bank_account_number,
    wp.bank_ifsc,
    wp.bank_name,
    wp.employment_status,
    wp.created_at
  FROM workforce_personnel wp
  JOIN workforce_categories wc ON wp.category_id = wc.id
  WHERE wc.prefix_code = 'PIS';

COMMENT ON VIEW guards_compat_view IS
  'Backward-compatibility view: exposes workforce_personnel rows '
  'for the Guard category (prefix_code = ''PIS'') in the same '
  'column shape as the legacy guards table. '
  'Used by /functions/v1/guards Edge Function during migration.';

-- ============================================================
-- 2. GUARD ASSIGNMENTS COMPATIBILITY VIEW
-- Maps site_assignments (for Guard personnel) back to the
-- column shape of the legacy `guard_site_assignments` table.
-- ============================================================
CREATE OR REPLACE VIEW guard_assignments_compat_view AS
  SELECT
    sa.id,
    sa.personnel_id  AS guard_id,   -- legacy column name
    sa.site_id,
    sa.shift_type,
    sa.start_date    AS assigned_date, -- legacy column name
    sa.is_active
  FROM site_assignments sa
  JOIN workforce_personnel wp  ON sa.personnel_id = wp.id
  JOIN workforce_categories wc ON wp.category_id  = wc.id
  WHERE wc.prefix_code = 'PIS';

COMMENT ON VIEW guard_assignments_compat_view IS
  'Backward-compatibility view: exposes site_assignments rows '
  'for Guard personnel (prefix_code = ''PIS'') in the same '
  'column shape as the legacy guard_site_assignments table. '
  'Used by /functions/v1/assignments Edge Function during migration.';
