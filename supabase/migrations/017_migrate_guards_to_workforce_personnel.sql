-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 017: Migrate existing guards → workforce_personnel
--                and guard_site_assignments → site_assignments
--
-- Req 12.1 — Existing guard data must be preserved
-- Req 12.4 — Backward compatibility maintained via views (016)
--
-- IDEMPOTENCY GUARANTEES
-- ──────────────────────
-- • Personnel INSERT: skips any guard whose user_id already
--   exists in workforce_personnel (WHERE NOT EXISTS guard).
-- • Assignments INSERT: skips any guard_site_assignment whose
--   guard_id already has a corresponding row in site_assignments
--   (matched via the wp.user_id → guards.user_id join).
-- • Safe to re-run at any time without duplicating data.
-- ============================================================

-- ============================================================
-- 1. MIGRATE guards → workforce_personnel
-- ============================================================
-- For each guard whose user_id is NOT already represented in
-- workforce_personnel, insert a new personnel row.
--
-- employee_id strategy:
--   Use ROW_NUMBER() over the guards being inserted, combined
--   with the current max sequence already in workforce_personnel
--   for the PIS category, to produce gap-free PIS-NNNN IDs.
--   This avoids calling generate_employee_id() in a set-based
--   INSERT (which would require a loop) while still honouring
--   the PIS-NNNN format defined in Req 7.2.
-- ============================================================
DO $$
DECLARE
  v_category_id  UUID;
  v_max_seq      INT;
BEGIN
  -- Resolve the Guard category id (prefix_code = 'PIS')
  SELECT id INTO v_category_id
    FROM workforce_categories
   WHERE prefix_code = 'PIS';

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION
      'Guard category (prefix_code = ''PIS'') not found. '
      'Run migration 015 first.';
  END IF;

  -- Find the highest sequence number already used for PIS personnel
  -- so new IDs continue from where the sequence left off.
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(employee_id, '-', 2) AS INT)),
    0
  )
  INTO v_max_seq
  FROM workforce_personnel
  WHERE category_id = v_category_id;

  -- Insert guards that are not yet in workforce_personnel.
  -- ROW_NUMBER() assigns a 1-based offset; adding v_max_seq
  -- ensures IDs are globally unique within the PIS category.
  INSERT INTO workforce_personnel (
    id,
    user_id,
    category_id,
    employee_id,
    name,
    phone,
    photo_url,
    base_salary,
    joining_date,
    shift_type,
    employment_status,
    emergency_contact_name,
    emergency_contact_phone,
    bank_account_number,
    bank_ifsc,
    bank_name,
    aadhaar_number,
    pan_number,
    address,
    created_at,
    updated_at
  )
  SELECT
    g.id,                          -- preserve original UUID for FK continuity
    g.user_id,
    v_category_id,
    -- Build PIS-NNNN employee_id using ROW_NUMBER offset
    'PIS-' || LPAD(
      (v_max_seq + ROW_NUMBER() OVER (ORDER BY g.id))::TEXT,
      4, '0'
    )                              AS employee_id,
    u.name,
    u.phone,
    g.photo_url,
    g.base_salary,
    g.joining_date,
    g.shift_type,
    g.employment_status,
    g.emergency_contact_name,
    g.emergency_contact_phone,
    g.bank_account_number,
    g.bank_ifsc,
    g.bank_name,
    g.aadhaar_number,
    g.pan_number,
    g.address,
    g.created_at,
    g.updated_at
  FROM guards g
  JOIN users u ON u.id = g.user_id
  -- Idempotency: skip guards already migrated
  WHERE NOT EXISTS (
    SELECT 1
      FROM workforce_personnel wp
     WHERE wp.user_id = g.user_id
  );

  RAISE NOTICE 'Migration 017 step 1 complete: guards migrated to workforce_personnel.';
END;
$$;

-- ============================================================
-- 2. MIGRATE guard_site_assignments → site_assignments
-- ============================================================
-- For each guard_site_assignment, insert a corresponding row
-- into site_assignments using the workforce_personnel.id that
-- was just created (or already existed) for that guard.
--
-- Idempotency: skip assignments where the personnel_id already
-- has a row in site_assignments for the same site and start
-- date (matched via guard → user_id → workforce_personnel).
-- ============================================================
INSERT INTO site_assignments (
  id,
  site_id,
  personnel_id,
  shift_type,
  start_date,
  is_active,
  created_at,
  updated_at
)
SELECT
  gsa.id,                          -- preserve original UUID
  gsa.site_id,
  wp.id                AS personnel_id,
  gsa.shift_type,
  COALESCE(gsa.assigned_date, gsa.created_at::DATE) AS start_date,
  gsa.is_active,
  gsa.created_at,
  gsa.updated_at
FROM guard_site_assignments gsa
-- Resolve guard → workforce_personnel via the shared user_id
JOIN guards g  ON g.id      = gsa.guard_id
JOIN workforce_personnel wp ON wp.user_id = g.user_id
-- Idempotency: skip if this assignment id already exists in site_assignments
WHERE NOT EXISTS (
  SELECT 1
    FROM site_assignments sa
   WHERE sa.id = gsa.id
);

-- ============================================================
-- 3. COMPLETION NOTICE
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE
    'Migration 017 complete: '
    'guard_site_assignments migrated to site_assignments. '
    'Both steps are idempotent and safe to re-run.';
END;
$$;
