# 🚨 Quick Fix Guide - Personnel Category Filtering

## Error: "No categories found in database for category group 'guards'"

### ⚡ 2-Minute Fix

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy this SQL** and click Run:

```sql
INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined)
VALUES 
  ('Guard', 'PIS', true, true),
  ('Gunman', 'GM', true, true),
  ('Rifleman', 'RM', true, true),
  ('PSO', 'PSO', true, true),
  ('Bouncer', 'BNC', true, true),
  ('Housekeeping', 'HK', false, true),
  ('Sweeper', 'SWP', false, true),
  ('Gardener', 'GRD', false, true)
ON CONFLICT (name) DO NOTHING;
```

3. **Restart your app**: `npx expo start --clear`

✅ **Done!** The error should be gone.

---

## Error: "Too many re-renders"

### ⚡ Already Fixed!

The latest code has this fix. Make sure your `PersonnelCategoryContext.tsx` has:

```typescript
const categoryFilterIds = React.useMemo(() => {
  return getIdsForCategory(selectedCategory);
}, [selectedCategory, categories, clientScopedCategoryIds, userRole]);
```

If you still see this error, pull the latest code.

---

## Want Test Data?

### ⚡ 5-Minute Setup

Run this in Supabase SQL Editor:

**File**: `mobile/src/__mocks__/supabase_test_data.sql`

This creates:
- 60 test personnel (20 Guards, 15 Gunman Personnel, 10 Bouncers, 15 Helpers)
- Today's attendance records (60% present, 20% late, 20% absent)

---

## Testing the Feature

### ✅ Quick Test Checklist

1. Open Admin Dashboard
2. See category switcher with 5 options
3. Click "Guards" → Should show only Guards
4. Click "Gunman Personnel" → Should show Gunman/Rifleman/PSO
5. Click "All Personnel" → Should show everyone
6. Metrics should update instantly (< 200ms)
7. Labels should change (e.g., "Guards" → "Gunmen")

---

## Files You Need

| File | Purpose | Required? |
|------|---------|-----------|
| `QUICK_START_CATEGORIES.sql` | Creates 8 categories | ✅ YES |
| `supabase_test_data.sql` | Creates test personnel | ⚠️ Optional |
| `SETUP_INSTRUCTIONS.md` | Detailed setup guide | 📖 Reference |
| `CATEGORY_FILTERING_SUMMARY.md` | Implementation summary | 📖 Reference |

---

## Still Having Issues?

### Check These:

1. ✅ Ran `QUICK_START_CATEGORIES.sql` in Supabase?
2. ✅ Restarted app with `--clear` flag?
3. ✅ Supabase connection working?
4. ✅ All dependencies installed? (`npm install`)

### Get Detailed Help:

See `SETUP_INSTRUCTIONS.md` for:
- Troubleshooting steps
- Verification queries
- Clean up scripts
- Testing checklist

---

## Quick Commands

```bash
# Install dependencies
cd mobile && npm install

# Clear cache and start
npx expo start --clear

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## 🎯 Expected Behavior

### Category Switcher
- Shows 5 chips: All Personnel, Guards, Gunman Personnel, Bouncers, Helpers/Housekeeping
- Active chip has blue background
- Inactive chips have light gray background

### When You Click a Category
- ⚡ UI updates instantly (< 100ms)
- 📊 Metrics recalculate (< 200ms)
- 🏷️ Labels transform (e.g., "Guards" → "Gunmen")
- 🚫 No loading spinners
- ✅ Filter persists when navigating

### Dashboard Metrics
- Total Workforce → Total [Category]
- Present Today → [Category] Present
- Attendance legend → Present: X [Category]

---

## 💡 Pro Tips

1. **First time setup**: Run both SQL scripts (categories + test data)
2. **Testing**: Use test data to see all categories populated
3. **Production**: Only run `QUICK_START_CATEGORIES.sql`
4. **Performance**: Frontend caching means instant category switches
5. **Cleanup**: Use cleanup script in `supabase_test_data.sql` to remove test data

---

## 📞 Need More Help?

1. Check console logs for detailed errors
2. Read `SETUP_INSTRUCTIONS.md` for step-by-step guide
3. Review `CATEGORY_FILTERING_SUMMARY.md` for implementation details
4. Verify your Supabase connection in `mobile/src/api/supabase.ts`
