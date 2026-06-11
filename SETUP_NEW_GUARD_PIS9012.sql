-- =============================================================================
-- Setup New Guard: PIS-9012 (Phone: 9999999991)
-- Site: Birla Colony
-- This ensures everything is configured correctly from the start
-- =============================================================================

-- STEP 1: Verify the guard was created correctly
SELECT 
    wp.id as personnel_id,
    wp.employee_id,
    wp.name,
    wp.phone,
    wp.user_id,
    wp.employment_status,
    wp.shift_type,
    u.id as user_table_id,
    u.role as user_role
FROM workforce_personnel wp
LEFT JOIN users u ON u.id = wp.user_id
WHERE wp.employee_id = 'PIS-9012' OR wp.phone = '9999999991';

-- Expected: Should show one row with:
-- - employee_id: PIS-9012
-- - phone: 9999999991
-- - user_id: <some-uuid> (not null)
-- - user_table_id: <same-uuid>
-- - employment_status: active

-- STEP 2: Check if user account exists and is linked correctly
SELECT 
    u.id as user_id,
    u.phone,
    u.name,
    u.role,
    u.is_active,
    wp.id as personnel_id,
    wp.employee_id
FROM users u
LEFT JOIN workforce_personnel wp ON wp.user_id = u.id
WHERE u.phone = '9999999991';

-- Expected: Should show user with role='guard' or 'workforce_personnel'
-- and personnel_id should match the ID from STEP 1

-- STEP 3: Check current site assignment
SELECT 
    sa.id as assignment_id,
    sa.personnel_id,
    sa.site_id,
    s.site_name,
    s.address,
    s.geofence_radius,
    sa.shift_type,
    sa.is_active,
    sa.start_date,
    sa.end_date
FROM site_assignments sa
JOIN sites s ON s.id = sa.site_id
WHERE sa.personnel_id = (
    SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012'
);

-- Expected: Should show assignment to Birla Colony with is_active = true

-- =============================================================================
-- FIX 1: If user_id is not linked (common issue)
-- =============================================================================

-- Check if user_id is null
DO $$
DECLARE
    v_user_id uuid;
    v_personnel_id uuid;
BEGIN
    -- Get personnel ID
    SELECT id INTO v_personnel_id
    FROM workforce_personnel
    WHERE employee_id = 'PIS-9012';
    
    -- Check if user_id is null
    IF NOT EXISTS (
        SELECT 1 FROM workforce_personnel 
        WHERE id = v_personnel_id AND user_id IS NOT NULL
    ) THEN
        -- Find or create user
        SELECT id INTO v_user_id
        FROM users
        WHERE phone = '9999999991';
        
        IF v_user_id IS NULL THEN
            -- Create user if doesn't exist
            INSERT INTO users (phone, name, role, is_active)
            SELECT phone, name, 'workforce_personnel', true
            FROM workforce_personnel
            WHERE id = v_personnel_id
            RETURNING id INTO v_user_id;
            
            RAISE NOTICE 'Created user account: %', v_user_id;
        END IF;
        
        -- Link user to personnel
        UPDATE workforce_personnel
        SET user_id = v_user_id
        WHERE id = v_personnel_id;
        
        RAISE NOTICE 'Linked user % to personnel %', v_user_id, v_personnel_id;
    ELSE
        RAISE NOTICE 'User already linked correctly';
    END IF;
END $$;

-- =============================================================================
-- FIX 2: Ensure ONLY ONE active assignment
-- =============================================================================

-- Deactivate any old assignments for this guard
UPDATE site_assignments
SET is_active = false,
    end_date = CURRENT_DATE
WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012')
AND is_active = true
AND id != (
    -- Keep only the LATEST assignment
    SELECT id FROM site_assignments
    WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012')
    ORDER BY created_at DESC
    LIMIT 1
);

-- Ensure the latest assignment is active
UPDATE site_assignments
SET is_active = true,
    end_date = NULL
WHERE id = (
    SELECT id FROM site_assignments
    WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012')
    ORDER BY created_at DESC
    LIMIT 1
);

-- =============================================================================
-- FIX 3: Create assignment if missing
-- =============================================================================

-- Check if assignment to Birla Colony exists
DO $$
DECLARE
    v_personnel_id uuid;
    v_site_id uuid;
BEGIN
    -- Get personnel ID
    SELECT id INTO v_personnel_id
    FROM workforce_personnel
    WHERE employee_id = 'PIS-9012';
    
    -- Get Birla Colony site ID
    SELECT id INTO v_site_id
    FROM sites
    WHERE site_name ILIKE '%Birla%Colony%'
    LIMIT 1;
    
    -- Create assignment if doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM site_assignments
        WHERE personnel_id = v_personnel_id
        AND site_id = v_site_id
        AND is_active = true
    ) THEN
        INSERT INTO site_assignments (
            personnel_id,
            site_id,
            shift_type,
            start_date,
            is_active
        ) VALUES (
            v_personnel_id,
            v_site_id,
            'day',  -- Change to 'night' if needed
            CURRENT_DATE,
            true
        );
        
        RAISE NOTICE 'Created assignment to Birla Colony';
    ELSE
        RAISE NOTICE 'Assignment already exists';
    END IF;
END $$;

-- =============================================================================
-- FIX 4: Ensure Birla Colony has proper geofence
-- =============================================================================

-- Set generous geofence radius (300m to avoid GPS issues)
UPDATE sites
SET geofence_radius = GREATEST(geofence_radius, 300)
WHERE site_name ILIKE '%Birla%Colony%';

-- =============================================================================
-- FIX 5: Sync with legacy guards table
-- =============================================================================

-- Ensure guards table has matching record
INSERT INTO guards (
    id,
    user_id,
    aadhaar_number,
    pan_number,
    address,
    photo_url,
    base_salary,
    joining_date,
    shift_type,
    emergency_contact_name,
    emergency_contact_phone,
    bank_account_number,
    bank_ifsc,
    bank_name,
    employment_status
)
SELECT 
    wp.id,
    wp.user_id,
    wp.aadhaar_number,
    wp.pan_number,
    wp.address,
    wp.photo_url,
    wp.base_salary,
    wp.joining_date,
    wp.shift_type,
    wp.emergency_contact_name,
    wp.emergency_contact_phone,
    wp.bank_account_number,
    wp.bank_ifsc,
    wp.bank_name,
    wp.employment_status
FROM workforce_personnel wp
WHERE wp.employee_id = 'PIS-9012'
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    employment_status = EXCLUDED.employment_status;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

-- This should show complete, correct setup
SELECT 
    '✅ Guard Setup Complete' as status,
    u.phone,
    u.role as user_role,
    wp.id as personnel_id,
    wp.employee_id,
    wp.name,
    wp.employment_status,
    s.site_name as assigned_site,
    s.geofence_radius,
    s.latitude,
    s.longitude,
    sa.shift_type,
    sa.is_active as assignment_active,
    sa.start_date
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '9999999991';

-- Expected output:
-- phone: 9999999991
-- employee_id: PIS-9012
-- name: <guard name>
-- assigned_site: Birla Colony
-- geofence_radius: 300
-- assignment_active: true

-- =============================================================================
-- OPTIONAL: Check for any issues
-- =============================================================================

-- Check 1: Duplicate personnel records
SELECT 
    'WARNING: Duplicate records' as issue,
    COUNT(*) as count
FROM workforce_personnel
WHERE phone = '9999999991' OR employee_id = 'PIS-9012'
HAVING COUNT(*) > 1;

-- Check 2: Multiple active assignments
SELECT 
    'WARNING: Multiple active assignments' as issue,
    COUNT(*) as count
FROM site_assignments sa
WHERE sa.personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012')
AND sa.is_active = true
HAVING COUNT(*) > 1;

-- Check 3: User not linked
SELECT 
    'ERROR: User not linked' as issue,
    wp.employee_id,
    wp.phone
FROM workforce_personnel wp
WHERE wp.employee_id = 'PIS-9012'
AND wp.user_id IS NULL;

-- Check 4: No active assignment
SELECT 
    'WARNING: No active assignment' as issue,
    wp.employee_id,
    wp.phone
FROM workforce_personnel wp
WHERE wp.employee_id = 'PIS-9012'
AND NOT EXISTS (
    SELECT 1 FROM site_assignments sa
    WHERE sa.personnel_id = wp.id AND sa.is_active = true
);

-- If any of these return rows, there's an issue!

-- =============================================================================
-- TESTING CHECKLIST
-- =============================================================================

-- After running this script, test:
-- [ ] Guard can login with phone 9999999991
-- [ ] Profile shows PIS-9012 (not PIS-E000 or other)
-- [ ] Dashboard shows "Birla Colony" assignment
-- [ ] Attendance screen loads with map
-- [ ] Geofence circle shows (300m)
-- [ ] Check-in works when within 300m
-- [ ] Error message shows distance if outside

