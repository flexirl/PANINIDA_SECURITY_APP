# Personnel Category Filtering - Setup Instructions

## Error: "No categories found in database for category group 'guards'"

This error means your Supabase database doesn't have the required workforce categories yet.

## Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Category Setup Script

Copy and paste the contents of `QUICK_START_CATEGORIES.sql` into the SQL Editor and click **Run**.

This will create 8 workforce categories:
- **Guards Group**: Guard
- **Gunman Personnel Group**: Gunman, Rifleman, PSO
- **Bouncers Group**: Bouncer
- **Helpers/Housekeeping Group**: Housekeeping, Sweeper, Gardener

### Step 3: Verify Categories Were Created

After running the script, you should see output showing 8 rows with the categories.

### Step 4: Restart Your App

1. Stop your Expo development server (Ctrl+C)
2. Clear the cache: `npx expo start --clear`
3. Restart the app

The error should now be gone!

---

## Full Test Data Setup (Optional - 15 minutes)

If you want to test with sample personnel and attendance data:

### Step 1: Run the Full Test Data Script

1. Open Supabase SQL Editor
2. Copy and paste the contents of `mobile/src/__mocks__/supabase_test_data.sql`
3. Click **Run**

This will create:
- 8 workforce categories
- 60 test users
- 60 workforce personnel records:
  - 20 Guards
  - 15 Gunman Personnel (5 Gunman, 5 Rifleman, 5 PSO)
  - 10 Bouncers
  - 15 Helpers (8 Housekeeping, 4 Sweeper, 3 Gardener)
- 60 attendance records for today (60% present, 20% late, 20% absent)

### Step 2: Verify Data

Run these verification queries in SQL Editor:

```sql
-- Check category counts
SELECT 
  c.name as category,
  COUNT(p.id) as personnel_count
FROM workforce_categories c
LEFT JOIN workforce_personnel p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Check attendance summary
SELECT 
  status,
  COUNT(*) as count
FROM workforce_attendance
WHERE attendance_date = CURRENT_DATE
GROUP BY status;
```

### Step 3: Test the Category Filter

1. Open the app
2. Log in as an admin user
3. You should see the category switcher with 5 options:
   - All Personnel
   - Guards
   - Gunman Personnel
   - Bouncers
   - Helpers / Housekeeping
4. Click each category to see the filtered data

---

## Troubleshooting

### Error: "fetchCategories is not a function"

This usually means there's an import issue. Make sure:
1. The file `mobile/src/api/workforceCategoryService.ts` exists
2. The `getCategories` function is exported correctly
3. You've run `npm install` in the mobile directory

### Error: "No categories found"

1. Make sure you ran `QUICK_START_CATEGORIES.sql` in Supabase
2. Check that your Supabase connection is working
3. Verify the `workforce_categories` table exists in your database

### Categories show but no personnel

1. Run the full test data script: `mobile/src/__mocks__/supabase_test_data.sql`
2. Or manually add personnel through the app's "Onboard Guard" feature

### Too many re-renders error

This has been fixed in the latest code. Make sure you have the updated `PersonnelCategoryContext.tsx` with `React.useMemo` for `categoryFilterIds`.

---

## Testing Checklist

After setup, test these features:

- [ ] Category switcher appears on Admin Dashboard
- [ ] Clicking "Guards" shows only Guard personnel
- [ ] Clicking "Gunman Personnel" shows Gunman, Rifleman, and PSO
- [ ] Clicking "Bouncers" shows only Bouncers
- [ ] Clicking "Helpers / Housekeeping" shows Housekeeping, Sweeper, Gardener
- [ ] Clicking "All Personnel" shows everyone
- [ ] Dashboard metrics update when category changes
- [ ] Attendance overview updates when category changes
- [ ] UI labels change (e.g., "Guards" vs "Gunmen" vs "All Personnel")
- [ ] Category filter persists when navigating between screens
- [ ] No loading spinners when switching categories (instant update)

---

## Clean Up Test Data

If you want to remove all test data:

```sql
-- Run this in Supabase SQL Editor
DELETE FROM workforce_attendance WHERE id LIKE 'attendance-%';
DELETE FROM workforce_personnel WHERE id LIKE 'guard-%' OR id LIKE 'gunman-%' OR id LIKE 'bouncer-%' OR id LIKE 'helper-%';
DELETE FROM users WHERE id LIKE 'user-guard-%' OR id LIKE 'user-gunman-%' OR id LIKE 'user-bouncer-%' OR id LIKE 'user-helper-%';
```

Note: This will NOT delete the categories, only the test personnel and attendance data.

---

## Need Help?

If you're still seeing errors:

1. Check the console logs for detailed error messages
2. Verify your Supabase connection in `mobile/src/api/supabase.ts`
3. Make sure all dependencies are installed: `cd mobile && npm install`
4. Clear Expo cache: `npx expo start --clear`
