# Site Assignment & Geofence Check-in Issues - Diagnosis & Fix

## Issues Reported

1. **Site assignment not showing in Manoj's dashboard**: PIS-9004 (Manoj Thakur) was assigned to Birla Colony site, but the assignment doesn't appear in his dashboard.

2. **Geofence check-in failing**: Site location was set to user's address, but check-in still shows "outside geofencing" error.

## Root Cause Analysis

### Issue 1: Site Assignment Not Showing

**Diagnosis:**
- The `fetchUserProfile` function in `authService.ts` correctly queries `site_assignments` table
- The `refreshProfile()` function in `useAuth` calls `fetchUserProfile` to update the user's current assignment
- The query uses `.single()` which should return the active assignment for the personnel
- The GuardHomeScreen calls `refreshProfile()` on mount and on pull-to-refresh

**Potential causes:**
1. Assignment might not be properly saved in the database with `is_active = true`
2. The `personnel_id` in the assignment might not match the user's `workforce_personnel_id`
3. Cache/session issue - the profile needs to be refreshed after assignment

### Issue 2: Geofencing Check-in Failing

**Diagnosis:**
- Geofencing uses Haversine formula in `geo-utils.ts` to calculate distance
- Default geofence_radius is 100 meters if not specified
- The check-in validation in `attendance/index.ts` and `workforceAttendanceService.ts` is strict
- Location accuracy from mobile GPS can vary (typically 5-20 meters, sometimes worse)

**Potential causes:**
1. Site `geofence_radius` is too small (default 100m)
2. GPS coordinates for the site are incorrect
3. Mobile device GPS accuracy is poor
4. Coordinates are being passed incorrectly (format issues)

## Solution Steps

### Fix 1: Verify & Refresh Site Assignment

Run these SQL queries to check the assignment:

```sql
-- Check if Manoj Thakur exists and get his personnel_id
SELECT id, employee_id, name, user_id 
FROM workforce_personnel 
WHERE employee_id = 'PIS-9004' OR name LIKE '%Manoj%Thakur%';

-- Check if Birla Colony site exists
SELECT id, site_name, address, latitude, longitude, geofence_radius 
FROM sites 
WHERE site_name LIKE '%Birla%Colony%';

-- Check site_assignments for Manoj
SELECT sa.*, 
       wp.name as personnel_name, 
       s.site_name
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004' OR wp.name LIKE '%Manoj%Thakur%';

-- If no assignment exists, create it:
-- INSERT INTO site_assignments (site_id, personnel_id, shift_type, start_date, is_active)
-- VALUES (
--   (SELECT id FROM sites WHERE site_name LIKE '%Birla%Colony%' LIMIT 1),
--   (SELECT id FROM workforce_personnel WHERE employee_id = 'PIS-9004' LIMIT 1),
--   'night',
--   CURRENT_DATE,
--   true
-- );
```

### Fix 2: Increase Geofence Radius & Verify Coordinates

```sql
-- Update Birla Colony site with larger geofence radius
UPDATE sites 
SET geofence_radius = 200  -- Increased from 100m to 200m
WHERE site_name LIKE '%Birla%Colony%';

-- Verify the coordinates are correct
SELECT site_name, address, latitude, longitude, geofence_radius 
FROM sites 
WHERE site_name LIKE '%Birla%Colony%';
```

### Fix 3: Add Diagnostic Logging to Geofence Check

Update the geofencing error message to show more details for debugging.

## Implementation

### Step 1: Database Verification Script

Create a diagnostic script to check the assignment status.


## Quick Fix Steps

### For Site Assignment Issue:

1. **Run the diagnostic SQL script:**
   ```bash
   # Open your Supabase SQL editor and run:
   # fix_assignment_geofence.sql (Steps 1-4 to diagnose)
   ```

2. **If assignment exists but not showing in app:**
   - Ask Manoj to **pull down to refresh** on the Guard Home screen
   - Or ask him to **logout and login again** (this will refresh the profile)

3. **If assignment doesn't exist:**
   - Run the INSERT query from FIX 2 section in the SQL script
   - Then ask Manoj to refresh or re-login

### For Geofencing Check-in Issue:

1. **Increase geofence radius:**
   ```sql
   UPDATE sites 
   SET geofence_radius = 200
   WHERE site_name ILIKE '%Birla%Colony%';
   ```

2. **Verify site coordinates are correct:**
   - Open Google Maps and search for "Birla Colony"
   - Right-click on the exact location and copy coordinates
   - Update the site with correct coordinates:
   ```sql
   UPDATE sites
   SET latitude = <CORRECT_LAT>, 
       longitude = <CORRECT_LON>
   WHERE site_name ILIKE '%Birla%Colony%';
   ```

3. **Test the check-in:**
   - The app now shows detailed distance information in error messages
   - If still failing, check the error message for actual distance
   - You may need to increase geofence_radius further (up to 300-500m for areas with poor GPS)

## Enhanced Features Added

### 1. Better Error Messages

The app now shows:
- Exact distance from site in meters
- Maximum allowed radius
- User's current GPS coordinates
- Site's GPS coordinates

This helps diagnose:
- If coordinates are wrong
- If radius is too small  
- If GPS accuracy is poor

### 2. Visual Feedback

The GuardAttendanceScreen already shows:
- **Green badge**: "Inside Geofence ✅" when within radius
- **Red badge**: "Outside Geofence ❌" when outside radius
- **Map with circle**: Visual geofence boundary
- **User location marker**: Blue pulsing dot

## Testing Checklist

- [ ] Run diagnostic queries to verify assignment exists
- [ ] Verify `is_active = true` for the assignment
- [ ] Check geofence_radius is >= 150m (recommended)
- [ ] Verify site latitude/longitude are correct
- [ ] Ask Manoj to refresh his app (pull down on home screen)
- [ ] Test check-in and note the exact distance shown in error
- [ ] Adjust geofence_radius if needed
- [ ] Verify check-in succeeds

## Common Issues & Solutions

### Issue: Assignment exists but not showing

**Cause:** App cache showing old profile data

**Solution:**
1. Pull down to refresh on Guard Home screen
2. Or logout and login again
3. The `refreshProfile()` function will fetch latest assignment

### Issue: Check-in fails with "Outside geofence"

**Cause:** Multiple possible reasons
- Site coordinates are incorrect
- Geofence radius too small
- Poor GPS accuracy on device
- User is actually outside the location

**Solution:**
1. Check error message for actual distance
2. If distance is close (110m with 100m radius), increase radius to 200m
3. If distance is very far, verify site coordinates are correct
4. If GPS keeps jumping, ask user to enable "High Accuracy" location mode

### Issue: GPS shows wrong location

**Cause:** Device GPS issues

**Solution:**
1. Ask user to go outside (GPS works poorly indoors)
2. Enable "High Accuracy" mode in Location settings
3. Restart the app
4. Wait 30 seconds for GPS to stabilize

## Database Schema Reference

### site_assignments table
```sql
- id: uuid PRIMARY KEY
- site_id: uuid REFERENCES sites(id)
- personnel_id: uuid REFERENCES workforce_personnel(id)
- shift_type: text (day/night/rotating)
- start_date: date
- end_date: date (NULL if active)
- is_active: boolean
```

### sites table geofence fields
```sql
- latitude: numeric (required for geofence)
- longitude: numeric (required for geofence)
- geofence_radius: numeric (in meters, default 100)
```

## API Endpoints Used

### Check-in Flow:
1. App calls `fetchUserProfile()` → gets `current_assignment`
2. App calls `getSiteDetail(site_id)` → gets site coordinates & radius
3. App calculates distance using Haversine formula
4. If within radius, calls `/workforce_attendance` INSERT
5. Backend validates again server-side

### Assignment Refresh Flow:
1. User pulls down to refresh
2. App calls `refreshProfile()`
3. `refreshProfile` calls `fetchUserProfile(user.id)`
4. `fetchUserProfile` queries `site_assignments` where `personnel_id = user.workforce_personnel_id AND is_active = true`
5. Returns updated user object with `current_assignment`

## Support Commands

### Check user's current cached assignment:
```javascript
// In React Native Debugger console:
console.log(user.current_assignment);
```

### Force profile refresh:
The user can:
1. Pull down on Guard Home screen (calls `refreshProfile()`)
2. Navigate away and back
3. Restart the app

## Files Modified

1. **mobile/src/api/attendanceService.ts** - Enhanced error message
2. **mobile/src/api/workforceAttendanceService.ts** - Enhanced error message  
3. **mobile/src/screens/GuardAttendanceScreen.tsx** - Enhanced error message with distance
4. **fix_assignment_geofence.sql** - New diagnostic & fix script

## Next Steps

1. Run the SQL diagnostic script
2. Follow the Quick Fix Steps above
3. Test with Manoj
4. If issues persist, check the detailed error messages and adjust accordingly
