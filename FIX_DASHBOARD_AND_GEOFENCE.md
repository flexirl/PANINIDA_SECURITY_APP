# 🔧 Fix Dashboard & Geofencing Issues

## Problems

1. ❌ **Dashboard:** Site assignment NOT showing (even though profile shows it)
2. ❌ **Geofencing:** Check-in not working / shows outside geofence

## Root Causes

### Dashboard Issue
- **Profile screen** queries database directly → Shows correct site ✓
- **Dashboard** relies on `user.current_assignment` from auth session → Might be null ❌
- User hasn't logged out/in after assignment was created
- OR multiple assignments exist causing confusion

### Geofencing Issue  
- Radius too small (100m or 150m)
- Site coordinates incorrect
- GPS accuracy poor
- User actually outside the location

## Complete Fix (3 Steps)

### STEP 1: Clean Up Assignments in Database

Run this in Supabase SQL Editor:

```sql
-- =============================================================================
-- Ensure ONLY ONE active assignment exists
-- =============================================================================

DO $$
DECLARE
    v_personnel_id uuid;
    v_latest_assignment_id uuid;
    v_site_id uuid;
BEGIN
    -- Get personnel ID for Manoj
    SELECT id INTO v_personnel_id
    FROM workforce_personnel
    WHERE phone = '9777777774';
    
    -- Get the LATEST assignment (should be Birla Colony)
    SELECT id, site_id INTO v_latest_assignment_id, v_site_id
    FROM site_assignments
    WHERE personnel_id = v_personnel_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Deactivate ALL other assignments
    UPDATE site_assignments
    SET is_active = false, end_date = CURRENT_DATE
    WHERE personnel_id = v_personnel_id
    AND id != v_latest_assignment_id;
    
    -- Ensure the latest is definitely active
    UPDATE site_assignments
    SET is_active = true, end_date = NULL, start_date = COALESCE(start_date, CURRENT_DATE)
    WHERE id = v_latest_assignment_id;
    
    -- Also increase geofence radius for the assigned site
    UPDATE sites
    SET geofence_radius = GREATEST(geofence_radius, 300)
    WHERE id = v_site_id;
    
    RAISE NOTICE 'Fixed: Assignment % is active, geofence increased', v_latest_assignment_id;
END $$;

-- Verify the fix
SELECT 
    wp.employee_id,
    wp.name,
    s.site_name,
    s.geofence_radius,
    sa.shift_type,
    sa.is_active,
    sa.start_date
FROM site_assignments sa
JOIN workforce_personnel wp ON wp.id = sa.personnel_id
JOIN sites s ON s.id = sa.site_id
WHERE wp.phone = '9777777774'
ORDER BY sa.created_at DESC;
```

**Expected Output:**
```
ONLY ONE row with:
employee_id: PIS-9004
site_name: Birla Colony
geofence_radius: 300 (increased!)
is_active: true
```

### STEP 2: Force Manoj to Logout and Login

This is CRITICAL! The dashboard gets data from the auth session which is cached.

**Tell Manoj:**
1. Open app
2. Go to Profile or Settings
3. Click **"Logout"**
4. **Close the app completely** (swipe away from recent apps)
5. **Reopen the app**
6. Login again with phone + OTP

### STEP 3: Test Geofencing

After login, ask Manoj to:

1. **Check Dashboard/Home Screen**
   - Should now show "Birla Colony" ✓
   - Should show shift type ✓

2. **Go to Attendance Screen**
   - Should see map ✓
   - Should see geofence circle (300m radius) ✓

3. **Check Current Distance**
   - Badge will show if inside/outside geofence
   - If outside, it will show exact distance

4. **If Outside Geofence:**
   - Note the distance shown
   - If close (like 320m / 300m), increase radius more
   - If far (like 1000m+ / 300m), site coordinates are wrong

## SQL to Increase Geofence Further

If check-in still fails with distance close to 300m:

```sql
-- Increase to 500m (very generous, covers GPS errors)
UPDATE sites
SET geofence_radius = 500
WHERE site_name ILIKE '%Birla%Colony%';
```

## SQL to Fix Site Coordinates

If distance is very far (500m+), coordinates are probably wrong:

```sql
-- First, check current coordinates on Google Maps
SELECT 
    site_name,
    latitude,
    longitude,
    CONCAT('https://www.google.com/maps?q=', latitude, ',', longitude) as map_link
FROM sites
WHERE site_name ILIKE '%Birla%Colony%';

-- Open the map_link in browser
-- If pin is wrong location:
-- 1. Go to correct location in Google Maps
-- 2. Right-click → Copy coordinates
-- 3. Update:

UPDATE sites
SET latitude = <CORRECT_LAT>,
    longitude = <CORRECT_LON>
WHERE site_name ILIKE '%Birla%Colony%';

-- Example (use actual coordinates):
-- UPDATE sites
-- SET latitude = 25.5835,
--     longitude = 85.0678
-- WHERE site_name ILIKE '%Birla%Colony%';
```

## Why Dashboard Doesn't Update Automatically

### How Dashboard Works

```
GuardHomeScreen loads:
  ↓
Calls: refreshProfile()
  ↓
Calls: fetchUserProfile(user.id)
  ↓
Queries: SELECT ... FROM site_assignments
         WHERE personnel_id = X AND is_active = true
  ↓
Returns: current_assignment { id, site_id, shift_type }
  ↓
Dashboard shows: siteDetails.site_name
```

### The Problem

`refreshProfile()` updates the in-memory user object, but:
1. If called too early (before assignment created), returns null
2. If multiple active assignments exist, might return wrong one
3. React state might not update properly

### The Solution

**Logout/Login** completely refreshes:
- Auth session
- User profile
- Current assignment
- All cached data

This is why you MUST logout/login after database changes!

## Troubleshooting

### Dashboard Still Shows "DLF CyberCity"

**Cause:** User didn't logout/login or did it wrong

**Fix:**
1. Make sure user LOGGED OUT (not just closed app)
2. Make sure user CLOSED APP completely (swipe away from recent apps)
3. Reopen and login
4. Pull down to refresh on dashboard

### Dashboard Shows Wrong Site

**Cause:** Multiple active assignments

**Fix:** Run STEP 1 SQL again to clean up

### Geofence Always Shows "Outside"

**Cause 1:** Radius too small  
**Fix:** Increase to 500m (see SQL above)

**Cause 2:** Coordinates wrong  
**Fix:** Update site lat/lon (see SQL above)

**Cause 3:** GPS not working  
**Fix:** 
- Go outside (GPS works poorly indoors)
- Enable "High Accuracy" in location settings
- Wait 30 seconds for GPS to stabilize

### Error Message Shows Huge Distance

Example: `Distance: 5000m / 300m`

**This means:** Site coordinates are completely wrong

**Fix:**
1. Find correct address on Google Maps
2. Get coordinates (right-click → coordinates)
3. Update site with correct lat/lon

## Complete Verification Script

Run this to check everything is correct:

```sql
-- Check user → personnel → assignment → site chain
SELECT 
    'User' as level,
    u.id,
    u.phone,
    u.name,
    u.role,
    'OK' as status
FROM users u
WHERE u.phone = '9777777774'

UNION ALL

SELECT 
    'Personnel' as level,
    wp.id,
    wp.phone,
    wp.name,
    wp.employee_id as role,
    CASE WHEN wp.user_id IS NOT NULL THEN 'OK' ELSE 'ERROR: No user_id' END as status
FROM workforce_personnel wp
WHERE wp.phone = '9777777774'

UNION ALL

SELECT 
    'Assignment' as level,
    sa.id,
    CAST(sa.personnel_id as TEXT) as phone,
    CONCAT('Site: ', s.site_name) as name,
    sa.shift_type as role,
    CASE WHEN sa.is_active THEN 'OK' ELSE 'ERROR: Not active' END as status
FROM site_assignments sa
JOIN sites s ON s.id = sa.site_id
WHERE sa.personnel_id = (SELECT id FROM workforce_personnel WHERE phone = '9777777774')
ORDER BY sa.created_at DESC
LIMIT 1

UNION ALL

SELECT 
    'Site' as level,
    s.id,
    s.site_name as phone,
    s.address as name,
    CONCAT('Geofence: ', s.geofence_radius, 'm') as role,
    CASE WHEN s.geofence_radius >= 200 THEN 'OK' ELSE 'WARNING: Radius too small' END as status
FROM sites s
WHERE s.id = (
    SELECT sa.site_id
    FROM site_assignments sa
    WHERE sa.personnel_id = (SELECT id FROM workforce_personnel WHERE phone = '9777777774')
    AND sa.is_active = true
    LIMIT 1
);

-- All rows should show 'OK' status
```

## Summary

**Dashboard Fix:**
1. ✅ Clean up duplicate assignments (SQL STEP 1)
2. ✅ Logout/login completely
3. ✅ Pull down to refresh

**Geofencing Fix:**
1. ✅ Increase radius to 300-500m (SQL STEP 1)
2. ✅ Verify site coordinates are correct
3. ✅ Test at actual location with good GPS

**Key Point:** MUST logout/login for dashboard to update! ⚠️

See **DEBUG_DASHBOARD_ASSIGNMENT.sql** for more diagnostic queries.
