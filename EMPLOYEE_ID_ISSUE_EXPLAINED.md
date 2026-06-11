# Employee ID Mismatch Issue - Visual Explanation

## The Problem

```
DATABASE (Supabase):              APP (Manoj's Profile):
┌─────────────────────┐          ┌─────────────────────┐
│ employee_id         │          │ Employee ID:        │
│ PIS-9004 ✓          │          │ PIS-E000 ❌         │
│                     │          │                     │
│ Assignment:         │          │ Assignment:         │
│ Birla Colony ✓      │          │ No site ❌          │
└─────────────────────┘          └─────────────────────┘
```

## Root Cause: Duplicate Records

### What's in the Database

```
workforce_personnel table:
┌──────────────┬─────────────┬──────────┬──────────────┬──────────────┐
│ id           │ employee_id │ name     │ user_id      │ site_assignment│
├──────────────┼─────────────┼──────────┼──────────────┼──────────────┤
│ uuid-1111... │ PIS-E000    │ Manoj... │ user-abc...  │ NULL ❌      │
│ uuid-2222... │ PIS-9004    │ Manoj... │ NULL         │ Birla Colony✓│
└──────────────┴─────────────┴──────────┴──────────────┴──────────────┘
        ↑                                      ↑
  WRONG RECORD                           CORRECT RECORD
  (Linked to user login)                 (Has the assignment)
```

### The Login Flow

```
Step 1: User Login
Phone: 9777777774
     ↓
Step 2: Auth finds user
users table → user_id: user-abc...
     ↓
Step 3: App fetches profile
SELECT * FROM workforce_personnel WHERE user_id = 'user-abc...'
     ↓
Step 4: Gets WRONG record
Returns: PIS-E000 (uuid-1111...)
     ↓
Step 5: App shows profile
Displays: PIS-E000 ❌
     ↓
Step 6: App tries to find assignment
SELECT * FROM site_assignments WHERE personnel_id = 'uuid-1111...'
     ↓
Step 7: No assignment found
Returns: NULL ❌
```

### Why Assignment Doesn't Show

```
site_assignments table:
┌──────────────┬──────────────┬────────────┐
│ personnel_id │ site_id      │ is_active  │
├──────────────┼──────────────┼────────────┤
│ uuid-2222... │ birla-site...│ true ✓     │
└──────────────┴──────────────┴────────────┘
      ↑
   Points to PIS-9004 record
   
But user is linked to PIS-E000 record!
So app can't find the assignment.
```

## The Solution

### Fix: Update user_id Links

```
BEFORE FIX:
workforce_personnel:
┌─────────┬─────────┬─────────────┐
│ emp_id  │ user_id │ assignment  │
├─────────┼─────────┼─────────────┤
│ PIS-E000│ abc...  │ NULL        │ ← User linked here ❌
│ PIS-9004│ NULL    │ Birla       │ ← Assignment here ✓
└─────────┴─────────┴─────────────┘

AFTER FIX:
workforce_personnel:
┌─────────┬─────────┬─────────────┐
│ emp_id  │ user_id │ assignment  │
├─────────┼─────────┼─────────────┤
│ PIS-E000│ NULL    │ NULL        │ ← Deactivated
│ PIS-9004│ abc...  │ Birla       │ ← User linked here ✓
└─────────┴─────────┴─────────────┘
```

### SQL Fix Breakdown

```sql
-- STEP 1: Link user to CORRECT record
UPDATE workforce_personnel
SET user_id = '<user-abc...>'  -- Move user link
WHERE employee_id = 'PIS-9004'; -- To correct record

-- Result:
-- PIS-9004 now has user_id ✓
-- PIS-E000 still has old user_id ❌

-- STEP 2: Unlink and deactivate WRONG record  
UPDATE workforce_personnel
SET user_id = NULL,              -- Remove user link
    employment_status = 'terminated'
WHERE employee_id = 'PIS-E000';  -- From wrong record

-- Result:
-- PIS-E000 deactivated ✓
-- PIS-9004 is now the ONLY active record ✓
```

## After the Fix

### New Login Flow

```
Step 1: User Login
Phone: 9777777774
     ↓
Step 2: Auth finds user
users table → user_id: user-abc...
     ↓
Step 3: App fetches profile
SELECT * FROM workforce_personnel WHERE user_id = 'user-abc...'
     ↓
Step 4: Gets CORRECT record
Returns: PIS-9004 (uuid-2222...) ✓
     ↓
Step 5: App shows profile
Displays: PIS-9004 ✓
     ↓
Step 6: App finds assignment
SELECT * FROM site_assignments WHERE personnel_id = 'uuid-2222...'
     ↓
Step 7: Assignment found!
Returns: Birla Colony ✓
```

### Result

```
DATABASE (Supabase):              APP (Manoj's Profile):
┌─────────────────────┐          ┌─────────────────────┐
│ employee_id         │          │ Employee ID:        │
│ PIS-9004 ✓          │          │ PIS-9004 ✓          │
│                     │          │                     │
│ Assignment:         │          │ Assignment:         │
│ Birla Colony ✓      │          │ Birla Colony ✓      │
└─────────────────────┘          └─────────────────────┘
    MATCH! ✓                         MATCH! ✓
```

## How Duplicates Happen

### Scenario 1: Failed Creation
```
Admin adds Manoj:
  Step 1: Create personnel → PIS-E000 created (error in ID gen)
  Step 2: Link to user → Linked ✓
  Step 3: Error occurs → Transaction incomplete ❌
  
Admin retries:
  Step 1: Create personnel → PIS-9004 created ✓
  Step 2: Link to user → Skipped (already linked)
  Step 3: Add assignment → Added to PIS-9004 ✓
  
Result: Two records, user linked to wrong one
```

### Scenario 2: Migration + Manual Add
```
Migration runs:
  Migrate from guards → Creates PIS-E000
  Links to user → Linked
  
Later, admin adds manually:
  Create personnel → PIS-9004 created
  Add assignment → Added to PIS-9004
  
Result: Two records again
```

## Prevention

### Add Database Constraints

```sql
-- Prevent duplicate user links
ALTER TABLE workforce_personnel
ADD CONSTRAINT unique_user_active
UNIQUE (user_id)
WHERE employment_status = 'active';

-- Prevent duplicate phones
ALTER TABLE workforce_personnel  
ADD CONSTRAINT unique_phone_active
UNIQUE (phone)
WHERE employment_status = 'active';
```

### Check Before Creating

```typescript
// In createGuard/createPersonnel function:
const existing = await supabase
  .from('workforce_personnel')
  .select('id, employee_id')
  .eq('phone', phone)
  .eq('employment_status', 'active')
  .maybeSingle();

if (existing) {
  throw new Error(`Personnel with phone ${phone} already exists as ${existing.employee_id}`);
}
```

## Quick Reference

### Check for Duplicates
```sql
SELECT employee_id, name, user_id, created_at
FROM workforce_personnel
WHERE name ILIKE '%Manoj%' OR phone = '9777777774'
ORDER BY created_at;
```

### Fix Duplicates (Template)
```sql
-- Link user to correct record
UPDATE workforce_personnel
SET user_id = (SELECT user_id FROM workforce_personnel WHERE phone = '<PHONE>' AND user_id IS NOT NULL LIMIT 1)
WHERE employee_id = '<CORRECT_ID>';

-- Deactivate wrong record
UPDATE workforce_personnel
SET user_id = NULL, employment_status = 'terminated'
WHERE employee_id = '<WRONG_ID>';
```

### Verify Fix
```sql
-- Should return ONE record
SELECT wp.employee_id, wp.name, s.site_name, sa.is_active
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '<PHONE>';
```

## Summary

**Problem:** Two personnel records, user linked to wrong one  
**Symptom:** App shows PIS-E000, database has PIS-9004  
**Fix:** Link user to PIS-9004, deactivate PIS-E000  
**Test:** Logout/login, should show PIS-9004 with assignment  
**Prevention:** Add unique constraints, check before creating  

See **FIX_EMPLOYEE_ID_NOW.md** for the complete fix! 🎯
