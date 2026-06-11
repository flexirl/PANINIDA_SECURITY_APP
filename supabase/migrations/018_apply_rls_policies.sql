-- =============================================================================
-- Migration 018: Row-Level Security (RLS) Policies
-- =============================================================================
-- This migration enables RLS on all new tables introduced by the Workforce &
-- Facility Management System and creates all role-scoped access policies.
--
-- It depends on migrations 001–017 (all tables must exist before policies
-- can be applied).
--
-- Structure:
--   Part 1 (this task, 2.1): Helper functions used by every RLS policy
--   Part 2 (task 2.2):       Policies for workforce_categories, workforce_personnel
--   Part 3 (task 2.3):       Policies for complaints, complaint_comments,
--                             complaint_escalations
--   Part 4 (task 2.4):       Policies for workforce_documents
--   Part 5 (task 2.5):       Policies for workforce_attendance, site_assignments,
--                             replacements, client_users
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Part 1: RLS Helper Functions
-- ---------------------------------------------------------------------------
-- All three functions use SECURITY DEFINER so they execute with the privileges
-- of the function owner (typically the migration role) rather than the calling
-- user.  This is required because RLS policies run in the context of the
-- authenticated user, who may not have direct SELECT rights on the underlying
-- tables (users, client_users, site_assignments).  SECURITY DEFINER lets the
-- policy expressions read those tables safely without granting broad table
-- permissions to every role.
-- ---------------------------------------------------------------------------

-- Helper function 1: Get current user's role
-- Returns the `role` column from the `users` table for the currently
-- authenticated Supabase user (auth.uid()).  Used in every RLS policy to
-- branch on role without exposing the users table to the calling session.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- Helper function 2: Get current client_user's assigned site_id
-- Returns the single site_id linked to the currently authenticated user via
-- the client_users table.  Only active (is_active = true) mappings are
-- considered.  Used in policies that restrict client_user access to their
-- own site's data (complaints, workforce_personnel, workforce_documents, etc.).
CREATE OR REPLACE FUNCTION current_user_site_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT site_id FROM client_users 
  WHERE user_id = auth.uid() AND is_active = true 
  LIMIT 1
$$;

-- Helper function 3: Get all site_ids assigned to current supervisor
-- Returns the set of site UUIDs where the currently authenticated user is
-- assigned as an active Supervisor (workforce_categories.prefix_code = 'SUP').
-- Returns SETOF UUID so it can be used directly in IN (...) sub-selects inside
-- RLS policies.  Used to scope supervisor access to only the sites they manage.
CREATE OR REPLACE FUNCTION current_supervisor_site_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT sa.site_id 
  FROM site_assignments sa
  JOIN workforce_personnel wp ON sa.personnel_id = wp.id
  JOIN workforce_categories wc ON wp.category_id = wc.id
  WHERE wp.user_id = auth.uid() 
    AND wc.prefix_code = 'SUP' 
    AND sa.is_active = true
$$;


-- ---------------------------------------------------------------------------
-- Part 2: RLS Policies for workforce_categories and workforce_personnel
-- ---------------------------------------------------------------------------

-- ============================================================
-- 2a. workforce_categories
-- ============================================================

ALTER TABLE workforce_categories ENABLE ROW LEVEL SECURITY;

-- wc_read_all: all authenticated roles can read categories
DROP POLICY IF EXISTS wc_read_all ON workforce_categories;
CREATE POLICY wc_read_all ON workforce_categories FOR SELECT
  USING (
    current_user_role() IN (
      'super_admin','admin','operations_manager',
      'supervisor','client_user','workforce_personnel'
    )
  );

-- wc_write_admin: only super_admin and admin can insert
DROP POLICY IF EXISTS wc_write_admin ON workforce_categories;
CREATE POLICY wc_write_admin ON workforce_categories FOR INSERT
  WITH CHECK (current_user_role() IN ('super_admin','admin'));

-- wc_update_admin: only super_admin and admin can update
DROP POLICY IF EXISTS wc_update_admin ON workforce_categories;
CREATE POLICY wc_update_admin ON workforce_categories FOR UPDATE
  USING (current_user_role() IN ('super_admin','admin'));

-- ============================================================
-- 2b. workforce_personnel
-- ============================================================

ALTER TABLE workforce_personnel ENABLE ROW LEVEL SECURITY;

-- wp_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS wp_admin_all ON workforce_personnel;
CREATE POLICY wp_admin_all ON workforce_personnel FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- wp_ops_read: operations_manager can read all personnel
DROP POLICY IF EXISTS wp_ops_read ON workforce_personnel;
CREATE POLICY wp_ops_read ON workforce_personnel FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- wp_supervisor_read: supervisor can read personnel at their assigned sites
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

-- wp_client_read: client_user can read personnel at their assigned site
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

-- wp_self_read: workforce_personnel can read their own record
DROP POLICY IF EXISTS wp_self_read ON workforce_personnel;
CREATE POLICY wp_self_read ON workforce_personnel FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    user_id = auth.uid()
  );


-- ---------------------------------------------------------------------------
-- Part 3: RLS Policies for complaints, complaint_comments,
--          complaint_escalations
-- (Task 2.3 — Req 4.x, Req 14.2, Req 14.3)
-- ---------------------------------------------------------------------------

-- ============================================================
-- 3a. complaints
-- ============================================================

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- comp_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS comp_admin_all ON complaints;
CREATE POLICY comp_admin_all ON complaints FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- comp_ops_read: operations_manager can read all complaints
DROP POLICY IF EXISTS comp_ops_read ON complaints;
CREATE POLICY comp_ops_read ON complaints FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- comp_ops_write_l2l3: operations_manager can update complaints at level 2 or 3
DROP POLICY IF EXISTS comp_ops_write_l2l3 ON complaints;
CREATE POLICY comp_ops_write_l2l3 ON complaints FOR UPDATE
  USING (current_user_role() = 'operations_manager' AND current_level IN (2,3));

-- comp_supervisor_site: supervisor can read/write complaints for their assigned sites
DROP POLICY IF EXISTS comp_supervisor_site ON complaints;
CREATE POLICY comp_supervisor_site ON complaints FOR ALL
  USING (
    current_user_role() = 'supervisor' AND
    site_id IN (SELECT current_supervisor_site_ids())
  );

-- comp_client_site: client_user can read complaints for their site
DROP POLICY IF EXISTS comp_client_site ON complaints;
CREATE POLICY comp_client_site ON complaints FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    site_id = current_user_site_id()
  );

-- comp_client_insert: client_user can raise complaints for their site
DROP POLICY IF EXISTS comp_client_insert ON complaints;
CREATE POLICY comp_client_insert ON complaints FOR INSERT
  WITH CHECK (
    current_user_role() = 'client_user' AND
    site_id = current_user_site_id()
  );

-- ============================================================
-- 3b. complaint_comments  (APPEND-ONLY — Req 14.2)
-- ============================================================
-- No UPDATE or DELETE policies — this table is append-only (immutable per Req 14.2)

ALTER TABLE complaint_comments ENABLE ROW LEVEL SECURITY;

-- cc_read: all authenticated users can read comments
DROP POLICY IF EXISTS cc_read ON complaint_comments;
CREATE POLICY cc_read ON complaint_comments FOR SELECT
  USING (true);

-- cc_insert: any authenticated user can insert a comment
DROP POLICY IF EXISTS cc_insert ON complaint_comments;
CREATE POLICY cc_insert ON complaint_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 3c. complaint_escalations  (APPEND-ONLY — Req 14.3)
-- ============================================================
-- No UPDATE or DELETE policies — this table is append-only (immutable per Req 14.3)

ALTER TABLE complaint_escalations ENABLE ROW LEVEL SECURITY;

-- ce_read: all authenticated users can read escalations
DROP POLICY IF EXISTS ce_read ON complaint_escalations;
CREATE POLICY ce_read ON complaint_escalations FOR SELECT
  USING (true);

-- ce_insert: any authenticated user can insert an escalation record
DROP POLICY IF EXISTS ce_insert ON complaint_escalations;
CREATE POLICY ce_insert ON complaint_escalations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- ---------------------------------------------------------------------------
-- Part 4: RLS Policies for workforce_documents
-- (Task 2.4 — Req 6.5, Req 3.5, Req 6.9)
-- ---------------------------------------------------------------------------

ALTER TABLE workforce_documents ENABLE ROW LEVEL SECURITY;

-- wd_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS wd_admin_all ON workforce_documents;
CREATE POLICY wd_admin_all ON workforce_documents FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- wd_ops_read: operations_manager can read all documents
DROP POLICY IF EXISTS wd_ops_read ON workforce_documents;
CREATE POLICY wd_ops_read ON workforce_documents FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- wd_supervisor_read: supervisor can read documents for personnel at their assigned sites
DROP POLICY IF EXISTS wd_supervisor_read ON workforce_documents;
CREATE POLICY wd_supervisor_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'supervisor' AND
    personnel_id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id IN (SELECT current_supervisor_site_ids()) AND sa.is_active = true
    )
  );

-- wd_client_read: client_user can only read permitted document types for personnel at their site (Req 3.5, Req 6.9)
DROP POLICY IF EXISTS wd_client_read ON workforce_documents;
CREATE POLICY wd_client_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    document_type IN (
      'aadhaar','pan','police_verification',
      'security_training_certificate','weapon_training_certificate',
      'gun_license','ex_servicemen_proof'
    ) AND
    personnel_id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id = current_user_site_id() AND sa.is_active = true
    )
  );

-- wd_self_read: workforce_personnel can read their own documents
DROP POLICY IF EXISTS wd_self_read ON workforce_documents;
CREATE POLICY wd_self_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- Part 5: RLS Policies for workforce_attendance, site_assignments,
--          replacements, client_users
-- (Task 2.5)
-- ---------------------------------------------------------------------------

-- ============================================================
-- 5a. workforce_attendance
-- ============================================================

ALTER TABLE workforce_attendance ENABLE ROW LEVEL SECURITY;

-- wa_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS wa_admin_all ON workforce_attendance;
CREATE POLICY wa_admin_all ON workforce_attendance FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- wa_ops_read: operations_manager can read all attendance
DROP POLICY IF EXISTS wa_ops_read ON workforce_attendance;
CREATE POLICY wa_ops_read ON workforce_attendance FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- wa_supervisor_site: supervisor can read/write attendance for their sites
DROP POLICY IF EXISTS wa_supervisor_site ON workforce_attendance;
CREATE POLICY wa_supervisor_site ON workforce_attendance FOR ALL
  USING (
    current_user_role() = 'supervisor' AND
    site_id IN (SELECT current_supervisor_site_ids())
  );

-- wa_client_read: client_user can read attendance for their site
DROP POLICY IF EXISTS wa_client_read ON workforce_attendance;
CREATE POLICY wa_client_read ON workforce_attendance FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    site_id = current_user_site_id()
  );

-- wa_self_read: workforce_personnel can read their own attendance
DROP POLICY IF EXISTS wa_self_read ON workforce_attendance;
CREATE POLICY wa_self_read ON workforce_attendance FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );

-- wa_self_insert: workforce_personnel can insert their own attendance (check-in)
DROP POLICY IF EXISTS wa_self_insert ON workforce_attendance;
CREATE POLICY wa_self_insert ON workforce_attendance FOR INSERT
  WITH CHECK (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );

-- wa_self_update: workforce_personnel can update their own attendance (check-out)
DROP POLICY IF EXISTS wa_self_update ON workforce_attendance;
CREATE POLICY wa_self_update ON workforce_attendance FOR UPDATE
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5b. site_assignments
-- ============================================================

ALTER TABLE site_assignments ENABLE ROW LEVEL SECURITY;

-- sa_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS sa_admin_all ON site_assignments;
CREATE POLICY sa_admin_all ON site_assignments FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- sa_ops_read: operations_manager can read all assignments
DROP POLICY IF EXISTS sa_ops_read ON site_assignments;
CREATE POLICY sa_ops_read ON site_assignments FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- sa_supervisor_read: supervisor can read assignments for their sites
DROP POLICY IF EXISTS sa_supervisor_read ON site_assignments;
CREATE POLICY sa_supervisor_read ON site_assignments FOR SELECT
  USING (
    current_user_role() = 'supervisor' AND
    site_id IN (SELECT current_supervisor_site_ids())
  );

-- sa_client_read: client_user can read assignments for their site
DROP POLICY IF EXISTS sa_client_read ON site_assignments;
CREATE POLICY sa_client_read ON site_assignments FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    site_id = current_user_site_id()
  );

-- sa_self_read: workforce_personnel can read their own assignments
DROP POLICY IF EXISTS sa_self_read ON site_assignments;
CREATE POLICY sa_self_read ON site_assignments FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5c. replacements
-- ============================================================

ALTER TABLE replacements ENABLE ROW LEVEL SECURITY;

-- rep_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS rep_admin_all ON replacements;
CREATE POLICY rep_admin_all ON replacements FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- rep_ops_read: operations_manager can read all replacements
DROP POLICY IF EXISTS rep_ops_read ON replacements;
CREATE POLICY rep_ops_read ON replacements FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- rep_supervisor_site: supervisor can read/write replacements for their sites
DROP POLICY IF EXISTS rep_supervisor_site ON replacements;
CREATE POLICY rep_supervisor_site ON replacements FOR ALL
  USING (
    current_user_role() = 'supervisor' AND
    site_id IN (SELECT current_supervisor_site_ids())
  );

-- rep_client_read: client_user can read replacements for their site
DROP POLICY IF EXISTS rep_client_read ON replacements;
CREATE POLICY rep_client_read ON replacements FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    site_id = current_user_site_id()
  );

-- ============================================================
-- 5d. client_users
-- ============================================================

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- cu_admin_all: super_admin and admin have full access
DROP POLICY IF EXISTS cu_admin_all ON client_users;
CREATE POLICY cu_admin_all ON client_users FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- cu_ops_read: operations_manager can read all client_users
DROP POLICY IF EXISTS cu_ops_read ON client_users;
CREATE POLICY cu_ops_read ON client_users FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- cu_self_read: client_user can read their own record
DROP POLICY IF EXISTS cu_self_read ON client_users;
CREATE POLICY cu_self_read ON client_users FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    user_id = auth.uid()
  );
