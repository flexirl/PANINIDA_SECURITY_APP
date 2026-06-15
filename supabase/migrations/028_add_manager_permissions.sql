-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 028: Manager Module Permissions
-- ============================================================
-- Adds a JSONB `permissions` column to role_assignments so
-- admins can control which modules a manager can access.
--
-- NULL or missing → full access (backward-compatible)
-- JSON object → explicit per-module access flags
--
-- Example:
-- {
--   "workforce": true,
--   "sites": true,
--   "payroll": true,
--   "recruitment": false,
--   "analytics": false,
--   "inspections": false,
--   "uniforms": false,
--   "reports": false,
--   "categories": false,
--   "notifications": true
-- }
-- ============================================================

ALTER TABLE role_assignments
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN role_assignments.permissions IS
  'JSONB object controlling per-module access for manager role. NULL = full access. Keys: workforce, sites, payroll, recruitment, analytics, inspections, uniforms, reports, categories, notifications.';
