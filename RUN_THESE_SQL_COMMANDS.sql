-- =============================================================================
-- IMMEDIATE FIX FOR MANOJ'S ASSIGNMENT & GEOFENCE ISSUES
-- Copy and paste these commands in Supabase SQL Editor
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: CHECK IF ASSIGNMENT EXISTS (Run this first)
-- ═══════════════════════════════════════════════════════════════════════════

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
ORDER BY sa.created_at DESC
LIMIT 1;

-- Expected: Should show 1 row with Birla Colony and is_active = true
-- If no results or is_active = false, go to STEP 4

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: INCREASE GEOFENCE RADIUS (Run this always)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE sites 
SET geofence_radius = 200
WHERE site_name ILIKE '%Birla%Colony%' 
   OR address ILIKE '%Birla%Colony%';

-- Verify the update:
SELECT site_name, address, latitude, longitude, geofence_radius 
FROM sites 
WHERE site_name ILIKE '%Birla%Colony%' OR address ILIKE '%Birla%Colony%';

-- Expected: geofence_radius should now be 200

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: VERIFY THE QUERY THAT THE APP USES
-- ═══════════════════════════════════════════════════════════════════════════

-- This is what fetchUserProfile() runs to get current_assignment
SELECT sa.id, sa.site_id, sa.shift_type
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
WHERE wp.user_id = (
    SELECT user_id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1
)
AND sa.is_active = true
LIMIT 1;

-- Expected: Should return 1 row with site_id and shift_type
-- If no results, the assignment is missing or inactive - go to STEP 4

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: CREATE ASSIGNMENT IF MISSING (Only run if STEP 1 showed no results)
-- ═══════════════════════════════════════════════════════════════════════════

-- First, verify Manoj and Birla Colony exist:
SELECT 'Personnel:', id, employee_id, name FROM workforce_personnel WHERE employee_id = 'PIS-9004'
UNION ALL
SELECT 'Site:', id, site_name, address FROM sites WHERE site_name ILIKE '%Birla%Colony%' LIMIT 1;

-- If both exist, create the assignment:
INSERT INTO site_assignments (site_id, personnel_id, shift_type, start_date, is_active)
SELECT 
    (SELECT id FROM sites WHERE site_name ILIKE '%Birla%Colony%' LIMIT 1),
    (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1),
    'night',
    CURRENT_DATE,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM site_assignments sa
    JOIN workforce_personnel wp ON sa.personnel_id = wp.id
    WHERE wp.employee_id = 'PIS-9004' AND sa.is_active = true
)
RETURNING id, site_id, personnel_id, shift_type, is_active;

-- Expected: Should insert 1 row and return the new assignment

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: REACTIVATE ASSIGNMENT IF INACTIVE (Only if is_active = false)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE site_assignments
SET is_active = true, end_date = NULL
WHERE id = (
    SELECT sa.id FROM site_assignments sa
    JOIN workforce_personnel wp ON sa.personnel_id = wp.id
    WHERE wp.employee_id = 'PIS-9004'
    ORDER BY sa.created_at DESC
    LIMIT 1
)
AND is_active = false
RETURNING id, site_id, personnel_id, shift_type, is_active;

-- Expected: If assignment was inactive, it's now reactivated

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: VERIFY COORDINATES ARE CORRECT (Important!)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    site_name, 
    address,
    latitude,
    longitude,
    geofence_radius,
    CONCAT('https://www.google.com/maps?q=', latitude, ',', longitude) as google_maps_link
FROM sites 
WHERE site_name ILIKE '%Birla%Colony%';

-- Copy the google_maps_link and open it in browser
-- Verify the pin is at the correct location
-- If not, update coordinates:

-- UPDATE sites
-- SET latitude = YOUR_CORRECT_LAT,
--     longitude = YOUR_CORRECT_LON
-- WHERE site_name ILIKE '%Birla%Colony%';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: FINAL VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- This should show complete assignment details:
SELECT 
    wp.employee_id,
    wp.name as personnel_name,
    wp.phone,
    s.site_name,
    s.address,
    s.latitude,
    s.longitude,
    s.geofence_radius,
    sa.shift_type,
    sa.start_date,
    sa.is_active,
    CASE 
        WHEN sa.is_active THEN '✅ Active'
        ELSE '❌ Inactive'
    END as status
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004'
  AND sa.is_active = true;

-- Expected output:
-- employee_id: PIS-9004
-- personnel_name: Manoj Thakur
-- site_name: Birla Colony (or similar)
-- geofence_radius: 200
-- is_active: true
-- status: ✅ Active

-- ═══════════════════════════════════════════════════════════════════════════
-- AFTER RUNNING THESE SQL COMMANDS
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ✅ Ask Manoj to PULL DOWN TO REFRESH on the Guard Home screen
--    OR ask him to LOGOUT and LOGIN AGAIN

-- 2. ✅ The Birla Colony site should now appear in his dashboard

-- 3. ✅ When he goes to the site location, he should be able to check in
--    (within 200 meters of the site coordinates)

-- 4. ✅ If check-in still fails, the error message will show:
--    - Exact distance from site
--    - User's GPS coordinates
--    - Site's GPS coordinates
--    This will help you determine if you need to increase the radius further
--    or fix the site coordinates

-- ═══════════════════════════════════════════════════════════════════════════
-- TROUBLESHOOTING
-- ═══════════════════════════════════════════════════════════════════════════

-- If assignment still not showing after refresh:
-- Check if user_id is linked correctly:
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.phone,
    wp.id as personnel_id,
    wp.employee_id
FROM users u
LEFT JOIN workforce_personnel wp ON wp.user_id = u.id
WHERE u.phone = 'MANOJ_PHONE_NUMBER';  -- Replace with Manoj's actual phone

-- If check-in fails with "outside geofence" but user is at location:
-- 1. Check the distance in the error message
-- 2. If close (like 110m with 200m radius), might be GPS accuracy issue
-- 3. If far (like 500m+), coordinates are probably wrong
-- 4. To increase radius further:
UPDATE sites SET geofence_radius = 300 WHERE site_name ILIKE '%Birla%Colony%';

