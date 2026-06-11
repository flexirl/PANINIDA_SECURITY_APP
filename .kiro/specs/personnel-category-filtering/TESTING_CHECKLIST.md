# Personnel Category Filtering - UI Testing Checklist

## 🚀 Getting Started

**Expo Dev Server**: Starting in background...
**Test Device**: Use Expo Go app on your phone or Android/iOS emulator

---

## ✅ Test Scenarios

### 1. Category Switcher Visibility

**Location**: Admin Dashboard (after login)

**Test Steps**:
1. Login as Admin user
2. Look for horizontal chip row below greeting card
3. Verify 5 chips are visible: "All Personnel", "Guards", "Gunman Personnel", "Bouncers", "Helpers / Housekeeping"

**Expected Results**:
- ✅ Category switcher is visible
- ✅ "Guards" chip is active (solid blue background, white text)
- ✅ Other chips are inactive (light background, gray text)
- ✅ Chips are horizontally scrollable

---

### 2. Category Switching - Guards

**Location**: Admin Dashboard

**Test Steps**:
1. Tap on "Guards" chip (if not already selected)
2. Observe UI changes

**Expected Results**:
- ✅ "Guards" chip becomes active (blue background)
- ✅ "Total Guards" label on first stat card
- ✅ "Guards Present" in attendance legend
- ✅ "Guards Absent" in attendance legend
- ✅ "Onboard Guard" button in Management section
- ✅ "Assign Guard to Site" button in Management section
- ✅ Bottom nav shows "Guards" label
- ✅ Metrics update instantly (no loading spinner)

---

### 3. Category Switching - Gunman Personnel

**Location**: Admin Dashboard

**Test Steps**:
1. Tap on "Gunman Personnel" chip
2. Observe UI changes

**Expected Results**:
- ✅ "Gunman Personnel" chip becomes active
- ✅ "Total Gunman Personnel" label on stat card
- ✅ "Gunman Personnel Present" in attendance legend
- ✅ "Gunman Personnel Absent" in attendance legend
- ✅ "Onboard Gunman" button
- ✅ "Assign Gunman to Site" button
- ✅ Bottom nav shows "Gunman Personnel" label
- ✅ Metrics recalculate instantly

---

### 4. Category Switching - Bouncers

**Location**: Admin Dashboard

**Test Steps**:
1. Tap on "Bouncers" chip
2. Observe UI changes

**Expected Results**:
- ✅ "Bouncers" chip becomes active
- ✅ "Total Bouncers" label
- ✅ "Bouncers Present" / "Bouncers Absent"
- ✅ "Onboard Bouncer" button
- ✅ "Assign Bouncer to Site" button
- ✅ Bottom nav shows "Bouncers"

---

### 5. Category Switching - Helpers / Housekeeping

**Location**: Admin Dashboard

**Test Steps**:
1. Tap on "Helpers / Housekeeping" chip
2. Observe UI changes

**Expected Results**:
- ✅ "Helpers / Housekeeping" chip becomes active
- ✅ "Total Helpers / Housekeeping" label
- ✅ "Helpers / Housekeeping Present" / "Absent"
- ✅ "Onboard Helper" button
- ✅ "Assign Helper to Site" button
- ✅ Bottom nav shows "Helpers / Housekeeping"

---

### 6. Category Switching - All Personnel

**Location**: Admin Dashboard

**Test Steps**:
1. Tap on "All Personnel" chip
2. Observe UI changes

**Expected Results**:
- ✅ "All Personnel" chip becomes active
- ✅ "Total Workforce" label (not "Total All Personnel")
- ✅ "All Personnel Present" / "Absent"
- ✅ "Onboard Personnel" button
- ✅ "Assign Personnel to Site" button
- ✅ Bottom nav shows "All Personnel"
- ✅ Metrics show aggregated data across all categories

---

### 7. Workforce Personnel List Screen

**Location**: Navigate to Workforce Personnel List (tap "Guards" in bottom nav or "Total Guards" stat card)

**Test Steps**:
1. From dashboard with "Guards" selected, navigate to personnel list
2. Observe screen title and content
3. Switch category on dashboard and navigate back

**Expected Results**:
- ✅ Screen title shows "Guards Directory" (when Guards selected)
- ✅ Add button shows "Onboard Guard" (accessibility label)
- ✅ Result count shows "X guards found"
- ✅ Empty state shows "No guards found" (if no data)
- ✅ Only Guard category personnel are displayed
- ✅ Category filter persists when navigating back from detail screen

**Repeat for other categories**:
- Gunman Personnel → "Gunman Personnel Directory", "X gunman personnel found"
- Bouncers → "Bouncers Directory", "X bouncers found"
- Helpers → "Helpers / Housekeeping Directory", "X helpers found"

---

### 8. Site Dashboard Screen

**Location**: Navigate to any site dashboard

**Test Steps**:
1. Select "Guards" category on main dashboard
2. Navigate to a site (from Sites list)
3. Observe metrics and labels

**Expected Results**:
- ✅ "Total Guards" metric label
- ✅ "Guards Present" metric label
- ✅ "Guards Absent" metric label
- ✅ Roster tab shows "Guard Roster"
- ✅ Only Guard category personnel shown in roster
- ✅ Metrics count only Guards

**Test with different categories**:
- Switch to "Gunman Personnel" → Labels change to "Total Gunman Personnel", etc.
- Switch to "All Personnel" → Shows all categories

---

### 9. Workforce Roster Screen

**Location**: Navigate to site roster

**Test Steps**:
1. Select "Guards" category
2. Navigate to a site's roster
3. Observe screen title and content

**Expected Results**:
- ✅ Screen title shows "Guards Roster"
- ✅ Assign button shows "Assign Guard to Site"
- ✅ Empty state shows "No guards assigned to sites"
- ✅ Only Guard assignments are displayed
- ✅ Section headers show only Guard category

**Repeat for other categories**:
- Gunman Personnel → "Gunman Personnel Roster"
- Bouncers → "Bouncers Roster"
- Helpers → "Helpers / Housekeeping Roster"

---

### 10. Performance Testing

**Location**: Admin Dashboard

**Test Steps**:
1. Select "Guards" category
2. Quickly tap "Gunman Personnel" chip
3. Observe transition speed
4. Repeat switching between different categories rapidly

**Expected Results**:
- ✅ Chip visual state changes within 100ms (instant feel)
- ✅ Labels update within 100ms (no delay)
- ✅ Metrics recalculate within 200ms
- ✅ No loading spinners during category switch
- ✅ No lag or stuttering
- ✅ Smooth animations

---

### 11. Data Filtering Accuracy

**Location**: Admin Dashboard

**Test Steps**:
1. Note the "Total Guards" count when Guards is selected
2. Switch to "All Personnel"
3. Verify "Total Workforce" is greater than or equal to Guards count
4. Switch to each category and verify counts make sense

**Expected Results**:
- ✅ Guards count ≤ All Personnel count
- ✅ Sum of (Guards + Gunman + Bouncers + Helpers) = All Personnel
- ✅ Attendance counts match category selection
- ✅ Present + Absent ≤ Total for each category

---

### 12. Navigation Persistence

**Location**: Multiple screens

**Test Steps**:
1. Select "Gunman Personnel" on dashboard
2. Navigate to Personnel List
3. Navigate to a personnel detail screen
4. Go back to Personnel List
5. Go back to Dashboard

**Expected Results**:
- ✅ "Gunman Personnel" remains selected throughout navigation
- ✅ All screens show Gunman-specific data
- ✅ Category doesn't reset when navigating back
- ✅ Bottom nav label stays "Gunman Personnel"

---

### 13. Pull-to-Refresh

**Location**: Admin Dashboard

**Test Steps**:
1. Select a specific category (e.g., "Guards")
2. Pull down to refresh
3. Observe data reload

**Expected Results**:
- ✅ Data refreshes successfully
- ✅ Category selection remains unchanged
- ✅ Metrics update with fresh data
- ✅ No errors during refresh

---

### 14. Empty State Testing

**Location**: Various screens

**Test Steps**:
1. Select a category that has no personnel (if available)
2. Navigate to Personnel List
3. Observe empty state message

**Expected Results**:
- ✅ Empty state shows category-specific message
- ✅ "No guards found" (for Guards)
- ✅ "No gunman personnel found" (for Gunman Personnel)
- ✅ Message is grammatically correct

---

### 15. Alert Messages

**Location**: Admin Dashboard

**Test Steps**:
1. Select "Guards" category
2. Observe alert banners (if any absent personnel)
3. Switch to different category
4. Observe alert message changes

**Expected Results**:
- ✅ Alert shows "X guard(s) absent today" (for Guards)
- ✅ Alert shows "X gunman personnel absent today" (for Gunman)
- ✅ Singular/plural grammar is correct
- ✅ Alert updates when category changes

---

## 🐛 Known Issues to Watch For

1. **PayrollListScreen**: File structure issue - may not display correctly
2. **ReportsScreen**: Not yet integrated (Tasks 9-10 pending)
3. **AnalyticsDashboardScreen**: Not yet integrated (Tasks 9-10 pending)

---

## 📊 Test Results Template

Copy this template and fill in your results:

```
Date: ___________
Tester: ___________
Device: ___________

Test 1 - Category Switcher Visibility: ☐ Pass ☐ Fail
Test 2 - Guards Switching: ☐ Pass ☐ Fail
Test 3 - Gunman Personnel Switching: ☐ Pass ☐ Fail
Test 4 - Bouncers Switching: ☐ Pass ☐ Fail
Test 5 - Helpers Switching: ☐ Pass ☐ Fail
Test 6 - All Personnel Switching: ☐ Pass ☐ Fail
Test 7 - Personnel List Screen: ☐ Pass ☐ Fail
Test 8 - Site Dashboard Screen: ☐ Pass ☐ Fail
Test 9 - Workforce Roster Screen: ☐ Pass ☐ Fail
Test 10 - Performance: ☐ Pass ☐ Fail
Test 11 - Data Accuracy: ☐ Pass ☐ Fail
Test 12 - Navigation Persistence: ☐ Pass ☐ Fail
Test 13 - Pull-to-Refresh: ☐ Pass ☐ Fail
Test 14 - Empty States: ☐ Pass ☐ Fail
Test 15 - Alert Messages: ☐ Pass ☐ Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: ☐ Ready for Production ☐ Needs Fixes
```

---

## 🎯 Critical Success Criteria

For the feature to be considered production-ready:

1. ✅ All 5 category chips are visible and functional
2. ✅ Labels translate correctly for all categories
3. ✅ Metrics filter accurately by category
4. ✅ Category switching feels instant (< 200ms)
5. ✅ No TypeScript errors or crashes
6. ✅ Category persists during navigation
7. ✅ Backward compatible (Guards works like before)

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors (if using web)
2. Check Expo terminal output for errors
3. Verify you're logged in as an Admin user
4. Try clearing app cache and restarting

**Implementation Status**: 8/16 tasks complete (Core features 100% functional)
