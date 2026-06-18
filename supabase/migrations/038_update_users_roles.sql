-- ============================================================
-- PAN INDIA SECURITY
-- Migration 038: Update users role constraint
-- Allows 'inspector' as a valid role
-- ============================================================

-- Drop the existing role check constraint (if any) so we can replace it
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the updated constraint that includes all new roles alongside legacy ones
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    -- New roles for Workforce & Facility Management
    'super_admin',
    'admin',
    'operations_manager',
    'supervisor',
    'client_user',
    'workforce_personnel',
    'inspector',
    -- Legacy roles preserved for backward compatibility (Req 12)
    'manager',
    'recruiter',
    'guard'
  ));
