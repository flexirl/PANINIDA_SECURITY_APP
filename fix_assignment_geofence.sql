-- =============================================================================
-- Assignment & Geofence Diagnostic & Fix Script
-- =============================================================================

-- STEP 1: Check Manoj Thakur's personnel record
SELECT 
    id as personnel_id, 
    employee_id, 
    name, 
    user_id,
    employment_status,
    shift_type
FROM workforce_personnel 
WHERE employee_id = 'PIS-9004' OR name ILIKE '%Manoj%Thakur%';

-- STEP 2: Check Birla Colony site
SELECT 
    id as site_id, 
    site_name, 
    address, 
    latitude, 
    longitude, 
    geofence_radius,
    is_active
FROM sites 
WHERE site_name ILIKE '%Birla%Colony%' OR address ILIKE '%Birla%Colony%';

-- STEP 3: Check existing site assignments for Manoj
SELECT 
    sa.id as assignment_id,
    sa.site_id,
    sa.personnel_id,
    sa.shift_type,
    sa.start_date,
    sa.end_date,
    sa.is_active,
    sa.created_at,
    wp.employee_id,
    wp.name as personnel_name, 
    s.site_name,
    s.geofence_radius
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004' OR wp.name ILIKE '%Manoj%Thakur%'
ORDER BY sa.created_at DESC;

-- STEP 4: Check if there are multiple active assignments (should only be one)
SELECT 
    wp.employee_id,
    wp.name,
    COUNT(*) as active_assignment_count
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
WHERE sa.is_active = true
GROUP BY wp.id, wp.employee_id, wp.name
HAVING COUNT(*) > 1;

-- =============================================================================
-- FIX 1: Increase geofence radius for all sites to improve check-in success
-- =============================================================================

-- Update Birla Colony specifically
UPDATE sites 
SET geofence_radius = 200
WHERE (site_name ILIKE '%Birla%Colony%' OR address ILIKE '%Birla%Colony%')
  AND geofence_radius < 200;

-- Optional: Update all sites with small geofence radius
UPDATE sites 
SET geofence_radius = 150
WHERE geofence_radius < 100 OR geofence_radius IS NULL;

-- =============================================================================
-- FIX 2: If assignment doesn't exist, create it
-- (Run this ONLY if Step 3 showed no active assignment)
-- =============================================================================

-- Uncomment and run if needed:
-- INSERT INTO site_assignments (site_id, personnel_id, shift_type, start_date, is_active)
-- SELECT 
--     (SELECT id FROM sites WHERE site_name ILIKE '%Birla%Colony%' LIMIT 1),
--     (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1),
--     'night',
--     CURRENT_DATE,
--     true
-- WHERE NOT EXISTS (
--     SELECT 1 FROM site_assignments sa
--     JOIN workforce_personnel wp ON sa.personnel_id = wp.id
--     WHERE wp.employee_id = 'PIS-9004' AND sa.is_active = true
-- );

-- =============================================================================
-- FIX 3: If assignment exists but is inactive, reactivate it
-- =============================================================================

-- Uncomment and run if needed:
-- UPDATE site_assignments
-- SET is_active = true, end_date = NULL
-- WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1)
--   AND is_active = false
--   AND id = (
--       SELECT id FROM site_assignments 
--       WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1)
--       ORDER BY created_at DESC LIMIT 1
--   );

-- =============================================================================
-- FIX 4: Ensure legacy guard_site_assignments table is synced
-- =============================================================================

-- Check legacy assignments
SELECT 
    gsa.id,
    gsa.guard_id,
    gsa.site_id,
    gsa.shift_type,
    gsa.is_active,
    wp.employee_id,
    wp.name,
    s.site_name
FROM guard_site_assignments gsa
JOIN workforce_personnel wp ON gsa.guard_id = wp.id
JOIN sites s ON gsa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004' OR wp.name ILIKE '%Manoj%Thakur%'
ORDER BY gsa.created_at DESC;

-- Sync to legacy table if missing
-- INSERT INTO guard_site_assignments (id, guard_id, site_id, shift_type, assigned_date, is_active)
-- SELECT 
--     sa.id,
--     sa.personnel_id,
--     sa.site_id,
--     CASE WHEN sa.shift_type = 'night' THEN 'night' ELSE 'day' END,
--     sa.start_date,
--     sa.is_active
-- FROM site_assignments sa
-- JOIN workforce_personnel wp ON sa.personnel_id = wp.id
-- WHERE wp.employee_id = 'PIS-9004'
--   AND sa.is_active = true
--   AND NOT EXISTS (
--       SELECT 1 FROM guard_site_assignments gsa
--       WHERE gsa.id = sa.id
--   );

-- =============================================================================
-- VERIFICATION: Check the final state
-- =============================================================================

-- Verify assignment is now visible
SELECT 
    wp.employee_id,
    wp.name as personnel_name,
    s.site_name,
    s.address,
    s.geofence_radius,
    sa.shift_type,
    sa.start_date,
    sa.is_active,
    s.latitude,
    s.longitude
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004'
  AND sa.is_active = true;

-- Test query that the app uses (this is what fetchUserProfile runs)
SELECT sa.id, sa.site_id, sa.shift_type
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
WHERE wp.user_id = (SELECT user_id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1)
  AND sa.is_active = true
LIMIT 1;

