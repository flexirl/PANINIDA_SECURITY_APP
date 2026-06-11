# 🔥 DO THIS NOW - Quick Fix Guide

## The Problem
Manoj (PIS-9004) gets errors:
- `Edge Function returned a non-2xx status code`
- Profile shows wrong employee ID (**PIS-E000** instead of **PIS-9004**)
- Profile won't load
- Attendance doesn't work  
- Site not showing

## The Causes
1. App was querying wrong table (`guards` instead of `workforce_personnel`)
2. **Duplicate personnel records** - user linked to PIS-E000, but assignment is on PIS-9004
3. Geofence radius too small (100m)

## The Fix (2 Steps)

### STEP 1: Restart Your Mobile App ⚡

```bash
# In your terminal:
cd mobile

# Stop any running process (Ctrl+C if needed)

# Then start:
npm start
```

**OR if using Expo:**
```bash
npx expo start
```

### STEP 2: Run This SQL 📝

Open **Supabase SQL Editor** and paste **ALL THREE** fixes:

```sql
-- FIX A: Link user to correct personnel record (PIS-9004)
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

-- FIX B: Deactivate duplicate record (PIS-E000)
UPDATE workforce_personnel
SET employment_status = 'terminated',
    user_id = NULL
WHERE employee_id LIKE 'PIS-E%'
AND name ILIKE '%Manoj%Thakur%'
AND employee_id != 'PIS-9004';

-- FIX C: Increase geofence radius
UPDATE sites 
SET geofence_radius = 200
WHERE site_name ILIKE '%Birla%Colony%';

-- VERIFY: Check everything is correct
SELECT 
    wp.employee_id,
    wp.name,
    s.site_name,
    s.address,
    s.geofence_radius,
    sa.shift_type,
    sa.is_active
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004'
  AND sa.is_active = true;
```

**Expected Output:**
```
employee_id: PIS-9004
name: Manoj Thakur
site_name: Birla Colony (or similar)
geofence_radius: 200
is_active: true
```

## Test It Works ✅

Ask Manoj to:

1. **Logout and login again** (to refresh profile)

2. **Check Employee ID:**
   - Go to Profile tab
   - Should see **PIS-9004** (not PIS-E000)

3. **Check Profile:**
   - Should load without errors
   - Should see his details

4. **Check Dashboard:**
   - Should see "Birla Colony" as assigned site

5. **Check Attendance:**
   - Go to Attendance tab
   - Should see map with geofence circle
   - Green badge should show when inside 200m

6. **Try Check-in:**
   - Go to Birla Colony location
   - Take selfie
   - Check in
   - Should work if within 200m

## If Still Not Working

### Profile Error Persists

```sql
-- Check if personnel record exists
SELECT * FROM workforce_personnel 
WHERE employee_id = 'PIS-9004';
```

If empty → Personnel record missing, contact me

### Profile Shows Wrong ID (PIS-E000 instead of PIS-9004)

**Cause:** User linked to duplicate personnel record

**Fix:** Run FIX A and FIX B from Step 2 SQL
```sql
-- Link to correct record
UPDATE workforce_personnel
SET user_id = (SELECT user_id FROM workforce_personnel WHERE phone = '9777777774' AND user_id IS NOT NULL LIMIT 1)
WHERE employee_id = 'PIS-9004';

-- Deactivate duplicate
UPDATE workforce_personnel
SET employment_status = 'terminated', user_id = NULL
WHERE employee_id LIKE 'PIS-E%' AND name ILIKE '%Manoj%Thakur%';
```

Then ask Manoj to logout/login.

### Assignment Not Showing

```sql
-- Create assignment if missing
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
);
```

### Check-in Fails with Distance Error

Example error: `Distance: 110m / 200m allowed`

**Fix:** Increase radius more:
```sql
UPDATE sites 
SET geofence_radius = 300
WHERE site_name ILIKE '%Birla%Colony%';
```

## What Was Fixed in Code

✅ **GuardProfileScreen** - Now queries `workforce_personnel` table for workforce personnel  
✅ **GuardAttendanceScreen** - Uses correct personnel ID  
✅ **Check-in logic** - Works for both guards and workforce personnel  
✅ **Error messages** - Now show exact distance and coordinates

## Summary

**Before:**
- App crashed trying to fetch guard details
- Edge Function returned 404

**After:**
- App checks user role and queries correct table
- Works for both guards and workforce personnel
- Better error messages for debugging

---

**Time to fix:** ~5 minutes  
**Files changed:** 2 React Native screens  
**SQL needed:** 2 simple queries  

Just restart the app and run the SQL - that's it! 🎉
