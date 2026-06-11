-- ============================================================================
-- QUICK START: Insert Workforce Categories ONLY
-- ============================================================================
-- Run this FIRST in Supabase SQL Editor to fix the "No categories found" error
-- This creates the 8 required categories for the Personnel Category Filtering feature
-- ============================================================================

-- Insert the 8 workforce categories (let Supabase generate UUIDs)
INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined, created_at, updated_at)
VALUES 
  ('Guard', 'PIS', true, true, NOW(), NOW()),
  ('Gunman', 'GM', true, true, NOW(), NOW()),
  ('Rifleman', 'RM', true, true, NOW(), NOW()),
  ('PSO', 'PSO', true, true, NOW(), NOW()),
  ('Bouncer', 'BNC', true, true, NOW(), NOW()),
  ('Housekeeping', 'HK', false, true, NOW(), NOW()),
  ('Sweeper', 'SWP', false, true, NOW(), NOW()),
  ('Gardener', 'GRD', false, true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  prefix_code = EXCLUDED.prefix_code,
  attendance_required = EXCLUDED.attendance_required,
  is_system_defined = EXCLUDED.is_system_defined,
  updated_at = NOW();

-- Verify the categories were inserted
SELECT 
  id,
  name,
  prefix_code,
  attendance_required,
  is_system_defined,
  created_at
FROM workforce_categories
ORDER BY name;

-- Expected output:
-- 8 rows showing Guard, Gunman, Rifleman, PSO, Bouncer, Housekeeping, Sweeper, Gardener
-- Each with a proper UUID in the id column
