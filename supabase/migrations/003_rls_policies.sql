-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 003: Row-Level Security (RLS) Policies
-- FIXED: Helper functions in public schema (not auth schema)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (in public schema)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_guard_id()
RETURNS UUID AS $$
    SELECT g.id FROM public.guards g WHERE g.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================
CREATE POLICY admin_users_all ON users
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY own_user_select ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- ============================================================
-- GUARDS TABLE POLICIES
-- ============================================================
CREATE POLICY admin_guards_all ON guards
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY guard_own_select ON guards
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() AND public.get_user_role() = 'guard');

CREATE POLICY manager_guards_select ON guards
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'manager'
        AND id IN (
            SELECT gsa.guard_id FROM guard_site_assignments gsa
            WHERE gsa.site_id IN (
                SELECT i.site_id FROM inspections i WHERE i.inspector_id = auth.uid()
            )
            AND gsa.is_active = true
        )
    );

-- ============================================================
-- GUARD DOCUMENTS POLICIES
-- ============================================================
CREATE POLICY admin_docs_all ON guard_documents
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY guard_own_docs ON guard_documents
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    );

-- ============================================================
-- SITES TABLE POLICIES
-- ============================================================
CREATE POLICY admin_sites_all ON sites
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY manager_sites_select ON sites
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'manager');

CREATE POLICY guard_sites_select ON sites
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND id IN (
            SELECT gsa.site_id FROM guard_site_assignments gsa
            WHERE gsa.guard_id = public.get_guard_id()
            AND gsa.is_active = true
        )
    );

-- ============================================================
-- GUARD-SITE ASSIGNMENTS POLICIES
-- ============================================================
CREATE POLICY admin_assignments_all ON guard_site_assignments
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY guard_own_assignments ON guard_site_assignments
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    );

CREATE POLICY manager_assignments_select ON guard_site_assignments
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'manager');

-- ============================================================
-- ATTENDANCE POLICIES
-- ============================================================
CREATE POLICY admin_attendance_all ON attendance
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY guard_attendance_insert ON attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    );

CREATE POLICY guard_attendance_select ON attendance
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    );

CREATE POLICY guard_attendance_update ON attendance
    FOR UPDATE TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    )
    WITH CHECK (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    );

CREATE POLICY manager_attendance_select ON attendance
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'manager');

-- ============================================================
-- PAYROLL POLICIES
-- ============================================================
CREATE POLICY admin_payroll_all ON payroll
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY guard_payroll_select ON payroll
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
        AND status IN ('approved', 'paid')
    );

-- ============================================================
-- UNIFORMS POLICIES
-- ============================================================
CREATE POLICY admin_uniforms_all ON uniforms
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY guard_uniforms_select ON uniforms
    FOR SELECT TO authenticated
    USING (
        public.get_user_role() = 'guard'
        AND guard_id = public.get_guard_id()
    );

-- ============================================================
-- CANDIDATES POLICIES (Recruitment)
-- ============================================================
CREATE POLICY admin_candidates_all ON candidates
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY recruiter_candidates_all ON candidates
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'recruiter')
    WITH CHECK (public.get_user_role() = 'recruiter');

-- ============================================================
-- INSPECTIONS POLICIES
-- ============================================================
CREATE POLICY admin_inspections_select ON inspections
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'admin');

CREATE POLICY manager_inspections_all ON inspections
    FOR ALL TO authenticated
    USING (
        public.get_user_role() = 'manager'
        AND inspector_id = auth.uid()
    )
    WITH CHECK (
        public.get_user_role() = 'manager'
        AND inspector_id = auth.uid()
    );

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================
CREATE POLICY own_notifications_select ON notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY own_notifications_update ON notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY admin_notifications_insert ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY service_notifications_insert ON notifications
    FOR INSERT TO service_role
    WITH CHECK (true);
