-- =============================================================================
-- Employee ID Mismatch Investigation & Fix
-- Problem: Admin shows PIS-9004, but profile shows PIS-E000
-- =============================================================================

-- STEP 1: Find ALL records for Manoj Thakur in workforce_personnel
SELECT 
    id,
    employee_id,
    name,
    phone,
    user_id,
    employment_status,
    created_at
FROM workforce_personnel
WHERE name ILIKE '%Manoj%Thakur%' OR phone = '9777777774'
ORDER BY created_at DESC;

-- Expected: Should show if there are duplicate records

-- STEP 2: Find which record is linked to the user account
SELECT 
    u.id as user_id,
    u.phone,
    u.role,
    wp.id as personnel_id,
    wp.employee_id,
    wp.name,
    wp.employment_status,
    wp.created_at
FROM users u
LEFT JOIN workforce_personnel wp ON wp.user_id = u.id
WHERE u.phone = '9777777774' OR u.name ILIKE '%Manoj%Thakur%'
ORDER BY wp.created_at DESC;

-- This shows which personnel record is actually linked to the login

-- STEP 3: Check site_assignments for ALL Manoj records
SELECT 
    wp.id as personnel_id,
    wp.employee_id,
    wp.name,
    sa.id as assignment_id,
    sa.site_id,
    s.site_name,
    sa.is_active,
    sa.created_at
FROM workforce_personnel wp
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id
LEFT JOIN sites s ON s.id = sa.site_id
WHERE wp.name ILIKE '%Manoj%Thakur%' OR wp.phone = '9777777774'
ORDER BY wp.created_at DESC, sa.created_at DESC;

-- STEP 4: Check legacy guards table
SELECT 
    g.id,
    g.user_id,
    u.name,
    u.phone,
    g.employment_status,
    g.created_at
FROM guards g
JOIN users u ON u.id = g.user_id
WHERE u.name ILIKE '%Manoj%Thakur%' OR u.phone = '9777777774'
ORDER BY g.created_at DESC;

-- =============================================================================
-- DIAGNOSIS RESULTS
-- =============================================================================

-- If you see TWO workforce_personnel records:
-- Option A: PIS-9004 (correct one with assignment)
-- Option B: PIS-E000 (wrong one, might be linked to user)
--
-- The problem: user.workforce_personnel_id points to PIS-E000 instead of PIS-9004

-- =============================================================================
-- FIX 1: Update user_id link to point to the CORRECT record
-- =============================================================================

-- First, identify the CORRECT personnel record (the one with PIS-9004 and assignment)
-- Then update it to link to the user account

-- Find the user_id
SELECT id, phone, name FROM users WHERE phone = '9777777774';

-- Find the CORRECT personnel record (PIS-9004 with assignment)
SELECT 
    wp.id as personnel_id,
    wp.employee_id,
    wp.user_id,
    COUNT(sa.id) as assignment_count
FROM workforce_personnel wp
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
WHERE wp.name ILIKE '%Manoj%Thakur%'
GROUP BY wp.id, wp.employee_id, wp.user_id
ORDER BY assignment_count DESC;

-- Update the CORRECT record to link to user (if it's not already)
-- Replace <USER_ID> and <CORRECT_PERSONNEL_ID> with actual values from above

-- UPDATE workforce_personnel
-- SET user_id = '<USER_ID>'
-- WHERE id = '<CORRECT_PERSONNEL_ID>' AND employee_id = 'PIS-9004';

-- =============================================================================
-- FIX 2: Delete or deactivate the WRONG duplicate record
-- =============================================================================

-- If there's a duplicate PIS-E000 record with no assignments:

-- Option A: Delete it (if no data associated)
-- DELETE FROM workforce_personnel 
-- WHERE employee_id = 'PIS-E000' 
-- AND name ILIKE '%Manoj%Thakur%'
-- AND NOT EXISTS (
--     SELECT 1 FROM site_assignments WHERE personnel_id = workforce_personnel.id
-- );

-- Option B: Deactivate it (safer)
-- UPDATE workforce_personnel
-- SET employment_status = 'terminated', user_id = NULL
-- WHERE employee_id = 'PIS-E000' 
-- AND name ILIKE '%Manoj%Thakur%';

-- =============================================================================
-- FIX 3: Sync guards table if needed
-- =============================================================================

-- Ensure guards table has the correct record with matching ID
SELECT 
    g.id,
    g.user_id,
    wp.id as workforce_id,
    wp.employee_id
FROM guards g
JOIN workforce_personnel wp ON wp.user_id = g.user_id
WHERE wp.name ILIKE '%Manoj%Thakur%';

-- If guards table has wrong ID, update it:
-- UPDATE guards
-- SET id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' AND name ILIKE '%Manoj%Thakur%')
-- WHERE user_id = (SELECT user_id FROM workforce_personnel WHERE employee_id = 'PIS-9004' AND name ILIKE '%Manoj%Thakur%');

-- =============================================================================
-- STEP 5: FINAL VERIFICATION
-- =============================================================================

-- This should show ONE clean record
SELECT 
    u.phone,
    u.role,
    wp.id as personnel_id,
    wp.employee_id,
    wp.name,
    wp.user_id,
    s.site_name,
    sa.is_active as assignment_active
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '9777777774';

-- Expected result:
-- phone: 9777777774
-- employee_id: PIS-9004
-- name: Manoj Thakur
-- site_name: Birla Colony (or similar)
-- assignment_active: true

-- =============================================================================
-- COMPLETE FIX SCRIPT (Run after identifying which record to keep)
-- =============================================================================

-- Scenario: PIS-9004 is correct, PIS-E000 is duplicate
-- Assuming user phone is 9777777774

-- Step 1: Get IDs
DO $$
DECLARE
    v_user_id uuid;
    v_correct_personnel_id uuid;
    v_wrong_personnel_id uuid;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM users WHERE phone = '9777777774';
    
    -- Get correct personnel ID (PIS-9004 with assignment)
    SELECT wp.id INTO v_correct_personnel_id
    FROM workforce_personnel wp
    WHERE wp.employee_id = 'PIS-9004' 
    AND wp.name ILIKE '%Manoj%Thakur%';
    
    -- Get wrong personnel ID (PIS-E000 or unlinked)
    SELECT wp.id INTO v_wrong_personnel_id
    FROM workforce_personnel wp
    WHERE wp.employee_id LIKE 'PIS-E%'
    AND wp.name ILIKE '%Manoj%Thakur%'
    AND wp.id != v_correct_personnel_id;
    
    -- Link correct record to user
    UPDATE workforce_personnel
    SET user_id = v_user_id
    WHERE id = v_correct_personnel_id;
    
    -- Deactivate wrong record
    IF v_wrong_personnel_id IS NOT NULL THEN
        UPDATE workforce_personnel
        SET employment_status = 'terminated', user_id = NULL
        WHERE id = v_wrong_personnel_id;
    END IF;
    
    RAISE NOTICE 'Fixed: Linked user % to personnel %', v_user_id, v_correct_personnel_id;
END $$;

-- =============================================================================
-- After running the fix, ask Manoj to logout and login
-- The profile should now show PIS-9004
-- =============================================================================
