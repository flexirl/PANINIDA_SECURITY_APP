-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 001: Extend users table with new role values
-- Req 11.1 — Add new roles while preserving legacy roles
-- Idempotent: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT
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
    -- Legacy roles preserved for backward compatibility (Req 12)
    'manager',
    'recruiter',
    'guard'
  ));
