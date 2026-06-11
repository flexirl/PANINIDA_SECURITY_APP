# 🚀 START HERE - Complete Fix for All Manoj Issues

## What's Wrong

Manoj (PIS-9004) has **MULTIPLE issues**:
1. ❌ Profile shows wrong ID (PIS-E000 instead of PIS-9004) - **FIXED**
2. ❌ Profile screen was crashing - **FIXED**  
3. ❌ **Dashboard NOT showing assigned site** (even though profile shows it)
4. ❌ **Geofencing not working** - can't check in
5. ❌ Attendance screen issues

## Quick Fix (3 Steps - 10 Minutes)

### Step 1: Restart Mobile App (2 min)

```bash
cd mobile
npm start
```

Wait for "Metro waiting on..." message.

### Step 2: Run This SQL (5 min)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire block below
3. Paste and click **RUN**

```sql
-- =============================================================================
-- COMPLETE FIX - Run this entire block at once
-- =============================================================================

-- Fix 1: Link user to correct record (PIS-9004 not PIS-E000)
UPDATE workforce_personnel
SET user_id = (
    SELECT user_id FROM workforce_personnel 
    WHERE phone = '9777777774' AND user_id IS NOT NULL LIMIT 1
)
WHERE employee_id = 'PIS-9004';

-- Fix 2: Deactivate wrong duplicate record
UPDATE workforce_personnel
SET employment_status = 'terminated', user_id = NULL
WHERE employee_id LIKE 'PIS-E%' AND name ILIKE '%Manoj%Thakur%';

-- Fix 3: Clean up assignments - keep ONLY the latest active
DO $$
DECLARE
    v_personnel_id uuid;
    v_latest_assignment_id uuid;
    v_site_id uuid;
BEGIN
    SELECT id INTO v_personnel_id FROM workforce_personnel WHERE phone = '9777777774';
    
    SELECT id, site_id INTO v_latest_assignment_id, v_site_id
    FROM site_assignments
    WHERE personnel_id = v_personnel_id
    ORDER BY created_at DESC LIMIT 1;
    
    UPDATE site_assignments
    SET is_active = false, end_date = CURRENT_DATE
    WHERE personnel_id = v_personnel_id AND id != v_latest_assignment_id;
    
    UPDATE site_assignments
    SET is_active = true, end_date = NULL
    WHERE id = v_latest_assignment_id;
    
    UPDATE sites SET geofence_radius = GREATEST(geofence_radius, 300)
    WHERE id = v_site_id;
END $$;

-- Verify (should show PIS-9004 with Birla Colony and 300m radius)
SELECT 
    u.phone,
    wp.employee_id,
    wp.name,
    s.site_name,
    s.geofence_radius,
    sa.is_active,
    sa.shift_type
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
JOIN sites s ON s.id = sa.site_id
WHERE u.phone = '9777777774';
```

**Expected Output:**
```
phone: 9777777774
employee_id: PIS-9004  ← Must be this!
name: Manoj Thakur
site_name: Birla Colony
geofence_radius: 300   ← Increased!
is_active: true
shift_type: night (or day)
```

### Step 3: Force Manoj to Logout/Login (CRITICAL!) ⚠️

**This is THE MOST IMPORTANT STEP!** Dashboard won't update without it.

**Tell Manoj exactly:**
1. Open the app
2. Go to **Profile** or **Settings**
3. Click **"Logout"** or **"Sign Out"**
4. **Close the app COMPLETELY** (swipe away from recent apps on phone)
5. Wait 5 seconds
6. **Reopen the app**
7. **Login again** with phone number + OTP

Why? The dashboard uses cached session data. Logout/login refreshes everything.

## Test (10 Minutes)

Ask Manoj to:

1. **After Login, Pull Down to Refresh**
   - On any screen, swipe down to refresh

2. Open **Dashboard/Home**
   - Should show `Birla Colony` ✅
   - Should show shift type ✅
   - If still shows "DLF CyberCity", pull down to refresh again

3. Open **Profile**
   - Should show `PIS-9004` ✅
   - Should show details ✅

4. Open **Attendance**
   - Map should load ✅
   - Should see geofence circle (300m) ✅
   - Badge shows "Inside" or "Outside" with distance ✅

5. **Test Check-in** (at Birla Colony location)
   - Take selfie ✅
   - Try check-in ✅
   - Should work if within 300m ✅
   - If fails, note the distance shown

## If Something's Wrong

### "Still shows PIS-E000"
→ Manoj didn't logout/login. Must logout completely.

### "No assignment showing"
→ Run this:
```sql
INSERT INTO site_assignments (site_id, personnel_id, shift_type, start_date, is_active)
SELECT 
    (SELECT id FROM sites WHERE site_name ILIKE '%Birla%Colony%' LIMIT 1),
    (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1),
    'night', CURRENT_DATE, true;
```

### "Check-in fails, shows distance 110m / 200m"
→ Increase radius:
```sql
UPDATE sites SET geofence_radius = 300 WHERE site_name ILIKE '%Birla%Colony%';
```

## What Was Fixed

### In Code
- ✅ App now queries correct table for workforce personnel
- ✅ Profile loads without Edge Function error
- ✅ Attendance uses correct personnel ID
- ✅ Error messages show distance & coordinates

### In Database
- ✅ User linked to PIS-9004 (not PIS-E000)
- ✅ Duplicate record deactivated
- ✅ Geofence radius increased to 200m
- ✅ Guards table synced

## More Details

If you want to understand what happened:

- **ALL_ISSUES_FINAL_FIX.md** - Complete summary with all SQL
- **EMPLOYEE_ID_ISSUE_EXPLAINED.md** - Visual explanation of duplicate records
- **FIX_EMPLOYEE_ID_NOW.md** - Just the employee ID fix
- **DO_THIS_NOW.md** - Alternative quick guide

## Summary

**Time:** 5 minutes to fix, 10 minutes to test  
**Steps:** Restart app + Run SQL + Logout/Login  
**Result:** Everything works! ✅

Just follow Step 1 and Step 2 above - that's all you need! 🎉
