# 🧪 Testing Guide for New Guard PIS-9012

## Guard Details

- **Employee ID:** PIS-9012
- **Phone:** 9999999991
- **Assigned Site:** Birla Colony
- **Geofence Radius:** 300m (generous for GPS accuracy)

## Pre-Test Setup

### Step 1: Run Setup Script

Open Supabase SQL Editor and run:

```sql
-- Execute the complete setup
-- (Copy entire content from SETUP_NEW_GUARD_PIS9012.sql)
```

Or just run this quick version:

```sql
-- Quick setup for PIS-9012
DO $$
DECLARE
    v_user_id uuid;
    v_personnel_id uuid;
    v_site_id uuid;
BEGIN
    -- 1. Get or create user
    SELECT id INTO v_user_id FROM users WHERE phone = '9999999991';
    IF v_user_id IS NULL THEN
        INSERT INTO users (phone, name, role, is_active)
        VALUES ('9999999991', 'New Guard', 'workforce_personnel', true)
        RETURNING id INTO v_user_id;
    END IF;
    
    -- 2. Link personnel to user
    SELECT id INTO v_personnel_id FROM workforce_personnel WHERE employee_id = 'PIS-9012';
    UPDATE workforce_personnel SET user_id = v_user_id WHERE id = v_personnel_id;
    
    -- 3. Get Birla Colony site
    SELECT id INTO v_site_id FROM sites WHERE site_name ILIKE '%Birla%Colony%' LIMIT 1;
    
    -- 4. Create/update assignment
    INSERT INTO site_assignments (personnel_id, site_id, shift_type, start_date, is_active)
    VALUES (v_personnel_id, v_site_id, 'day', CURRENT_DATE, true)
    ON CONFLICT (id) DO UPDATE SET is_active = true;
    
    -- 5. Set geofence
    UPDATE sites SET geofence_radius = 300 WHERE id = v_site_id;
    
    RAISE NOTICE 'Setup complete for PIS-9012';
END $$;
```

### Step 2: Verify Setup

```sql
-- Should return one complete row
SELECT 
    wp.employee_id,
    wp.phone,
    u.role,
    s.site_name,
    s.geofence_radius,
    sa.is_active
FROM workforce_personnel wp
JOIN users u ON u.id = wp.user_id
LEFT JOIN site_assignments sa ON sa.personnel_id = wp.id AND sa.is_active = true
LEFT JOIN sites s ON s.id = sa.site_id
WHERE wp.employee_id = 'PIS-9012';
```

**Expected:**
```
employee_id: PIS-9012
phone: 9999999991
role: workforce_personnel (or guard)
site_name: Birla Colony
geofence_radius: 300
is_active: true
```

## Testing Checklist

### Test 1: Login ✅

1. Open the mobile app
2. Enter phone: **9999999991**
3. Click "Send OTP"
4. For testing, enter: **123456** (dev bypass code)
5. Should login successfully

**✅ Pass:** Logged in without errors  
**❌ Fail:** Error message → Check user exists in database

### Test 2: Profile Screen ✅

1. Navigate to **Profile** tab
2. Check employee ID displayed

**✅ Pass:** Shows **PIS-9012**  
**❌ Fail:** Shows PIS-E000 or other → Run employee ID fix for this guard

### Test 3: Dashboard/Home Screen ✅

1. Navigate to **Home** or **Dashboard**
2. Check assigned site section

**✅ Pass:** Shows **"Birla Colony"** as assigned site  
**❌ Fail:** Shows "DLF CyberCity" or blank → Assignment not loading

**Fix if fails:**
```sql
-- Ensure only one active assignment
UPDATE site_assignments
SET is_active = false
WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012')
AND is_active = true
AND id != (
    SELECT id FROM site_assignments
    WHERE personnel_id = (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012')
    ORDER BY created_at DESC LIMIT 1
);

-- Then logout/login
```

### Test 4: Attendance Screen ✅

1. Navigate to **Attendance** tab
2. Map should load

**✅ Pass:** Map shows with markers  
**❌ Fail:** Blank screen or error → Check site has lat/lon

**Check:**
```sql
SELECT site_name, latitude, longitude, geofence_radius
FROM sites
WHERE site_name ILIKE '%Birla%Colony%';
```

### Test 5: Geofence Visualization ✅

1. On Attendance screen
2. Look for geofence circle on map

**✅ Pass:** See blue circle around site (300m radius)  
**❌ Fail:** No circle → Check geofence_radius is set

### Test 6: GPS Location Badge ✅

1. On Attendance screen
2. Check badge at top of map

**✅ Pass:** Shows "Inside Geofence ✅" (green) or "Outside Geofence ❌" (red)  
**❌ Fail:** No badge or always shows outside → GPS permission issue

**Fix GPS:**
- Grant location permission to app
- Go outside (GPS works poorly indoors)
- Enable "High Accuracy" in phone settings

### Test 7: Check-in (Inside Geofence) ✅

1. Go to Birla Colony location (within 300m)
2. Take a selfie
3. Click "Check In"

**✅ Pass:** Check-in succeeds, shows success message  
**❌ Fail:** Shows "Outside geofence" with distance

**If fails:**
- Note the distance shown (e.g., "Distance: 320m / 300m")
- If close (310-350m), increase radius:
  ```sql
  UPDATE sites SET geofence_radius = 500 WHERE site_name ILIKE '%Birla%Colony%';
  ```
- If far (1000m+), site coordinates are wrong

### Test 8: Check-in (Outside Geofence) ✅

1. Stay away from Birla Colony (500m+ away)
2. Try to check in

**✅ Pass:** Shows error with distance like "Distance: 850m / 300m allowed"  
**❌ Fail:** Shows generic error → Error messages not updated

### Test 9: Check-out ✅

1. After successful check-in
2. Take another selfie
3. Click "Check Out"

**✅ Pass:** Check-out succeeds  
**❌ Fail:** Error → Check attendance record exists

## Common Issues & Fixes

### Issue 1: Can't Login

**Symptoms:** "Phone number not registered" error

**Fix:**
```sql
-- Create user if missing
INSERT INTO users (phone, name, role, is_active)
VALUES ('9999999991', 'Guard Name', 'workforce_personnel', true)
ON CONFLICT (phone) DO UPDATE SET is_active = true;

-- Link to personnel
UPDATE workforce_personnel
SET user_id = (SELECT id FROM users WHERE phone = '9999999991')
WHERE employee_id = 'PIS-9012';
```

### Issue 2: Profile Shows Wrong ID

**Symptoms:** Shows PIS-E000 instead of PIS-9012

**Fix:**
```sql
-- Find and fix duplicate
-- Link user to correct record
UPDATE workforce_personnel
SET user_id = (SELECT user_id FROM workforce_personnel WHERE phone = '9999999991' AND user_id IS NOT NULL LIMIT 1)
WHERE employee_id = 'PIS-9012';

-- Deactivate wrong duplicate
UPDATE workforce_personnel
SET employment_status = 'terminated', user_id = NULL
WHERE phone = '9999999991' AND employee_id != 'PIS-9012';
```

Then logout/login.

### Issue 3: Dashboard Shows Wrong Site

**Symptoms:** Shows "DLF CyberCity" or old site

**Fix:** Logout and login completely

### Issue 4: Always Outside Geofence

**Symptoms:** Badge always red, check-in fails

**Fix A:** Increase radius
```sql
UPDATE sites SET geofence_radius = 500 WHERE site_name ILIKE '%Birla%Colony%';
```

**Fix B:** Fix coordinates
```sql
-- Check current
SELECT 
    site_name,
    latitude,
    longitude,
    CONCAT('https://www.google.com/maps?q=', latitude, ',', longitude) as map_link
FROM sites WHERE site_name ILIKE '%Birla%Colony%';

-- Update if wrong
UPDATE sites
SET latitude = <CORRECT_LAT>, longitude = <CORRECT_LON>
WHERE site_name ILIKE '%Birla%Colony%';
```

### Issue 5: No Site Showing

**Symptoms:** Dashboard and profile show no assigned site

**Fix:**
```sql
-- Create assignment
INSERT INTO site_assignments (personnel_id, site_id, shift_type, start_date, is_active)
VALUES (
    (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9012'),
    (SELECT id FROM sites WHERE site_name ILIKE '%Birla%Colony%' LIMIT 1),
    'day',
    CURRENT_DATE,
    true
);
```

Then logout/login.

## Success Criteria

All these should work:

- [x] Login with 9999999991
- [x] Profile shows PIS-9012
- [x] Dashboard shows Birla Colony
- [x] Attendance map loads
- [x] Geofence circle visible
- [x] Badge shows inside/outside correctly
- [x] Check-in works when inside 300m
- [x] Error shows distance when outside
- [x] Check-out works

## Comparison with Manoj (PIS-9004)

| Feature | Manoj (Had Issues) | PIS-9012 (Should Work) |
|---------|-------------------|------------------------|
| User linked | ❌ Initially wrong | ✅ Correct from start |
| Employee ID | ❌ Showed PIS-E000 | ✅ Shows PIS-9012 |
| Assignment | ❌ Not showing | ✅ Visible everywhere |
| Geofence | ❌ Too small (100m) | ✅ Generous (300m) |
| Dashboard | ❌ Not updating | ✅ Shows correct site |

## Summary

**Setup Time:** 5 minutes  
**Testing Time:** 15 minutes  
**Expected Result:** Everything works perfectly! ✅

The key differences from Manoj's setup:
1. ✅ User linked correctly from the start
2. ✅ No duplicate records
3. ✅ Generous geofence (300m)
4. ✅ Clean single assignment

See **SETUP_NEW_GUARD_PIS9012.sql** for complete setup script!
