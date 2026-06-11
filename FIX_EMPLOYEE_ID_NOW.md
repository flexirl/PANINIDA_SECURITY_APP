# 🔧 Fix Employee ID Mismatch - PIS-9004 vs PIS-E000

## The Problem

**What you see:**
- Admin panel/Supabase: Shows `PIS-9004` for Manoj Thakur ✓
- Manoj's profile in app: Shows `PIS-E000` ❌

**Why this happens:**
- There are **TWO personnel records** for Manoj in the database
- The user account is linked to the WRONG record (PIS-E000)
- The site assignment is on the CORRECT record (PIS-9004)
- Result: Profile shows wrong ID, assignment doesn't appear

## Quick Diagnosis

Run this in Supabase SQL Editor:

```sql
-- Check ALL Manoj records
SELECT 
    wp.id,
    wp.employee_id,
    wp.user_id,
    wp.name,
    sa.site_id,
    s.site_name
FROM workforce_personnel wp
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE wp.name ILIKE '%Manoj%Thakur%' OR wp.phone = '9777777774'
ORDER BY wp.created_at;
```

**Expected result:** You'll see TWO rows:
1. `PIS-E000` - user_id = `<some-uuid>`, site_name = `NULL` ❌
2. `PIS-9004` - user_id = `NULL` or different, site_name = `Birla Colony` ✓

## The Fix (3 Simple Queries)

### Step 1: Link User to Correct Record

```sql
-- Update PIS-9004 to link to the user account
UPDATE workforce_personnel
SET user_id = (
    SELECT user_id 
    FROM workforce_personnel 
    WHERE phone = '9777777774' 
    AND user_id IS NOT NULL 
    LIMIT 1
)
WHERE employee_id = 'PIS-9004' 
AND name ILIKE '%Manoj%Thakur%';
```

### Step 2: Deactivate Wrong Record

```sql
-- Deactivate PIS-E000 record
UPDATE workforce_personnel
SET employment_status = 'terminated',
    user_id = NULL
WHERE employee_id LIKE 'PIS-E%'
AND name ILIKE '%Manoj%Thakur%'
AND employee_id != 'PIS-9004';
```

### Step 3: Verify Fix

```sql
-- Should show ONE record with PIS-9004
SELECT 
    u.phone,
    wp.employee_id,
    wp.name,
    s.site_name,
    sa.is_active
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '9777777774';
```

**Expected output:**
```
phone: 9777777774
employee_id: PIS-9004  ← Should be this, not PIS-E000
name: Manoj Thakur
site_name: Birla Colony
is_active: true
```

## Test It Works

1. **Ask Manoj to logout and login**
2. **Check profile screen** → Should now show `PIS-9004`
3. **Check dashboard** → Should show Birla Colony assignment
4. **Check attendance** → Should work correctly

## Why This Happened

When creating personnel, two possible scenarios cause duplicates:

### Scenario 1: Guard Added Twice
- First add creates PIS-E000 (error in ID generation)
- Second add creates PIS-9004 (correct ID)
- User account linked to first record

### Scenario 2: Migration Issue
- Legacy guard migrated → Creates one record
- New personnel added → Creates another record
- IDs don't match

## Prevention

To prevent this in the future, add a unique constraint:

```sql
-- Add constraint: one personnel per user
ALTER TABLE workforce_personnel
ADD CONSTRAINT unique_user_id_active 
UNIQUE (user_id) 
WHERE employment_status = 'active';

-- Add constraint: unique phone for active personnel
ALTER TABLE workforce_personnel
ADD CONSTRAINT unique_phone_active
UNIQUE (phone)
WHERE employment_status = 'active';
```

## Complete Fix Script (All-in-One)

If you want to run everything at once:

```sql
-- Complete fix for Manoj's duplicate records
DO $$
DECLARE
    v_user_id uuid;
    v_correct_id uuid;
    v_wrong_id uuid;
BEGIN
    -- Find user and IDs
    SELECT 
        user_id INTO v_user_id
    FROM workforce_personnel 
    WHERE phone = '9777777774' 
    AND user_id IS NOT NULL 
    LIMIT 1;
    
    SELECT id INTO v_correct_id
    FROM workforce_personnel
    WHERE employee_id = 'PIS-9004';
    
    SELECT id INTO v_wrong_id
    FROM workforce_personnel
    WHERE employee_id LIKE 'PIS-E%'
    AND name ILIKE '%Manoj%Thakur%';
    
    -- Fix: Link user to correct record
    UPDATE workforce_personnel
    SET user_id = v_user_id
    WHERE id = v_correct_id;
    
    -- Deactivate wrong record
    UPDATE workforce_personnel
    SET employment_status = 'terminated',
        user_id = NULL
    WHERE id = v_wrong_id;
    
    -- Also fix guards table if needed
    UPDATE guards
    SET id = v_correct_id
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Fixed! Linked user to PIS-9004, deactivated duplicate';
END $$;

-- Verify
SELECT 
    u.phone,
    wp.employee_id,
    wp.name,
    s.site_name
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '9777777774';
```

## Troubleshooting

### Profile still shows PIS-E000

**Check:** Did Manoj logout and login?
```bash
# Must logout and login for profile to refresh
```

### Both records have user_id

**Fix:** NULL out the wrong one first:
```sql
UPDATE workforce_personnel
SET user_id = NULL
WHERE employee_id LIKE 'PIS-E%'
AND name ILIKE '%Manoj%Thakur%';
```

Then re-run Step 1.

### Can't find PIS-9004

**Check:** Maybe the employee_id is different:
```sql
SELECT employee_id, name, phone, created_at
FROM workforce_personnel
WHERE name ILIKE '%Manoj%Thakur%' OR phone = '9777777774'
ORDER BY created_at;
```

Use the correct employee_id from the record that has the site assignment.

## Summary

**Root Cause:** Duplicate personnel records, user linked to wrong one  
**Fix Time:** 2 minutes (3 SQL queries)  
**Files:** FIX_EMPLOYEE_ID_MISMATCH.sql (detailed), this file (quick)  
**Test:** Logout/login, profile should show PIS-9004  

Run the Complete Fix Script above - it handles everything automatically! 🎯
