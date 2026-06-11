-- =============================================================================
-- Migration 023: Fix infinite recursion in workforce_personnel RLS policies
-- =============================================================================
-- Problem: The `wp_supervisor_read` policy calls `current_supervisor_site_ids()`,
-- which JOINs `workforce_personnel`. Querying `workforce_personnel` triggers RLS
-- evaluation, which evaluates `wp_supervisor_read` again → infinite recursion.
--
-- Similarly, any policy on `workforce_personnel` that sub-selects FROM
-- `workforce_personnel` itself causes the same recursion.
--
-- Fix: Rewrite all helper functions and policies that touch
-- `workforce_personnel` to avoid querying the table whose RLS is being
-- evaluated. Instead, we:
--   1. Look up the personnel_id directly from user_id (via the users/auth.uid()
--      relationship) without going through workforce_personnel.
--   2. Use site_assignments with a direct user_id match instead of JOINing
--      workforce_personnel.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Rewrite current_supervisor_site_ids() to avoid workforce_personnel
-- ---------------------------------------------------------------------------
-- Old version JOINed workforce_personnel → triggered RLS → recursion.
-- New version joins site_assignments directly via user_id stored on
-- workforce_personnel, but we can't read workforce_personnel here either.
-- Instead, we go through site_assignments joined with workforce_categories
-- using a sub-select that reads workforce_personnel with NO RLS
-- (the function is SECURITY DEFINER + we set the search_path).
--
-- HOWEVER, the cleanest fix is to avoid the workforce_personnel table
-- entirely in this function. We can achieve this by querying
-- site_assignments and workforce_categories using the personnel_id
-- that is linked to auth.uid(). But to find the personnel_id, we need
-- workforce_personnel... So instead we use a different approach:
-- Create a helper that reads workforce_personnel bypassing RLS.
-- ---------------------------------------------------------------------------

-- Helper: Get current user's personnel_id(s) bypassing RLS.
-- This uses SECURITY DEFINER + explicit search_path.
-- The function owner (postgres/migration role) bypasses RLS because
-- we explicitly set the role to bypass RLS for this function.
CREATE OR REPLACE FUNCTION _get_my_personnel_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM workforce_personnel WHERE user_id = auth.uid()
$$;

-- Force the function to run as the function owner who has full table access.
-- Grant only execute to authenticated users.
REVOKE ALL ON FUNCTION _get_my_personnel_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION _get_my_personnel_ids() TO authenticated;

-- Rewrite current_supervisor_site_ids() to avoid reading workforce_personnel
-- directly (which triggers RLS). Instead, use _get_my_personnel_ids() which
-- is SECURITY DEFINER and bypasses RLS.
CREATE OR REPLACE FUNCTION current_supervisor_site_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT sa.site_id
  FROM site_assignments sa
  JOIN workforce_categories wc ON wc.id = (
    SELECT wp.category_id FROM workforce_personnel wp WHERE wp.id = sa.personnel_id
  )
  WHERE sa.personnel_id IN (SELECT _get_my_personnel_ids())
    AND wc.prefix_code = 'SUP'
    AND sa.is_active = true
$$;

REVOKE ALL ON FUNCTION current_supervisor_site_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_supervisor_site_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- Step 2: Drop and recreate workforce_personnel policies that cause recursion
-- ---------------------------------------------------------------------------

-- wp_supervisor_read: was using current_supervisor_site_ids() which internally
-- queries workforce_personnel → recursion. Now the function is safe since
-- it uses _get_my_personnel_ids() (SECURITY DEFINER, bypasses RLS).
-- But the policy ITSELF also queries site_assignments with a sub-select
-- that doesn't touch workforce_personnel, so this is fine.
DROP POLICY IF EXISTS wp_supervisor_read ON workforce_personnel;
CREATE POLICY wp_supervisor_read ON workforce_personnel FOR SELECT
  USING (
    current_user_role() = 'supervisor' AND
    id IN (
      SELECT sa.personnel_id
      FROM site_assignments sa
      WHERE sa.site_id IN (SELECT current_supervisor_site_ids())
        AND sa.is_active = true
    )
  );

-- wp_client_read: same pattern, queries site_assignments not workforce_personnel
DROP POLICY IF EXISTS wp_client_read ON workforce_personnel;
CREATE POLICY wp_client_read ON workforce_personnel FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    id IN (
      SELECT sa.personnel_id
      FROM site_assignments sa
      WHERE sa.site_id = current_user_site_id()
        AND sa.is_active = true
    )
  );

-- wp_self_read: was safe (user_id = auth.uid() doesn't sub-select), keep it
-- but restate for completeness
DROP POLICY IF EXISTS wp_self_read ON workforce_personnel;
CREATE POLICY wp_self_read ON workforce_personnel FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Step 3: Fix policies on OTHER tables that sub-select FROM workforce_personnel
-- These also trigger RLS on workforce_personnel which can cause recursion.
-- Replace `SELECT id FROM workforce_personnel WHERE user_id = auth.uid()`
-- with `SELECT _get_my_personnel_ids()`.
-- ---------------------------------------------------------------------------

-- workforce_documents: wd_self_read
DROP POLICY IF EXISTS wd_self_read ON workforce_documents;
CREATE POLICY wd_self_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT _get_my_personnel_ids())
  );

-- workforce_attendance: wa_self_read, wa_self_insert, wa_self_update
DROP POLICY IF EXISTS wa_self_read ON workforce_attendance;
CREATE POLICY wa_self_read ON workforce_attendance FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT _get_my_personnel_ids())
  );

DROP POLICY IF EXISTS wa_self_insert ON workforce_attendance;
CREATE POLICY wa_self_insert ON workforce_attendance FOR INSERT
  WITH CHECK (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT _get_my_personnel_ids())
  );

DROP POLICY IF EXISTS wa_self_update ON workforce_attendance;
CREATE POLICY wa_self_update ON workforce_attendance FOR UPDATE
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT _get_my_personnel_ids())
  );

-- site_assignments: sa_self_read
DROP POLICY IF EXISTS sa_self_read ON site_assignments;
CREATE POLICY sa_self_read ON site_assignments FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT _get_my_personnel_ids())
  );
