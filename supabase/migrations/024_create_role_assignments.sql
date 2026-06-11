-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 024: Role Assignments Table
-- ============================================================
-- Allows admin to assign phone numbers to roles (manager,
-- supervisor, society president, inspector, ops manager).
-- When a phone number is assigned, the corresponding user
-- record is updated/created so role-based routing works.
-- ============================================================

CREATE TABLE IF NOT EXISTS role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    assigned_role VARCHAR(30) NOT NULL CHECK (
        assigned_role IN (
            'manager',
            'operations_manager',
            'supervisor',
            'client_user',
            'inspector',
            'admin'
        )
    ),
    assigned_by UUID REFERENCES users(id),
    label VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate active assignments of same phone to same role
    CONSTRAINT unique_active_phone_role UNIQUE (phone, assigned_role)
);

-- Index for quick lookups by phone
CREATE INDEX IF NOT EXISTS idx_role_assignments_phone ON role_assignments(phone);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON role_assignments(assigned_role);
CREATE INDEX IF NOT EXISTS idx_role_assignments_active ON role_assignments(is_active);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at_role_assignments
    BEFORE UPDATE ON role_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY role_assignments_admin_all ON role_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Authenticated users can read their own assignments
CREATE POLICY role_assignments_self_read ON role_assignments
    FOR SELECT
    USING (
        phone IN (
            SELECT phone FROM users WHERE id = auth.uid()
        )
    );

-- ============================================================
-- Extend users role constraint to include 'inspector'
-- ============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'super_admin',
    'admin',
    'operations_manager',
    'supervisor',
    'client_user',
    'workforce_personnel',
    'inspector',
    -- Legacy roles
    'manager',
    'recruiter',
    'guard'
  ));
