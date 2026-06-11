# Implementation Plan

## Overview

This implementation plan transforms the Pan India Security workforce management system to support multi-category filtering with dynamic UI transformation. The system already has PersonnelCategoryContext implemented and integrated into several key screens (AdminDashboardScreen, WorkforcePersonnelListScreen, SiteDashboardScreen, WorkforceRosterScreen, PayrollListScreen). This plan focuses on completing the remaining integrations, adding role-based defaults, extending service layer filtering, and ensuring comprehensive UI transformation across all admin screens.

**Estimated Total Effort**: 8-10 hours

---

## Tasks

- [x] 1. Enhance PersonnelCategoryContext with Role-Based Defaults
  - Update PersonnelCategoryContext to support role-based default category selection based on user role (Admin → Guards, Operations Manager → All Personnel, Supervisor → site-specific category)
  - PersonnelCategoryContext accepts user role as initialization parameter
  - Default category is set to 'guards' for admin/super_admin roles
  - Default category is set to 'all' for operations_manager role
  - Default category is determined by site assignments for supervisor role
  - Context exposes a `resetToDefault()` function for session management
  - **Files**: `mobile/src/context/PersonnelCategoryContext.tsx`
  - **Effort**: 1 hour

- [x] 2. Integrate Role-Based Category Defaults in App Root
  - Initialize PersonnelCategoryProvider with user role information at the app root level to ensure role-based defaults are applied on login
  - PersonnelCategoryProvider is initialized with user role from AuthContext
  - Default category selection is applied immediately after authentication
  - Category selection persists during session but resets on logout
  - Client users do not see category switcher (conditional rendering)
  - **Files**: `mobile/App.tsx` or navigation root file, `mobile/src/context/PersonnelCategoryContext.tsx`
  - **Effort**: 45 minutes
  - **Depends on**: Task 1

- [x] 3. Extend Service Layer with Category Filtering
  - Add optional `categoryIds` parameter to all service functions that query workforce data, enabling backend filtering by category
  - `dashboardService.getDashboardOverview()` accepts optional `categoryIds` parameter
  - `workforcePersonnelService.getPersonnel()` accepts optional `categoryIds` parameter
  - `attendanceService.getAttendance()` accepts optional `category_ids` parameter
  - `siteAssignmentService.getRoster()` accepts optional `categoryIds` parameter
  - `analyticsService` functions accept optional `categoryIds` parameter
  - All parameters are optional to maintain backward compatibility
  - Service functions apply WHERE clause filtering when categoryIds is provided
  - **Files**: `mobile/src/api/dashboardService.ts`, `mobile/src/api/workforcePersonnelService.ts`, `mobile/src/api/attendanceService.ts`, `mobile/src/api/siteAssignmentService.ts`, `mobile/src/api/analyticsService.ts`
  - **Effort**: 2 hours

- [x] 4. Complete AdminDashboardScreen Category Integration
  - Verify and enhance AdminDashboardScreen to ensure all metrics, labels, and UI elements respond correctly to category filter changes with frontend recalculation
  - Dashboard metrics recalculate instantly when category filter changes (no backend calls)
  - All stat card labels use translated terms from `getLabel()`
  - Attendance overview legend uses translated plural labels
  - Management action buttons use translated labels (onboard, assign)
  - Bottom navigation "Workforce" tab label uses translated plural
  - Category switcher is hidden for client_user role
  - Pull-to-refresh updates cached data for all categories
  - **Files**: `mobile/src/screens/AdminDashboardScreen.tsx`
  - **Effort**: 1 hour
  - **Depends on**: Task 2, Task 3

- [x] 5. Complete WorkforcePersonnelListScreen Category Integration
  - Verify and enhance WorkforcePersonnelListScreen to filter personnel list by category and apply translated labels throughout the UI
  - Personnel list filters by `categoryFilterIds` on load and filter change
  - Screen title displays as "{plural} Directory"
  - "Add Personnel" button displays as "{onboard}"
  - Empty state message displays as "No {plural} found"
  - Result count displays as "{count} {plural} found"
  - Search and status filters respect active category filter
  - Category filter persists when navigating back from detail screens
  - **Files**: `mobile/src/screens/WorkforcePersonnelListScreen.tsx`
  - **Effort**: 45 minutes
  - **Depends on**: Task 2, Task 3

- [x] 6. Complete SiteDashboardScreen Category Integration
  - Verify and enhance SiteDashboardScreen to display category-specific workforce metrics and apply translated labels
  - All workforce metrics filter by `categoryFilterIds`
  - "Total Workforce" metric counts only personnel matching category filter
  - "Present Today" and "Absent Today" metrics filter by category
  - Workforce roster groups only show categories matching filter
  - Metric labels use translated terms: "Total {plural}", "{plural} Present", "{plural} Absent"
  - Vacant positions calculation respects category filter
  - Frontend recalculation completes within 100ms
  - **Files**: `mobile/src/screens/SiteDashboardScreen.tsx`
  - **Effort**: 1 hour
  - **Depends on**: Task 2, Task 3

- [x] 7. Complete WorkforceRosterScreen Category Integration
  - Verify and enhance WorkforceRosterScreen to filter roster by category and apply translated labels
  - Roster filters to show only assignments where personnel category matches `categoryFilterIds`
  - Screen title displays as "{plural} Roster"
  - "{assign} to Site" button uses translated assign label
  - Empty state message displays as "No {plural} assigned to sites"
  - Site grouping shows count of assigned personnel matching category filter
  - Date range and site filters respect active category filter
  - **Files**: `mobile/src/screens/WorkforceRosterScreen.tsx`
  - **Effort**: 45 minutes
  - **Depends on**: Task 2, Task 3

- [x] 8. Complete PayrollListScreen Category Integration
  - Verify and enhance PayrollListScreen to filter payroll records by category and apply translated labels with frontend metric recalculation
  - Payroll list filters by `categoryFilterIds` to show only records for matching personnel
  - Screen title displays as "{plural} Payroll"
  - Salary summary card calculates totals from filtered records only
  - Result count displays as "{count} {plural} payroll entries"
  - Month selection and status filters respect active category filter
  - Summary metrics (total base salary, overtime, deductions, net salary) recalculate in frontend
  - Recalculation completes within 100ms
  - **Files**: `mobile/src/screens/PayrollListScreen.tsx`
  - **Effort**: 1 hour
  - **Depends on**: Task 2, Task 3

- [x] 9. Integrate Category Filtering in ReportsScreen
  - Update ReportsScreen to apply category-specific labels to report titles and filter report data by active category
  - "Personnel Directory Report" title displays as "{plural} Directory Report"
  - "Attendance Report" title displays as "{plural} Attendance Report"
  - "Deployment Report" title displays as "{plural} Deployment Report"
  - "Payroll Summary Report" title displays as "{plural} Payroll Summary Report"
  - Generated reports filter data by `categoryFilterIds`
  - Report headers include active category group name for traceability
  - All report generation functions respect category filter
  - **Files**: `mobile/src/screens/ReportsScreen.tsx`
  - **Effort**: 1.5 hours
  - **Depends on**: Task 3

- [x] 10. Integrate Category Filtering in AnalyticsDashboardScreen
  - Update AnalyticsDashboardScreen to filter all analytics data by category and apply translated labels to chart titles
  - All analytics data re-fetches with `categoryFilterIds` when filter changes (within 500ms)
  - "Workforce Distribution" chart title displays as "{plural} Distribution by Site"
  - "Attendance Trends" chart title displays as "{plural} Attendance Trends"
  - "Turnover Rate" chart title displays as "{plural} Turnover Rate"
  - All chart data filters to include only personnel matching `categoryFilterIds`
  - Analytics metrics (attendance %, turnover rate, vacancy rate) recalculate in frontend
  - "All Personnel" selection aggregates across all four category groups
  - **Files**: `mobile/src/screens/AnalyticsDashboardScreen.tsx`
  - **Effort**: 1.5 hours
  - **Depends on**: Task 3

- [x] 11. Implement Client User Category Visibility Logic
  - Implement automatic category scoping for client users based on their assigned site's deployed personnel categories, without displaying the category switcher
  - On client_user login, system queries active SiteAssignment records for their site
  - Category filter automatically sets to include only categories deployed at their site
  - Category switcher component is hidden for client_user role
  - All data queries for client users apply site-scoped category filter
  - UI labels use translated plural if one category group, or "Workforce" if multiple
  - Client users cannot change category filter (fixed for session)
  - **Files**: `mobile/src/context/PersonnelCategoryContext.tsx`, `mobile/src/screens/AdminDashboardScreen.tsx`
  - **Effort**: 1 hour
  - **Depends on**: Task 1

- [x] 12. Implement Supervisor Category Default Logic
  - Implement logic to determine supervisor's default category based on their assigned sites' deployed personnel categories
  - On supervisor login, system queries SiteAssignment records for their assigned sites
  - If sites have personnel from only one category group, default to that group
  - If sites have personnel from multiple category groups, default to "All Personnel"
  - Supervisors can change category filter using category switcher
  - Category filter applies to all supervisor screens (dashboard, attendance, complaints)
  - All supervisor data queries scope to their assigned sites regardless of category filter
  - **Files**: `mobile/src/context/PersonnelCategoryContext.tsx`, `mobile/src/screens/SupervisorDashboardScreen.tsx`
  - **Effort**: 1 hour
  - **Depends on**: Task 1

- [x] 13. Add Performance Optimizations for Category Switching
  - Implement data caching and frontend recalculation to ensure category filter changes complete within 100-200ms without loading spinners
  - AdminDashboardScreen prefetches personnel and attendance data for all categories on mount
  - Data is cached in component state (personnel capped at 1000 records, attendance at 500/day)
  - Category filter changes trigger frontend recalculation only (no backend calls)
  - Visual chip state updates within 100ms
  - UI label updates complete within 100ms
  - Metric recalculations complete within 200ms on standard mobile device
  - No loading spinners displayed when switching categories (if data cached)
  - Pull-to-refresh updates cached data
  - **Files**: `mobile/src/screens/AdminDashboardScreen.tsx`, `mobile/src/screens/SiteDashboardScreen.tsx`, `mobile/src/screens/PayrollListScreen.tsx`
  - **Effort**: 1.5 hours
  - **Depends on**: Task 4, Task 5, Task 6, Task 7, Task 8

- [x] 14. Add Category Filter Validation and Error Handling
  - Implement validation to ensure category IDs referenced in category groups exist in the database, with graceful error handling
  - PersonnelCategoryContext validates all category IDs against fetched categories
  - If a category ID in a group mapping doesn't exist, log warning and exclude it
  - If all category IDs in a group are invalid, display error message to user
  - Category switcher gracefully handles empty category lists
  - Service layer handles empty `categoryFilterIds` array (treats as "all")
  - Error messages are user-friendly and actionable
  - **Files**: `mobile/src/context/PersonnelCategoryContext.tsx`, Service layer files
  - **Effort**: 45 minutes
  - **Depends on**: Task 1, Task 3

- [x] 15. Update Navigation Labels with Category Context
  - Ensure all navigation labels (bottom nav, drawer, tab bars) use translated category labels from PersonnelCategoryContext
  - Bottom navigation "Workforce" tab uses `getLabel('plural')`
  - Drawer menu "Workforce" item uses `getLabel('plural')`
  - Any tab bars with workforce-related tabs use translated labels
  - Navigation labels update within 100ms of category filter change
  - Labels are consistent across all navigation components
  - **Files**: `mobile/src/screens/AdminDashboardScreen.tsx`, Navigation configuration files
  - **Effort**: 30 minutes
  - **Depends on**: Task 4

- [x] 16. Add Comprehensive Testing for Category Filtering
  - Create test suite to verify category filtering works correctly across all screens and roles
  - Verify role-based default category selection for each role
  - Verify category switcher updates global state correctly
  - Verify all screens filter data by active category
  - Verify UI labels translate correctly for each category
  - Verify frontend metric recalculation accuracy
  - Verify client users see correct category scope
  - Verify supervisors see correct default category
  - Verify backward compatibility when "Guards" is selected
  - Verify performance (category switch < 200ms)
  - Verify category filter persists during navigation
  - **Files**: `mobile/src/__tests__/PersonnelCategoryContext.test.tsx`, `mobile/src/__tests__/CategoryFiltering.integration.test.tsx`
  - **Effort**: 2 hours
  - **Depends on**: Task 13, Task 14, Task 15

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 1,
      "tasks": [1, 3]
    },
    {
      "id": 2,
      "tasks": [2, 11, 12, 14]
    },
    {
      "id": 3,
      "tasks": [4, 5, 6, 7, 8, 9, 10]
    },
    {
      "id": 4,
      "tasks": [13, 15]
    },
    {
      "id": 5,
      "tasks": [16]
    }
  ]
}
```

---

## Notes

### Implementation Priority
1. **Phase 1 (Foundation)**: Tasks 1-3 establish the core infrastructure
2. **Phase 2 (Screen Integration)**: Tasks 4-10 complete UI transformation across all screens
3. **Phase 3 (Role Logic)**: Tasks 11-12 implement role-specific behavior
4. **Phase 4 (Polish)**: Tasks 13-15 optimize performance and consistency
5. **Phase 5 (Quality)**: Task 16 ensures comprehensive testing

### Existing Implementation
The following components are already implemented:
- PersonnelCategoryContext with category groups and label translation
- Category switcher UI on AdminDashboardScreen
- Basic category filtering in AdminDashboardScreen, WorkforcePersonnelListScreen, SiteDashboardScreen, WorkforceRosterScreen, PayrollListScreen

### Key Technical Decisions
- **Frontend-first filtering**: Dashboard metrics recalculate in React Native app using cached data for instant response
- **Optional service parameters**: All service layer `categoryIds` parameters are optional for backward compatibility
- **Role-based defaults**: Context initialization determines default category based on user role
- **Performance targets**: Category switch < 100ms (UI), metric recalc < 200ms (data)

### Testing Strategy
- Unit tests for PersonnelCategoryContext logic
- Integration tests for category filtering across screens
- Performance tests for category switch timing
- Role-based behavior tests for each user role
- Backward compatibility tests for "Guards" selection

### Rollout Plan
1. Deploy with "Guards" as default for all existing users (zero disruption)
2. Train operations managers on "All Personnel" view
3. Configure supervisor defaults based on site assignments
4. Enable client user automatic scoping
5. Monitor performance metrics and user feedback
