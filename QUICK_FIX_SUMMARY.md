# Quick Fix Summary - Manoj's Assignment & Geofence Issues

## Problem Summary
1. ❌ Manoj Thakur (PIS-9004) assigned to Birla Colony site, but not showing in his dashboard
2. ❌ Site location set correctly but check-in shows "outside geofencing" error

## Root Causes Identified

### Assignment Issue:
- Assignment exists in database but user's app has cached old profile
- Need to refresh the profile to fetch latest assignment from `site_assignments` table

### Geofencing Issue:
- Default geofence radius (100m) may be too small for GPS accuracy variations
- Possible incorrect site coordinates
- Mobile GPS accuracy typically 5-20m, sometimes worse indoors/in dense areas

## Immediate Solutions

### Step 1: Verify Assignment in Database
Run this in Supabase SQL editor:
```sql
SELECT 
    wp.employee_id,
    wp.name,
    s.site_name,
    sa.is_active,
    sa.shift_type
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004'
  AND sa.is_active = true;
```

**Expected result:** Should show 1 row with Birla Colony assignment

### Step 2: Fix Geofence Radius
```sql
-- Increase geofence radius to 200 meters
UPDATE sites 
SET geofence_radius = 200
WHERE site_name ILIKE '%Birla%Colony%';
```

### Step 3: Ask Manoj to Refresh His App
Option A: **Pull down to refresh** on the Guard Home screen
Option B: **Logout and login again**

This will call `refreshProfile()` and fetch the latest assignment.

## What Was Fixed in Code

### 1. Enhanced Error Messages
- Now shows exact distance from site
- Shows user's GPS coordinates
- Shows site's GPS coordinates
- Helps diagnose if coordinates are wrong or radius too small

**Files changed:**
- `mobile/src/api/attendanceService.ts`
- `mobile/src/api/workforceAttendanceService.ts`
- `mobile/src/screens/GuardAttendanceScreen.tsx`

### 2. Created Diagnostic Script
- `fix_assignment_geofence.sql` - Run this to diagnose and fix issues

## Testing Steps

1. ✅ Run SQL query from Step 1 to verify assignment
2. ✅ Run SQL update from Step 2 to increase geofence radius
3. ✅ Ask Manoj to refresh app (pull down on home screen)
4. ✅ Check if Birla Colony site now shows in his dashboard
5. ✅ Go to Birla Colony location and try check-in
6. ✅ If check-in fails, note the distance shown in error message
7. ✅ If distance is close (like 110m), increase radius further to 300m

## Expected Behavior After Fix

### Dashboard:
- Manoj should see "Birla Colony" as his assigned site
- Shift type should show (day/night)
- Check-in button should be enabled

### Check-in Screen:
- Map shows Birla Colony location with circle (geofence boundary)
- Blue dot shows Manoj's current location
- Badge shows "Inside Geofence ✅" when within 200m
- Check-in button enabled when inside geofence and selfie taken

### If Still Outside Geofence:
- Error shows: "Distance: XXXm / 200m allowed"
- Error shows user's coordinates
- You can then decide if need to increase radius or fix coordinates

## Files to Review

1. **ASSIGNMENT_GEOFENCE_FIX.md** - Detailed analysis & solutions
2. **fix_assignment_geofence.sql** - Database diagnostic & fix queries
3. **Modified code files** - Enhanced error messages

## Quick Contact for Common Issues

**"Assignment still not showing after refresh"**
→ Run verification query, might need to insert assignment if missing

**"Check-in failing but badge shows inside"**
→ Check backend Edge Function logs, might be different validation

**"GPS shows wrong location"**
→ Ask user to go outside, enable High Accuracy mode, wait 30 seconds

**"Distance shows 500m+ but user says they're at site"**
→ Site coordinates are probably wrong, verify and update

## Summary

The code changes add better error messages for debugging. The main fixes are:
1. Increase geofence radius to 200m (from 100m)
2. Ask Manoj to refresh his app to fetch latest assignment
3. Use the detailed error messages to diagnose any remaining issues

All changes are non-breaking and backwards compatible.
