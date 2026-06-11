-- =============================================================================
-- Migration 022: RLS Policies for Operations Manager on Sites Table
-- =============================================================================
-- This migration adds RLS policies enabling operations_manager role to read and
-- update sites where they are assigned as the site_manager_id (Req 11.2).
-- =============================================================================

-- Policy for operations_manager to select sites they manage
DROP POLICY IF EXISTS ops_sites_select ON sites;
CREATE POLICY ops_sites_select ON sites
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'operations_manager' AND
    site_manager_id = auth.uid()
  );

-- Policy for operations_manager to update sites they manage
DROP POLICY IF EXISTS ops_sites_update ON sites;
CREATE POLICY ops_sites_update ON sites
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'operations_manager' AND
    site_manager_id = auth.uid()
  )
  WITH CHECK (
    current_user_role() = 'operations_manager' AND
    site_manager_id = auth.uid()
  );
