-- =============================================================================
-- PERMANENT FIX: Employee ID Mismatch Issue
-- Prevents duplicate records and ensures correct user linking
-- =============================================================================

-- =============================================================================
-- PART 1: Clean Up ALL Existing Issues
-- =============================================================================

-- Step 1: Find ALL duplicate personnel records (same phone or user_id)
CREATE TEMP TABLE duplicate_personnel AS
SELECT 
    phone,
    user_id,
    COUNT(*) as record_count,
    ARRAY_AGG(id ORDER BY created_at DESC) as personnel_ids,
    ARRAY_AGG(employee_id ORDER BY created_at DESC) as employee_ids,
    ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates
FROM workforce_personnel
WHERE employment_status = 'active'
GROUP BY phone, user_id
HAVING COUNT(*) > 1;

-- Show duplicates (for review)
SELECT 
    phone,
    ARRAY_TO_STRING(employee_ids, ', ') as all_employee_ids,
    record_count as duplicate_count
FROM duplicate_personnel;

-- Step 2: For each duplicate set, keep the LATEST record with assignment
DO $$
DECLARE
    dup_record RECORD;
    keep_id uuid;
    deactivate_ids uuid[];
BEGIN
    FOR dup_record IN SELECT * FROM duplicate_personnel LOOP
        -- Find which record has an active assignment
        SELECT sa.personnel_id INTO keep_id
        FROM site_assignments sa
        WHERE sa.personnel_id = ANY(dup_record.personnel_ids)
        AND sa.is_active = true
        ORDER BY sa.created_at DESC
        LIMIT 1;
        
        -- If no assignment found, keep the latest record
        IF keep_id IS NULL THEN
            keep_id := dup_record.personnel_ids[1];
        END IF;
        
        -- All others should be deactivated
        deactivate_ids := ARRAY_REMOVE(dup_record.personnel_ids, keep_id);
        
        -- Deactivate duplicate records
        UPDATE workforce_personnel
        SET employment_status = 'terminated',
            user_id = NULL
        WHERE id = ANY(deactivate_ids);
        
        -- Ensure kept record has user_id
        IF dup_record.user_id IS NOT NULL THEN
            UPDATE workforce_personnel
            SET user_id = dup_record.user_id
            WHERE id = keep_id;
        END IF;
        
        RAISE NOTICE 'Kept %, deactivated %', keep_id, deactivate_ids;
    END LOOP;
END $$;

-- =============================================================================
-- PART 2: Add Database Constraints (Prevents Future Issues)
-- =============================================================================

-- Constraint 1: Only ONE active personnel per phone number
DROP INDEX IF EXISTS idx_unique_phone_active;
CREATE UNIQUE INDEX idx_unique_phone_active 
ON workforce_personnel(phone) 
WHERE employment_status = 'active';

-- Constraint 2: Only ONE active personnel per user_id
DROP INDEX IF EXISTS idx_unique_user_id_active;
CREATE UNIQUE INDEX idx_unique_user_id_active 
ON workforce_personnel(user_id) 
WHERE employment_status = 'active' AND user_id IS NOT NULL;

-- Constraint 3: Unique employee_id globally
ALTER TABLE workforce_personnel
DROP CONSTRAINT IF EXISTS unique_employee_id;

ALTER TABLE workforce_personnel
ADD CONSTRAINT unique_employee_id UNIQUE (employee_id);

-- Constraint 4: Phone must match user's phone
-- (This is a soft constraint via trigger, not enforced at DB level)

-- =============================================================================
-- PART 3: Create Trigger to Auto-Link User on Personnel Creation
-- =============================================================================

-- Function to automatically link or create user when personnel is created
CREATE OR REPLACE FUNCTION auto_link_user_to_personnel()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- If user_id is already set, we're good
    IF NEW.user_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Find existing user by phone
    SELECT id INTO v_user_id
    FROM users
    WHERE phone = NEW.phone
    AND is_active = true;
    
    -- If user exists, link it
    IF v_user_id IS NOT NULL THEN
        NEW.user_id := v_user_id;
        RAISE NOTICE 'Auto-linked personnel % to existing user %', NEW.employee_id, v_user_id;
    ELSE
        -- Create new user account
        INSERT INTO users (phone, name, role, is_active)
        VALUES (NEW.phone, NEW.name, 'workforce_personnel', true)
        RETURNING id INTO v_user_id;
        
        NEW.user_id := v_user_id;
        RAISE NOTICE 'Created user % for personnel %', v_user_id, NEW.employee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_link_user ON workforce_personnel;

-- Create trigger that runs BEFORE INSERT
CREATE TRIGGER trg_auto_link_user
BEFORE INSERT ON workforce_personnel
FOR EACH ROW
EXECUTE FUNCTION auto_link_user_to_personnel();

-- =============================================================================
-- PART 4: Create Function to Prevent Duplicate User Links
-- =============================================================================

-- Function to validate user_id changes
CREATE OR REPLACE FUNCTION validate_user_link()
RETURNS TRIGGER AS $$
BEGIN
    -- If user_id is being set/changed
    IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
        -- Check if another ACTIVE personnel already has this user_id
        IF EXISTS (
            SELECT 1 FROM workforce_personnel
            WHERE user_id = NEW.user_id
            AND id != NEW.id
            AND employment_status = 'active'
        ) THEN
            RAISE EXCEPTION 'user_id % is already linked to another active personnel', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_validate_user_link ON workforce_personnel;

-- Create trigger for UPDATE operations
CREATE TRIGGER trg_validate_user_link
BEFORE UPDATE ON workforce_personnel
FOR EACH ROW
EXECUTE FUNCTION validate_user_link();

-- =============================================================================
-- PART 5: Add Function to Auto-Deactivate Previous Assignments
-- =============================================================================

-- This already exists, but let's ensure it's working correctly
CREATE OR REPLACE FUNCTION deactivate_previous_site_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this is a new active assignment
    IF NEW.is_active = true THEN
        -- Deactivate all other active assignments for this personnel
        UPDATE site_assignments
        SET is_active = false,
            end_date = COALESCE(end_date, CURRENT_DATE)
        WHERE personnel_id = NEW.personnel_id
        AND id != NEW.id
        AND is_active = true;
        
        RAISE NOTICE 'Deactivated previous assignments for personnel %', NEW.personnel_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_deactivate_prev_site_assignment ON site_assignments;

CREATE TRIGGER trg_deactivate_prev_site_assignment
BEFORE INSERT OR UPDATE ON site_assignments
FOR EACH ROW
EXECUTE FUNCTION deactivate_previous_site_assignments();

-- =============================================================================
-- PART 6: Verification Queries
-- =============================================================================

-- Check 1: Any remaining duplicates?
SELECT 
    'Duplicate phones' as issue,
    phone,
    COUNT(*) as count,
    ARRAY_AGG(employee_id) as employee_ids
FROM workforce_personnel
WHERE employment_status = 'active'
GROUP BY phone
HAVING COUNT(*) > 1;

-- Check 2: Any personnel without user_id?
SELECT 
    'Missing user_id' as issue,
    employee_id,
    phone,
    name
FROM workforce_personnel
WHERE employment_status = 'active'
AND user_id IS NULL;

-- Check 3: Any user_id linked to multiple personnel?
SELECT 
    'Duplicate user_id' as issue,
    user_id,
    COUNT(*) as count,
    ARRAY_AGG(employee_id) as employee_ids
FROM workforce_personnel
WHERE employment_status = 'active'
AND user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Check 4: Any personnel with multiple active assignments?
SELECT 
    'Multiple assignments' as issue,
    wp.employee_id,
    wp.phone,
    COUNT(sa.id) as assignment_count,
    ARRAY_AGG(s.site_name) as sites
FROM workforce_personnel wp
JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
JOIN sites s ON s.id = sa.site_id
WHERE wp.employment_status = 'active'
GROUP BY wp.id, wp.employee_id, wp.phone
HAVING COUNT(sa.id) > 1;

-- All above queries should return NO rows!

-- =============================================================================
-- PART 7: Final Cleanup - Remove orphaned users
-- =============================================================================

-- Find users not linked to any personnel (optional cleanup)
SELECT 
    u.id,
    u.phone,
    u.name,
    u.role,
    u.created_at
FROM users u
WHERE u.role IN ('guard', 'workforce_personnel')
AND NOT EXISTS (
    SELECT 1 FROM workforce_personnel wp WHERE wp.user_id = u.id
)
AND NOT EXISTS (
    SELECT 1 FROM guards g WHERE g.user_id = u.id
);

-- Optional: Deactivate orphaned users (be careful!)
-- UPDATE users
-- SET is_active = false
-- WHERE role IN ('guard', 'workforce_personnel')
-- AND NOT EXISTS (SELECT 1 FROM workforce_personnel wp WHERE wp.user_id = users.id)
-- AND NOT EXISTS (SELECT 1 FROM guards g WHERE g.user_id = users.id);

-- =============================================================================
-- TESTING: Create a test personnel to verify triggers work
-- =============================================================================

-- Test 1: Insert without user_id - should auto-create user
-- INSERT INTO workforce_personnel (
--     category_id,
--     employee_id,
--     name,
--     phone,
--     base_salary,
--     shift_type,
--     employment_status
-- ) VALUES (
--     (SELECT id FROM workforce_categories WHERE prefix_code = 'PIS' LIMIT 1),
--     'PIS-TEST1',
--     'Test Guard',
--     '9999999999',
--     15000,
--     'day',
--     'active'
-- );

-- Check: Should have user_id populated
-- SELECT employee_id, phone, user_id FROM workforce_personnel WHERE employee_id = 'PIS-TEST1';

-- Test 2: Try to insert duplicate phone - should fail
-- INSERT INTO workforce_personnel (
--     category_id,
--     employee_id,
--     name,
--     phone,
--     base_salary,
--     shift_type,
--     employment_status
-- ) VALUES (
--     (SELECT id FROM workforce_categories WHERE prefix_code = 'PIS' LIMIT 1),
--     'PIS-TEST2',
--     'Test Guard 2',
--     '9999999999',  -- Same phone as TEST1
--     15000,
--     'day',
--     'active'
-- );
-- Expected: ERROR - duplicate key value violates unique constraint

-- Clean up test data
-- DELETE FROM workforce_personnel WHERE employee_id LIKE 'PIS-TEST%';

-- =============================================================================
-- SUMMARY
-- =============================================================================

SELECT 
    'PERMANENT FIX APPLIED' as status,
    'The following protections are now active:' as message
UNION ALL SELECT 
    '1', 'Unique constraint: one active personnel per phone'
UNION ALL SELECT 
    '2', 'Unique constraint: one active personnel per user_id'
UNION ALL SELECT 
    '3', 'Unique constraint: employee_id must be globally unique'
UNION ALL SELECT 
    '4', 'Auto-trigger: user_id auto-linked/created on personnel insert'
UNION ALL SELECT 
    '5', 'Auto-trigger: previous assignments auto-deactivated'
UNION ALL SELECT 
    '6', 'Validation: prevents duplicate user_id links';

-- =============================================================================
-- NEXT STEPS FOR EXISTING GUARDS
-- =============================================================================

-- All existing guards should now be clean
-- To verify any specific guard:
-- SELECT 
--     wp.employee_id,
--     wp.phone,
--     u.id as user_id,
--     s.site_name,
--     sa.is_active
-- FROM workforce_personnel wp
-- JOIN users u ON u.id = wp.user_id
-- LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
-- LEFT JOIN sites s ON s.id = sa.site_id
-- WHERE wp.phone = '<PHONE_NUMBER>';

