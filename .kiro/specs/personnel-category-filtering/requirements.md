# Requirements Document

## Introduction

Pan India Security currently operates a workforce management system that displays all personnel data uniformly across admin screens. This feature introduces a **Global Category Filtering and Dynamic UI Transformation System** that allows administrators to view and manage workforce data through category-specific lenses. When a category group is selected, the entire admin interface transforms to display terminology, labels, metrics, and data specific to that category, creating the experience of using a dedicated management system for that workforce type.

The system supports four fixed category groups initially (Guards, Gunman Personnel, Bouncers, Helpers/Housekeeping) with an "All Personnel" view for comprehensive oversight. The transformation is seamless and affects all admin screens including dashboards, personnel lists, rosters, payroll, reports, and analytics. Role-based default selections ensure backward compatibility with the original Guard-focused application while enabling operations managers to oversee the entire workforce.

---

## Glossary

- **Platform**: The Pan India Security React Native/Expo mobile application backed by Supabase.
- **Category_Group**: A named collection of one or more Personnel_Categories that share common management characteristics (e.g., "Guards" group contains only Guard category; "Gunman Personnel" group contains Gunman, Rifleman, PSO categories).
- **Category_Filter**: The active Category_Group selection that determines which workforce data is displayed and how UI labels are rendered.
- **UI_Transformation**: The dynamic process of changing screen titles, button labels, field names, and terminology based on the active Category_Filter.
- **Label_Translation_Engine**: The system component responsible for mapping generic UI terms to category-specific terminology.
- **Category_Switcher**: The UI component (chip row) that allows users to select a Category_Group.
- **Admin**: A company-level user who manages all Sites and Workforce_Personnel.
- **Super_Admin**: The highest-privilege system role with unrestricted access.
- **Operations_Manager**: A user who oversees multiple Sites and the entire workforce across all categories.
- **Supervisor**: A Workforce_Personnel with the Supervisor role who manages one or more Sites.
- **Client_User**: A read-only portal user representing a client contact.
- **Personnel_Category**: A named classification of Workforce_Personnel (e.g., Guard, Housekeeping, Electrician).
- **Workforce_Personnel**: Any employee managed by the Platform, regardless of category.
- **Category_Filter_IDs**: The array of Personnel_Category IDs corresponding to the active Category_Group selection.
- **Frontend_Recalculation**: Computing dashboard metrics and statistics in the React Native app using filtered data rather than calling backend aggregation functions.

---

## Requirements

---

### Requirement 1: Category Group Definition and Management

**User Story:** As a Super_Admin, I want the system to support four fixed category groups with defined mappings to personnel categories, so that administrators can filter and view workforce data by logical groupings.

#### Acceptance Criteria

1. THE Platform SHALL define exactly four Category_Groups at initial deployment: "Guards", "Gunman Personnel", "Bouncers", "Helpers/Housekeeping".
2. THE Platform SHALL map the "Guards" Category_Group to the single Personnel_Category with prefix_code "PIS" (Guard).
3. THE Platform SHALL map the "Gunman Personnel" Category_Group to the Personnel_Categories with prefix_codes "GM" (Gunman), "RM" (Rifleman), "PSO" (PSO).
4. THE Platform SHALL map the "Bouncers" Category_Group to the single Personnel_Category with prefix_code "BNC" (Bouncer).
5. THE Platform SHALL map the "Helpers/Housekeeping" Category_Group to the Personnel_Categories with prefix_codes "HK" (Housekeeping), "SWP" (Sweeper), "GRD" (Gardener).
6. THE Platform SHALL provide an "All Personnel" Category_Group that includes all four fixed Category_Groups combined.
7. THE Platform SHALL store Category_Group definitions in the PersonnelCategoryContext as a static configuration object mapping group identifiers to arrays of category IDs.
8. THE Platform SHALL allow future extension of Category_Groups through code updates to the PersonnelCategoryContext configuration without requiring database schema changes.

---

### Requirement 2: Global Category Filter State Management

**User Story:** As an Admin, I want a global category filter that persists across all admin screens, so that I can maintain a consistent view of a specific workforce category throughout my session.

#### Acceptance Criteria


1. THE Platform SHALL implement a PersonnelCategoryContext using React Context API to manage global Category_Filter state.
2. WHEN a user selects a Category_Group from the Category_Switcher, THE PersonnelCategoryContext SHALL update the active Category_Filter and persist the selection for the duration of the user session.
3. THE PersonnelCategoryContext SHALL expose the following state values: selectedCategory (string identifier), categoryFilterIds (array of category UUIDs), and label translation functions.
4. THE PersonnelCategoryContext SHALL provide a setSelectedCategory function that accepts a Category_Group identifier and updates both selectedCategory and categoryFilterIds atomically.
5. WHEN categoryFilterIds changes, THE Platform SHALL trigger re-rendering of all subscribed components to reflect the new filter.
6. THE Platform SHALL NOT persist Category_Filter selections across app restarts; each session SHALL begin with the role-based default selection.
7. THE PersonnelCategoryContext SHALL be initialized at the root of the admin navigation stack so that all admin screens have access to the global filter state.

---

### Requirement 3: Role-Based Default Category Selection

**User Story:** As an Admin, I want the system to default to "Guards" when I log in, so that the app maintains backward compatibility with the original Guard Management System behavior.

#### Acceptance Criteria

1. WHEN a user with role "admin" or "super_admin" logs in, THE Platform SHALL set the default Category_Filter to "Guards".
2. WHEN a user with role "operations_manager" logs in, THE Platform SHALL set the default Category_Filter to "All Personnel".
3. WHEN a user with role "supervisor" logs in, THE Platform SHALL set the default Category_Filter to the Category_Group corresponding to the primary Personnel_Category deployed at their assigned site.
4. IF a Supervisor's assigned site has personnel from multiple Category_Groups, THE Platform SHALL default to "All Personnel" for that Supervisor.
5. WHEN a user with role "client_user" logs in, THE Platform SHALL NOT display the Category_Switcher component and SHALL filter data to show only Personnel_Categories deployed at their assigned site.
6. THE Platform SHALL apply the role-based default selection immediately after successful authentication and before rendering the first admin screen.
7. THE Platform SHALL allow users to change their Category_Filter selection at any time during their session regardless of the initial default.

---

### Requirement 4: Category Switcher UI Component

**User Story:** As an Admin, I want a visually prominent category switcher at the top of the dashboard, so that I can quickly change my workforce view without navigating away from the current screen.

#### Acceptance Criteria

1. THE Platform SHALL display the Category_Switcher component as a horizontal scrollable chip row on the AdminDashboardScreen immediately below the greeting card.
2. THE Category_Switcher SHALL display five chips in the following order: "All Personnel", "Guards", "Gunman Personnel", "Bouncers", "Helpers / Housekeeping".
3. WHEN a Category_Group chip is active, THE Platform SHALL render it with a distinct visual style: solid background color (Colors.primary), white text, and elevated shadow.
4. WHEN a Category_Group chip is inactive, THE Platform SHALL render it with a subtle style: light background (Colors.surfaceContainerHigh), muted text color (Colors.onSurfaceVariant), and no shadow.
5. WHEN a user taps a Category_Group chip, THE Platform SHALL update the global Category_Filter and visually transition the chip to the active state within 100 milliseconds.
6. THE Category_Switcher SHALL be horizontally scrollable to accommodate all five chips on small screen widths without wrapping or truncation.
7. THE Platform SHALL NOT display the Category_Switcher component to users with role "client_user".

---

### Requirement 5: Dynamic UI Label Translation

**User Story:** As an Admin, I want all screen titles, button labels, and field names to automatically change based on my selected category, so that the interface feels like a dedicated management system for that workforce type.

#### Acceptance Criteria

1. THE Label_Translation_Engine SHALL provide translation functions for the following label types: singular (e.g., "Guard"), plural (e.g., "Guards"), onboard (e.g., "Onboard Guard"), assign (e.g., "Assign Guard").
2. WHEN the Category_Filter is set to "Guards", THE Platform SHALL translate labels as follows: singular="Guard", plural="Guards", onboard="Onboard Guard", assign="Assign Guard".
3. WHEN the Category_Filter is set to "Gunman Personnel", THE Platform SHALL translate labels as follows: singular="Gunman", plural="Gunmen", onboard="Onboard Gunman", assign="Assign Gunman".
4. WHEN the Category_Filter is set to "Bouncers", THE Platform SHALL translate labels as follows: singular="Bouncer", plural="Bouncers", onboard="Onboard Bouncer", assign="Assign Bouncer".
5. WHEN the Category_Filter is set to "Helpers/Housekeeping", THE Platform SHALL translate labels as follows: singular="Helper", plural="Helpers", onboard="Onboard Helper", assign="Assign Helper".
6. WHEN the Category_Filter is set to "All Personnel", THE Platform SHALL translate labels as follows: singular="Personnel", plural="Workforce", onboard="Onboard Personnel", assign="Assign Personnel".
7. THE Platform SHALL apply label translations to the following UI elements: screen titles, navigation labels, button text, stat card labels, empty state messages, and report titles.
8. THE Platform SHALL update all visible label translations within 100 milliseconds of a Category_Filter change.

---

### Requirement 6: AdminDashboardScreen Transformation

**User Story:** As an Admin, I want the dashboard to display category-specific metrics and labels when I select a category group, so that I can monitor the performance of that specific workforce segment.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE AdminDashboardScreen SHALL re-fetch dashboard metrics filtered by categoryFilterIds within 500 milliseconds.
2. THE AdminDashboardScreen SHALL display the "Total Workforce" stat card label as "Total {plural}" where {plural} is the translated plural label for the active Category_Filter.
3. THE AdminDashboardScreen SHALL display the "Present Today" stat card with the subValue showing "/{total}" where total is the count of Workforce_Personnel matching categoryFilterIds.
4. THE AdminDashboardScreen SHALL display the attendance overview legend labels using the translated plural label (e.g., "Present: 45 Guards" when Guards is selected).
5. THE AdminDashboardScreen SHALL display management action buttons with translated labels: "{onboard}", "Register Site", "{assign} to Site", "Workforce Categories", "Analytics Dashboard".
6. THE AdminDashboardScreen SHALL display the bottom navigation "Workforce" tab label as the translated plural label for the active Category_Filter.
7. THE AdminDashboardScreen SHALL recalculate all dashboard metrics (total workforce, present today, absent today, attendance percentage) in the frontend using the filtered personnel list rather than calling backend aggregation functions.
8. WHEN the Category_Filter is set to "All Personnel", THE AdminDashboardScreen SHALL display metrics aggregated across all four Category_Groups.

---

### Requirement 7: WorkforcePersonnelListScreen Transformation

**User Story:** As an Admin, I want the personnel list screen to show only personnel from my selected category and display category-specific titles, so that I can manage that workforce segment in isolation.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE WorkforcePersonnelListScreen SHALL filter the personnel list to show only Workforce_Personnel records where category_id is in categoryFilterIds.
2. THE WorkforcePersonnelListScreen SHALL display the screen title as "{plural} Directory" where {plural} is the translated plural label.
3. THE WorkforcePersonnelListScreen SHALL display the "Add Personnel" button label as "{onboard}".
4. THE WorkforcePersonnelListScreen SHALL display the empty state message as "No {plural} found" when the filtered list is empty.
5. THE WorkforcePersonnelListScreen SHALL display the result count as "{count} {plural} found" where {count} is the number of filtered records.
6. THE WorkforcePersonnelListScreen SHALL apply the category filter to all personnel queries including search, status filters, and pagination.
7. WHEN a user navigates to the WorkforcePersonnelListScreen from the AdminDashboardScreen, THE Platform SHALL preserve the active Category_Filter selection.

---

### Requirement 8: SiteDashboardScreen Transformation

**User Story:** As an Admin, I want the site dashboard to show category-specific workforce metrics for the selected category, so that I can assess site staffing levels for that workforce type.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE SiteDashboardScreen SHALL recalculate all workforce metrics filtered by categoryFilterIds.
2. THE SiteDashboardScreen SHALL display the "Total Workforce" metric as the count of Workforce_Personnel assigned to the site where category_id is in categoryFilterIds.
3. THE SiteDashboardScreen SHALL display the "Present Today" metric as the count of Workforce_Personnel with attendance status "present" or "late" for the current date where category_id is in categoryFilterIds.
4. THE SiteDashboardScreen SHALL display the "Absent Today" metric as the count of Workforce_Personnel with attendance status "absent" for the current date where category_id is in categoryFilterIds.
5. THE SiteDashboardScreen SHALL display the workforce roster grouped by Personnel_Category, showing only categories that match categoryFilterIds.
6. THE SiteDashboardScreen SHALL display metric labels using translated terms: "Total {plural}", "{plural} Present", "{plural} Absent".
7. THE SiteDashboardScreen SHALL recalculate the "Vacant Positions" metric as `workforce_strength - count of active assignments matching categoryFilterIds` only if workforce_strength is configured for the site.

---

### Requirement 9: WorkforceRosterScreen Transformation

**User Story:** As an Admin, I want the roster screen to display only personnel from my selected category assigned to sites, so that I can review deployment of that specific workforce type.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE WorkforceRosterScreen SHALL filter the roster to show only SiteAssignment records where the assigned Workforce_Personnel has category_id in categoryFilterIds.
2. THE WorkforceRosterScreen SHALL display the screen title as "{plural} Roster".
3. THE WorkforceRosterScreen SHALL group roster entries by Site, showing for each site the count of assigned personnel matching categoryFilterIds.
4. THE WorkforceRosterScreen SHALL display the "{assign} to Site" button label using the translated assign label.
5. THE WorkforceRosterScreen SHALL display the empty state message as "No {plural} assigned to sites" when the filtered roster is empty.
6. THE WorkforceRosterScreen SHALL apply the category filter to all roster queries including site filters and date range filters.

---

### Requirement 10: PayrollListScreen Transformation

**User Story:** As an Admin, I want the payroll screen to show only payroll records for my selected category, so that I can process payments for that workforce segment independently.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE PayrollListScreen SHALL filter the payroll list to show only PayrollRecord entries where the associated Workforce_Personnel has category_id in categoryFilterIds.
2. THE PayrollListScreen SHALL display the screen title as "{plural} Payroll".
3. THE PayrollListScreen SHALL display the salary summary card with totals calculated only from filtered payroll records.
4. THE PayrollListScreen SHALL display the result count as "{count} {plural} payroll entries" where {count} is the number of filtered records.
5. THE PayrollListScreen SHALL apply the category filter to all payroll queries including month selection, status filters, and search.
6. THE PayrollListScreen SHALL recalculate the summary metrics (total base salary, total overtime, total deductions, total net salary) in the frontend using the filtered payroll list.

---

### Requirement 11: ReportsScreen Transformation

**User Story:** As an Admin, I want report titles and data to reflect my selected category, so that I can generate category-specific reports for compliance and analysis.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE ReportsScreen SHALL update all report titles to include the translated plural label.
2. THE ReportsScreen SHALL display the "Personnel Directory Report" title as "{plural} Directory Report".
3. THE ReportsScreen SHALL display the "Attendance Report" title as "{plural} Attendance Report".
4. THE ReportsScreen SHALL display the "Deployment Report" title as "{plural} Deployment Report".
5. THE ReportsScreen SHALL display the "Payroll Summary Report" title as "{plural} Payroll Summary Report".
6. WHEN a user generates a report, THE Platform SHALL filter the report data to include only records where the associated Workforce_Personnel has category_id in categoryFilterIds.
7. THE ReportsScreen SHALL include the active Category_Group name in the generated report header for traceability.

---

### Requirement 12: AnalyticsDashboardScreen Transformation

**User Story:** As an Admin, I want analytics charts to display data for my selected category, so that I can analyze trends and performance for that specific workforce type.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE AnalyticsDashboardScreen SHALL re-fetch all analytics data filtered by categoryFilterIds within 500 milliseconds.
2. THE AnalyticsDashboardScreen SHALL display the "Workforce Distribution" chart title as "{plural} Distribution by Site".
3. THE AnalyticsDashboardScreen SHALL display the "Attendance Trends" chart title as "{plural} Attendance Trends".
4. THE AnalyticsDashboardScreen SHALL display the "Turnover Rate" chart title as "{plural} Turnover Rate".
5. THE AnalyticsDashboardScreen SHALL filter all chart data to include only Workforce_Personnel records where category_id is in categoryFilterIds.
6. THE AnalyticsDashboardScreen SHALL recalculate all analytics metrics (attendance percentage, turnover rate, vacancy rate) in the frontend using the filtered dataset.
7. WHEN the Category_Filter is set to "All Personnel", THE AnalyticsDashboardScreen SHALL display aggregated analytics across all four Category_Groups.

---

### Requirement 13: Service Layer Category Filtering

**User Story:** As a developer, I want all service functions to accept an optional categoryIds parameter, so that data queries can be filtered by category without modifying existing API contracts.

#### Acceptance Criteria

1. THE Platform SHALL extend the dashboardService.getDashboardOverview function to accept an optional categoryIds parameter (array of UUIDs).
2. WHEN categoryIds is provided to getDashboardOverview, THE function SHALL filter all workforce counts and attendance metrics to include only Workforce_Personnel where category_id is in categoryIds.
3. THE Platform SHALL extend the workforcePersonnelService.getPersonnel function to accept an optional categoryIds parameter.
4. WHEN categoryIds is provided to getPersonnel, THE function SHALL add a WHERE clause filtering by category_id IN (categoryIds).
5. THE Platform SHALL extend the attendanceService.getAttendance function to accept an optional category_ids parameter.
6. WHEN category_ids is provided to getAttendance, THE function SHALL join to workforce_personnel and filter by category_id IN (category_ids).
7. THE Platform SHALL extend the siteAssignmentService.getRoster function to accept an optional categoryIds parameter.
8. WHEN categoryIds is provided to getRoster, THE function SHALL filter assignments to include only those where the assigned personnel has category_id in categoryIds.
9. THE Platform SHALL extend the analyticsService functions to accept an optional categoryIds parameter and apply the same filtering logic.
10. THE Platform SHALL maintain backward compatibility by making categoryIds optional; when omitted, functions SHALL return unfiltered results as before.

---

### Requirement 14: Frontend Metric Recalculation

**User Story:** As an Admin, I want dashboard metrics to update instantly when I change the category filter, so that I can quickly compare workforce segments without waiting for backend queries.

#### Acceptance Criteria

1. THE Platform SHALL fetch the complete personnel list for all categories on AdminDashboardScreen mount and cache it in component state.
2. WHEN the Category_Filter changes, THE AdminDashboardScreen SHALL recalculate the following metrics in the frontend using the cached personnel list filtered by categoryFilterIds: total workforce count, active personnel count, assigned personnel count.
3. THE Platform SHALL fetch the complete attendance list for the current date on AdminDashboardScreen mount and cache it in component state.
4. WHEN the Category_Filter changes, THE AdminDashboardScreen SHALL recalculate the following attendance metrics in the frontend using the cached attendance list filtered by categoryFilterIds: present count, late count, absent count, attendance percentage.
5. THE Platform SHALL complete all frontend metric recalculations within 100 milliseconds of a Category_Filter change on a standard mobile device.
6. THE Platform SHALL refresh the cached personnel and attendance data when the user performs a pull-to-refresh gesture on the AdminDashboardScreen.
7. THE Platform SHALL NOT call backend aggregation functions (Deno Edge Functions) for dashboard metrics when the Category_Filter changes; all recalculation SHALL occur in the React Native app.

---

### Requirement 15: Client User Category Visibility

**User Story:** As a Client_User, I want to see only the personnel categories deployed at my site without a category switcher, so that my view is automatically scoped to relevant workforce types.

#### Acceptance Criteria

1. WHEN a Client_User logs in, THE Platform SHALL determine which Personnel_Categories are deployed at their assigned site by querying active SiteAssignment records.
2. THE Platform SHALL set the Category_Filter for a Client_User to include only the Personnel_Categories deployed at their assigned site.
3. THE Platform SHALL NOT display the Category_Switcher component on any screen for users with role "client_user".
4. THE Platform SHALL apply the site-scoped Category_Filter to all data queries for Client_Users, including personnel lists, attendance records, and performance metrics.
5. THE Platform SHALL display UI labels for Client_Users using the translated plural label if only one Category_Group is deployed, or "Workforce" if multiple Category_Groups are deployed.
6. THE Platform SHALL NOT allow Client_Users to change their Category_Filter selection; the filter SHALL remain fixed to their site's deployed categories for the entire session.

---

### Requirement 16: Supervisor Category Default Logic

**User Story:** As a Supervisor, I want the system to default to the primary category deployed at my assigned site, so that I immediately see the most relevant workforce data when I log in.

#### Acceptance Criteria

1. WHEN a Supervisor logs in, THE Platform SHALL query the SiteAssignment records for their assigned sites to determine which Personnel_Categories are deployed.
2. IF a Supervisor's assigned sites have personnel from only one Category_Group, THE Platform SHALL set the default Category_Filter to that Category_Group.
3. IF a Supervisor's assigned sites have personnel from multiple Category_Groups, THE Platform SHALL set the default Category_Filter to "All Personnel".
4. THE Platform SHALL allow Supervisors to change their Category_Filter selection using the Category_Switcher component.
5. THE Platform SHALL apply the selected Category_Filter to all Supervisor screens including the Supervisor Dashboard, attendance management, and complaint views.
6. THE Platform SHALL scope all Supervisor data queries to their assigned sites regardless of the Category_Filter selection.

---

### Requirement 17: Backward Compatibility with Guard-Only Screens

**User Story:** As an Admin, I want the system to maintain full compatibility with the original Guard Management System behavior when "Guards" is selected, so that existing workflows are not disrupted.

#### Acceptance Criteria

1. WHEN the Category_Filter is set to "Guards", THE Platform SHALL display all UI labels, screen titles, and button text exactly as they appeared in the original Guard Management System.
2. WHEN the Category_Filter is set to "Guards", THE AdminDashboardScreen SHALL display "Total Guards", "Guards Present", "Guards Absent" labels matching the original dashboard.
3. WHEN the Category_Filter is set to "Guards", THE Platform SHALL filter all data queries to include only Workforce_Personnel with category_id matching the "Guard" Personnel_Category (prefix_code "PIS").
4. THE Platform SHALL NOT modify or remove any existing Guard-specific functionality when the Category_Filter is set to "Guards".
5. THE Platform SHALL preserve all existing navigation flows, button actions, and screen transitions when the Category_Filter is set to "Guards".
6. THE Platform SHALL ensure that users who never change the Category_Filter from the default "Guards" experience no change in behavior compared to the original Guard Management System.

---

### Requirement 18: Performance and Responsiveness

**User Story:** As an Admin, I want the category filter to change instantly without lag or loading spinners, so that I can quickly switch between workforce views during my workflow.

#### Acceptance Criteria

1. WHEN a user taps a Category_Group chip in the Category_Switcher, THE Platform SHALL update the visual state of the chip within 100 milliseconds.
2. WHEN the Category_Filter changes, THE Platform SHALL update all visible UI labels within 100 milliseconds.
3. WHEN the Category_Filter changes, THE Platform SHALL complete all frontend metric recalculations within 200 milliseconds on a standard mobile device.
4. THE Platform SHALL NOT display loading spinners or skeleton screens when the Category_Filter changes if the required data is already cached in component state.
5. THE Platform SHALL prefetch personnel and attendance data for all categories on AdminDashboardScreen mount to enable instant filtering.
6. THE Platform SHALL limit the size of cached datasets to prevent memory issues: personnel list capped at 1000 records, attendance list capped at 500 records per day.
7. IF cached data exceeds the size limits, THE Platform SHALL fall back to backend queries with loading indicators when the Category_Filter changes.

---

### Requirement 19: Extensibility for Future Category Groups

**User Story:** As a developer, I want the category group system to be easily extensible, so that new workforce categories can be added without refactoring the entire filtering system.

#### Acceptance Criteria

1. THE Platform SHALL define all Category_Group mappings in a single configuration object within PersonnelCategoryContext.tsx.
2. THE Platform SHALL define all label translation rules in a single translation map within PersonnelCategoryContext.tsx.
3. WHEN a developer adds a new Category_Group, THE Platform SHALL require updates only to the configuration object and translation map without modifying screen components.
4. THE Platform SHALL support Category_Groups containing any number of Personnel_Categories from 1 to N.
5. THE Platform SHALL support adding new Category_Groups by appending entries to the configuration object without modifying existing entries.
6. THE Platform SHALL validate that all Personnel_Category IDs referenced in Category_Group mappings exist in the workforce_categories table at runtime.
7. IF a Category_Group references a non-existent Personnel_Category ID, THE Platform SHALL log a warning and exclude that ID from categoryFilterIds.

---

### Requirement 20: UI Consistency Across All Screens

**User Story:** As an Admin, I want all admin screens to use consistent category-specific terminology, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. THE Platform SHALL apply label translations consistently across all admin screens: AdminDashboardScreen, WorkforcePersonnelListScreen, SiteDashboardScreen, WorkforceRosterScreen, PayrollListScreen, ReportsScreen, AnalyticsDashboardScreen.
2. THE Platform SHALL use the same translation functions (getLabel) from PersonnelCategoryContext in all screen components.
3. THE Platform SHALL ensure that screen titles, button labels, stat card labels, empty state messages, and navigation labels all use translated terms.
4. THE Platform SHALL NOT mix generic terms (e.g., "Personnel") with category-specific terms (e.g., "Guards") on the same screen when a specific Category_Filter is active.
5. THE Platform SHALL display "Workforce" or "Personnel" terminology only when the Category_Filter is set to "All Personnel".
6. THE Platform SHALL update all visible labels simultaneously when the Category_Filter changes to prevent visual inconsistencies.
7. THE Platform SHALL apply label translations to dynamically generated content including chart legends, report headers, and notification messages.

---

### Requirement 21: Category Filter Persistence Within Session

**User Story:** As an Admin, I want my category filter selection to persist as I navigate between screens, so that I don't have to re-select my category every time I switch screens.

#### Acceptance Criteria

1. WHEN a user selects a Category_Group on the AdminDashboardScreen, THE Platform SHALL preserve that selection when the user navigates to WorkforcePersonnelListScreen.
2. WHEN a user navigates back to the AdminDashboardScreen from any other screen, THE Platform SHALL restore the previously selected Category_Filter.
3. THE Platform SHALL maintain the Category_Filter selection across all admin screens within the same navigation session.
4. WHEN a user logs out, THE Platform SHALL clear the Category_Filter selection.
5. WHEN a user logs back in, THE Platform SHALL apply the role-based default Category_Filter as specified in Requirement 3.
6. THE Platform SHALL NOT persist the Category_Filter selection to AsyncStorage or any persistent storage; the selection SHALL be session-only.

---

### Requirement 22: Empty State Handling for Category Filters

**User Story:** As an Admin, I want to see helpful empty state messages when no personnel exist for my selected category, so that I understand why the screen is empty and what action to take.

#### Acceptance Criteria

1. WHEN the Category_Filter is set to a Category_Group with zero Workforce_Personnel records, THE WorkforcePersonnelListScreen SHALL display an empty state message: "No {plural} found. Tap '{onboard}' to add your first {singular}."
2. WHEN the Category_Filter is set to a Category_Group with zero attendance records for the current date, THE AdminDashboardScreen SHALL display "No {plural} checked in today" in the Live Activity section.
3. WHEN the Category_Filter is set to a Category_Group with zero payroll records for the selected month, THE PayrollListScreen SHALL display "No {plural} payroll entries for this month."
4. THE Platform SHALL display the "{onboard}" button prominently in empty states to guide users toward adding personnel.
5. THE Platform SHALL use translated labels in all empty state messages to maintain UI consistency.
6. WHEN the Category_Filter is set to "All Personnel" and no personnel exist in any category, THE Platform SHALL display "No workforce personnel found. Tap 'Onboard Personnel' to get started."

---

### Requirement 23: Category Filter Impact on Navigation Labels

**User Story:** As an Admin, I want the bottom navigation bar labels to reflect my selected category, so that the navigation feels integrated with the category-specific view.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE Platform SHALL update the bottom navigation "Workforce" tab label to display the translated plural label.
2. WHEN the Category_Filter is set to "Guards", THE bottom navigation SHALL display "Guards" as the workforce tab label.
3. WHEN the Category_Filter is set to "Gunman Personnel", THE bottom navigation SHALL display "Gunmen" as the workforce tab label.
4. WHEN the Category_Filter is set to "Bouncers", THE bottom navigation SHALL display "Bouncers" as the workforce tab label.
5. WHEN the Category_Filter is set to "Helpers/Housekeeping", THE bottom navigation SHALL display "Helpers" as the workforce tab label.
6. WHEN the Category_Filter is set to "All Personnel", THE bottom navigation SHALL display "Workforce" as the workforce tab label.
7. THE Platform SHALL update the navigation label within 100 milliseconds of a Category_Filter change.

---

### Requirement 24: Category-Specific Stat Card Labels

**User Story:** As an Admin, I want dashboard stat cards to display category-specific labels, so that metrics are clearly attributed to the selected workforce type.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE AdminDashboardScreen SHALL update all stat card labels to use translated terms.
2. THE "Total Workforce" stat card SHALL display the label "Total {plural}" where {plural} is the translated plural label.
3. THE "Present Today" stat card SHALL display the label "{plural} Present" where {plural} is the translated plural label.
4. THE "Absent Today" alert banner SHALL display the message "{count} {plural} absent today" using the translated plural label.
5. THE "Pending Payroll" stat card SHALL display the label "Pending {plural} Payroll" when a specific category is selected.
6. WHEN the Category_Filter is set to "All Personnel", THE stat cards SHALL use generic labels: "Total Workforce", "Personnel Present", "Personnel Absent".
7. THE Platform SHALL ensure that stat card values are recalculated to match the filtered dataset when labels are updated.

---

### Requirement 25: Report Generation with Category Context

**User Story:** As an Admin, I want generated reports to include the category filter context in their headers, so that printed or exported reports clearly indicate which workforce segment they represent.

#### Acceptance Criteria

1. WHEN a user generates a report, THE Platform SHALL include the active Category_Group name in the report header.
2. THE report header SHALL display: "Report Type: {Report Name} | Category: {Category Group Name} | Generated: {Date}".
3. WHEN the Category_Filter is set to "Guards", THE report header SHALL display "Category: Guards".
4. WHEN the Category_Filter is set to "All Personnel", THE report header SHALL display "Category: All Personnel".
5. THE Platform SHALL include the categoryFilterIds array in the report generation request to ensure backend filtering matches the frontend view.
6. THE Platform SHALL display a warning message if the user attempts to generate a report with zero records for the selected Category_Filter.
7. THE Platform SHALL allow users to export reports as PDF or CSV with the category context preserved in the file metadata.

---

### Requirement 26: Analytics Dashboard Category Filtering

**User Story:** As an Admin, I want analytics charts to automatically filter by my selected category, so that I can analyze trends for specific workforce segments without manually applying filters.

#### Acceptance Criteria

1. WHEN the Category_Filter changes, THE AnalyticsDashboardScreen SHALL apply the categoryFilterIds filter to all chart data queries.
2. THE "Workforce Distribution by Category" chart SHALL display only categories that match categoryFilterIds.
3. THE "Attendance Trends" chart SHALL plot attendance data only for Workforce_Personnel where category_id is in categoryFilterIds.
4. THE "Turnover Rate" chart SHALL calculate turnover only for Workforce_Personnel where category_id is in categoryFilterIds.
5. THE "Vacancy Rate by Site" chart SHALL calculate vacancies only for positions matching categoryFilterIds.
6. THE Platform SHALL display a category filter indicator on the AnalyticsDashboardScreen showing the active Category_Group name.
7. THE Platform SHALL allow users to apply additional filters (date range, site, region) on top of the category filter without clearing the category selection.

---

### Requirement 27: Category Filter Error Handling

**User Story:** As an Admin, I want the system to handle invalid category selections gracefully, so that the app does not crash if category data is missing or corrupted.

#### Acceptance Criteria

1. IF the PersonnelCategoryContext fails to load Category_Group mappings, THE Platform SHALL log an error and default to "All Personnel" mode.
2. IF a Category_Group references a Personnel_Category ID that does not exist in the workforce_categories table, THE Platform SHALL exclude that ID from categoryFilterIds and log a warning.
3. IF the categoryFilterIds array is empty after validation, THE Platform SHALL default to "All Personnel" mode and display a warning message to the user.
4. IF a service function receives an invalid categoryIds parameter (null, undefined, or non-array), THE function SHALL treat it as an empty array and return unfiltered results.
5. THE Platform SHALL NOT crash or display blank screens if category filtering fails; all screens SHALL fall back to displaying unfiltered data with a warning banner.
6. THE Platform SHALL display a user-friendly error message: "Category filter unavailable. Showing all personnel." when category filtering fails.

---

### Requirement 28: Category Filter Accessibility

**User Story:** As an Admin using accessibility features, I want the category switcher to be fully accessible, so that I can change category filters using screen readers and keyboard navigation.

#### Acceptance Criteria

1. THE Category_Switcher chips SHALL have accessible labels that announce the category name and active state to screen readers.
2. WHEN a Category_Group chip is focused, THE screen reader SHALL announce: "{Category Name}, {active/inactive}, button".
3. THE Category_Switcher SHALL support keyboard navigation on platforms that provide keyboard input.
4. THE Category_Switcher SHALL have a minimum touch target size of 44x44 points per chip to meet accessibility guidelines.
5. THE Platform SHALL provide sufficient color contrast between active and inactive chip states to meet WCAG AA standards.
6. WHEN the Category_Filter changes, THE Platform SHALL announce the change to screen readers: "Category filter changed to {Category Name}".

---

### Requirement 29: Category Filter Testing and Validation

**User Story:** As a developer, I want comprehensive test coverage for category filtering logic, so that I can confidently deploy changes without breaking existing functionality.

#### Acceptance Criteria

1. THE Platform SHALL include unit tests for the PersonnelCategoryContext that verify correct categoryFilterIds arrays are returned for each Category_Group.
2. THE Platform SHALL include unit tests for label translation functions that verify correct labels are returned for each Category_Group and label type.
3. THE Platform SHALL include integration tests that verify AdminDashboardScreen metrics are correctly filtered when the Category_Filter changes.
4. THE Platform SHALL include integration tests that verify all service functions correctly apply categoryIds filtering when provided.
5. THE Platform SHALL include end-to-end tests that verify the complete user flow: login → select category → view filtered data → generate report.
6. THE Platform SHALL include regression tests that verify "Guards" category selection produces identical behavior to the original Guard Management System.
7. THE Platform SHALL achieve at least 80% code coverage for all category filtering logic.

---

### Requirement 30: Documentation and Training Materials

**User Story:** As a new Admin user, I want clear documentation explaining how to use the category filter, so that I can quickly learn to manage different workforce segments.

#### Acceptance Criteria

1. THE Platform SHALL include in-app help text on the AdminDashboardScreen explaining the purpose of the Category_Switcher.
2. THE help text SHALL state: "Select a workforce category to view and manage that segment. All metrics, lists, and reports will automatically filter to show only the selected category."
3. THE Platform SHALL display a one-time tooltip on first login pointing to the Category_Switcher with the message: "New! Filter your workforce by category."
4. THE Platform SHALL include a user guide document (PDF or web page) with screenshots demonstrating category filtering workflows.
5. THE user guide SHALL include sections for each role (Admin, Operations Manager, Supervisor) explaining their default category and how to change it.
6. THE Platform SHALL include API documentation for developers explaining how to add new Category_Groups to the configuration.
7. THE Platform SHALL include a troubleshooting section in the user guide addressing common issues like empty filtered lists and missing categories.

---
