-- ============================================================================
-- Migration 033: Create Visitor Logs and Extend Sites
-- Description: Adds visitor logs tracking and extends sites with supervisor details
-- ============================================================================

-- 1. Extend sites table with supervisor details
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS site_supervisor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS site_supervisor_phone VARCHAR(20);

-- 2. Create visitor_logs table
CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    guard_id UUID NOT NULL REFERENCES auth.users(id),
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    flat_number VARCHAR(100),
    purpose VARCHAR(255) NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_visitor_logs_site_id ON visitor_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_guard_id ON visitor_logs(guard_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_check_in ON visitor_logs(check_in_time DESC);

-- Enable RLS
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for visitor_logs

-- Admins and Operations Managers can do everything
CREATE POLICY vl_admin_all ON visitor_logs
    FOR ALL
    USING (current_user_role() IN ('super_admin', 'admin', 'operations_manager'));

-- Guards can insert logs for sites they are assigned to (or generally any site for now, 
-- but let's restrict to authenticated users with role guard/workforce_personnel)
CREATE POLICY vl_guard_insert ON visitor_logs
    FOR INSERT
    WITH CHECK (
        current_user_role() IN ('guard', 'workforce_personnel') AND
        auth.uid() = guard_id
    );

-- Guards can read logs they created or for their site
CREATE POLICY vl_guard_select ON visitor_logs
    FOR SELECT
    USING (
        current_user_role() IN ('guard', 'workforce_personnel') AND
        site_id IN (
            SELECT site_id FROM site_assignments 
            WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE user_id = auth.uid() LIMIT 1)
            AND is_active = true
        )
    );

-- Clients can read logs for their assigned sites
CREATE POLICY vl_client_select ON visitor_logs
    FOR SELECT
    USING (
        current_user_role() IN ('client_user') AND
        site_id IN (SELECT site_id FROM client_users WHERE user_id = auth.uid() AND is_active = true)
    );
