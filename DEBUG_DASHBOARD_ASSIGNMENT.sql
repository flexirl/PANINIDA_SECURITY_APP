-- =============================================================================
-- Debug: Why Dashboard Doesn't Show Assignment
-- Even though Profile shows it correctly
-- =============================================================================

-- STEP 1: Verify the complete user → personnel → assignment chain
SELECT 
    'User Table' as source,
    u.id as user_id,
    u.phone,
    u.name,
    u.role
FROM users u
WHERE u.phone = '9777777774'

UNION ALL

SELECT 
    'Personnel Table' as source,
    wp.user_id as user_id,
    wp.phone,
    wp.name,
    wp.employee_id as role
FROM workforce_personnel wp
WHERE wp.phone = '9777777774' OR wp.user_id = (SELECT id FROM users WHERE phone = '9777777774')

UNION ALL

SELECT 
    'Assignment Table' as source,
    sa.id as user_id,
    CAST(sa.personnel_id as TEXT) as phone,
    s.site_name as name,
    sa.shift_type as role
FROM site_assignments sa
JOIN sites s ON s.id = sa.site_id
WHERE sa.personnel_id = (SELECT id FROM workforce_personnel WHERE phone = '9777777774')
AND sa.is_active = true;

-- STEP 2: Check what fetchUserProfile returns
-- This simulates what the app's authService.fetchUserProfile() does
SELECT 
    u.id as user_id,
    u.name,
    u.phone,
    u.role,
    u.is_active,
    wp.id as workforce_personnel_id,
    wp.employee_id,
    wp.employment_status,
    wp.shift_type,
    wp.base_salary,
    -- This is the current_assignment that should be returned
    jsonb_build_object(
        'id', sa.id,
        'site_id', sa.site_id,
        'shift_type', sa.shift_type
    ) as current_assignment
FROM users u
LEFT JOIN workforce_personnel wp ON wp.user_id = u.id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
WHERE u.phone = '9777777774';

-- Expected: current_assignment should have site_id, not null

-- STEP 3: Check if there are multiple assignments (shouldn't be)
SELECT 
    sa.id,
    sa.personnel_id,
    sa.site_id,
    s.site_name,
    sa.shift_type,
    sa.is_active,
    sa.start_date,
    sa.end_date,
    sa.created_at
FROM site_assignments sa
JOIN workforce_personnel wp ON wp.id = sa.personnel_id
JOIN sites s ON s.id = sa.site_id
WHERE wp.phone = '9777777774'
ORDER BY sa.created_at DESC;

-- Should show ONLY ONE with is_active = true

-- STEP 4: Verify site details are correct
SELECT 
    s.id,
    s.site_name,
    s.address,
    s.latitude,
    s.longitude,
    s.geofence_radius,
    s.is_active
FROM sites s
WHERE s.id = (
    SELECT sa.site_id 
    FROM site_assignments sa
    JOIN workforce_personnel wp ON wp.id = sa.personnel_id
    WHERE wp.phone = '9777777774' AND sa.is_active = true
    LIMIT 1
);

-- =============================================================================
-- DIAGNOSIS: Most likely causes
-- =============================================================================

-- Cause 1: Assignment exists but current_assignment is null in app
-- Fix: User needs to logout and login to refresh the session

-- Cause 2: Multiple active assignments causing confusion
-- Fix: Deactivate old ones, keep only the latest

-- Cause 3: Personnel record doesn't have user_id linked
-- Fix: Link it (we already did this in employee ID fix)

-- =============================================================================
-- FIX: Ensure ONLY ONE active assignment
-- =============================================================================

-- First, find ALL active assignments for Manoj
SELECT 
    sa.id,
    sa.personnel_id,
    s.site_name,
    sa.is_active,
    sa.created_at
FROM site_assignments sa
JOIN workforce_personnel wp ON wp.id = sa.personnel_id
JOIN sites s ON s.id = sa.site_id
WHERE wp.phone = '9777777774'
AND sa.is_active = true
ORDER BY sa.created_at DESC;

-- If there are multiple, keep only the LATEST one:
-- Step 1: Deactivate all except the latest
UPDATE site_assignments
SET is_active = false, end_date = CURRENT_DATE
WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE phone = '9777777774')
AND is_active = true
AND id != (
    SELECT sa.id
    FROM site_assignments sa
    JOIN workforce_personnel wp ON wp.id = sa.personnel_id
    WHERE wp.phone = '9777777774'
    AND sa.is_active = true
    ORDER BY sa.created_at DESC
    LIMIT 1
);

-- Step 2: Ensure the latest one is definitely active
UPDATE site_assignments
SET is_active = true, end_date = NULL
WHERE id = (
    SELECT sa.id
    FROM site_assignments sa
    JOIN workforce_personnel wp ON wp.id = sa.personnel_id
    WHERE wp.phone = '9777777774'
    ORDER BY sa.created_at DESC
    LIMIT 1
);

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

-- This should return exactly what the app needs
SELECT 
    'Dashboard should show this:' as info,
    u.name as user_name,
    wp.employee_id,
    s.site_name as assigned_site,
    sa.shift_type,
    sa.is_active as assignment_active,
    s.geofence_radius,
    s.latitude,
    s.longitude
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '9777777774';

-- If this returns a row, the data is correct.
-- User must logout/login to see it in the app.

-- =============================================================================
-- COMPLETE FIX SCRIPT
-- =============================================================================

DO $$
DECLARE
    v_personnel_id uuid;
    v_latest_assignment_id uuid;
BEGIN
    -- Get personnel ID
    SELECT id INTO v_personnel_id
    FROM workforce_personnel
    WHERE phone = '9777777774';
    
    -- Get the LATEST assignment ID
    SELECT id INTO v_latest_assignment_id
    FROM site_assignments
    WHERE personnel_id = v_personnel_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Deactivate all other assignments
    UPDATE site_assignments
    SET is_active = false, end_date = CURRENT_DATE
    WHERE personnel_id = v_personnel_id
    AND id != v_latest_assignment_id
    AND is_active = true;
    
    -- Ensure latest is active
    UPDATE site_assignments
    SET is_active = true, end_date = NULL
    WHERE id = v_latest_assignment_id;
    
    RAISE NOTICE 'Fixed: Only assignment % is now active', v_latest_assignment_id;
END $$;

-- Verify
SELECT 
    wp.employee_id,
    s.site_name,
    sa.is_active,
    COUNT(*) OVER (PARTITION BY wp.id) as total_active_assignments
FROM site_assignments sa
JOIN workforce_personnel wp ON wp.id = sa.personnel_id
JOIN sites s ON s.id = sa.site_id
WHERE wp.phone = '9777777774'
AND sa.is_active = true;

-- Should show exactly 1 row with total_active_assignments = 1
