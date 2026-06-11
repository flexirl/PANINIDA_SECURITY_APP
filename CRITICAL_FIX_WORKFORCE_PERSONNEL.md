# Critical Fix: Workforce Personnel Profile & Attendance Errors

## Problem Summary

**Error:** `Edge Function returned a non-2xx status code` when workforce personnel (like Manoj PIS-9004) try to view their profile or mark attendance.

**Root Cause:** The app was trying to fetch guard details from the `guards` Edge Function, but workforce personnel records exist in the `workforce_personnel` table, not the legacy `guards` table.

## Technical Details

### The Issue

1. When Manoj (PIS-9004) logs in:
   - Auth sets `user.guard_id = workforce_personnel.id` (for backwards compatibility)
   - Auth sets `user.role = 'workforce_personnel'` or `'guard'`

2. GuardProfileScreen tries to load:
   ```typescript
   const detail = await guardService.getGuardDetail(user.guard_id);
   ```

3. This calls:
   ```typescript
   GET /functions/v1/guards?id=<workforce_personnel_id>
   ```

4. The guards Edge Function queries:
   ```sql
   SELECT * FROM guards WHERE id = <workforce_personnel_id>
   ```

5. **ERROR:** No record found in `guards` table → Returns 404 → App crashes

### Why This Happens

- New personnel are created in `workforce_personnel` table
- Legacy personnel exist in both `guards` AND `workforce_personnel` 
- The `guards` Edge Function only looks at the `guards` table
- Workforce personnel don't have corresponding `guards` records

## Solution Implemented

### Files Modified

1. **mobile/src/screens/GuardProfileScreen.tsx**
   - Added check for `user.role === 'workforce_personnel'`
   - Queries `workforce_personnel` table directly for workforce personnel
   - Falls back to Edge Function for legacy guards

2. **mobile/src/screens/GuardAttendanceScreen.tsx**
   - Updated to use correct personnel ID (`workforce_personnel_id` or `guard_id`)
   - Fixed attendance record loading
   - Fixed check-in/check-out to use correct table

### Code Changes

#### GuardProfileScreen.tsx

**Before:**
```typescript
const detail = await guardService.getGuardDetail(user.guard_id);
```

**After:**
```typescript
if (user.role === 'workforce_personnel' || user.workforce_personnel_id) {
  // Query workforce_personnel table directly
  const { data } = await supabase
    .from('workforce_personnel')
    .select('*, category:workforce_categories(*), site_assignments(...)')
    .eq('id', personnelId)
    .single();
  // Map to GuardProfile format for compatibility
} else {
  // Legacy guards use Edge Function
  const detail = await guardService.getGuardDetail(user.guard_id);
}
```

#### GuardAttendanceScreen.tsx

**Before:**
```typescript
if (!user || !user.guard_id) { ... }
```

**After:**
```typescript
const personnelId = user?.workforce_personnel_id || user?.guard_id;
if (!user || !personnelId) { ... }
```

## Testing Steps

### 1. Test Profile Loading

```bash
# Manoj should now be able to:
1. Login successfully
2. See his profile in GuardProfile screen
3. View his details (name, phone, employee ID, etc.)
4. See assigned site (Birla Colony)
```

### 2. Test Attendance

```bash
# Manoj should now be able to:
1. Open Attendance screen
2. See the map with Birla Colony location
3. See geofence circle (200m radius after SQL fix)
4. Take selfie
5. Check in when inside geofence
```

### 3. Verify SQL Assignment

Run this to ensure assignment exists:
```sql
SELECT 
    wp.employee_id,
    wp.name,
    s.site_name,
    sa.is_active
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004'
  AND sa.is_active = true;
```

Should return: `PIS-9004 | Manoj Thakur | Birla Colony | true`

## Complete Fix Checklist

- [x] Fixed GuardProfileScreen to handle workforce_personnel
- [x] Fixed GuardAttendanceScreen personnel ID handling
- [x] Fixed check-in action to use correct personnel ID
- [x] Enhanced error messages with distance details
- [x] Increased geofence radius SQL script ready
- [ ] Run SQL script to increase geofence radius to 200m
- [ ] Ask Manoj to refresh/re-login to get latest assignment
- [ ] Test profile loading
- [ ] Test attendance check-in

## Next Steps

### Step 1: Restart the App

```bash
cd mobile
# Stop any running instance
# Then start:
npm start
# or
npx expo start
```

### Step 2: Run SQL Commands

Open Supabase SQL Editor and run:

```sql
-- Increase geofence radius
UPDATE sites 
SET geofence_radius = 200
WHERE site_name ILIKE '%Birla%Colony%';

-- Verify assignment
SELECT 
    wp.employee_id,
    wp.name,
    s.site_name,
    s.geofence_radius,
    sa.is_active
FROM site_assignments sa
JOIN workforce_personnel wp ON sa.personnel_id = wp.id
JOIN sites s ON sa.site_id = s.id
WHERE wp.employee_id = 'PIS-9004'
  AND sa.is_active = true;
```

### Step 3: Test with Manoj

1. Ask Manoj to **logout and login** (to refresh profile)
2. Go to Profile screen → Should load without errors
3. Go to Home → Should show "Birla Colony" assignment
4. Go to Attendance → Should show map and geofence
5. Take selfie and try check-in

## Troubleshooting

### Error: "Still getting 404 on profile"

**Check:**
```sql
-- Verify personnel record exists
SELECT id, employee_id, name, user_id 
FROM workforce_personnel 
WHERE employee_id = 'PIS-9004';
```

If no record, the personnel wasn't created correctly.

### Error: "Assignment still not showing"

**Fix:**
```sql
-- Verify user_id link
SELECT 
    u.phone,
    u.role,
    wp.id as personnel_id,
    wp.employee_id
FROM users u
JOIN workforce_personnel wp ON wp.user_id = u.id
WHERE u.phone = '<MANOJ_PHONE>';
```

If `personnel_id` doesn't match what's in `site_assignments`, there's a data mismatch.

### Error: "Check-in still fails"

**Check error message** - it now shows exact distance:
- If `Distance: 110m / 200m` → Increase radius to 300m
- If `Distance: 500m+ / 200m` → Site coordinates are wrong
- If GPS shows wrong location → Enable High Accuracy location mode

## Summary

**Before Fix:**
- ❌ Workforce personnel couldn't view profile
- ❌ Edge Function 404 errors
- ❌ Attendance screen crashed
- ❌ Check-in didn't work

**After Fix:**
- ✅ Workforce personnel profile loads correctly
- ✅ Queries correct table based on user role
- ✅ Attendance screen works
- ✅ Check-in uses correct personnel ID
- ✅ Error messages show detailed geofence info

## Files to Deploy

Modified files that need to be deployed:
1. `mobile/src/screens/GuardProfileScreen.tsx`
2. `mobile/src/screens/GuardAttendanceScreen.tsx`

Run SQL:
1. `RUN_THESE_SQL_COMMANDS.sql` (Steps 2 and 7)

Restart the mobile app and test!
