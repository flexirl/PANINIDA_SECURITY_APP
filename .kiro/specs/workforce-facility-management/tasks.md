# Implementation Plan: Workforce & Facility Management System

## Overview

This implementation plan breaks the Pan India Security Workforce & Facility Management System into 42 concrete, dependency-ordered tasks across 13 phases. The plan covers the full stack: Supabase database migrations, RLS policies, TypeScript service layer, React Native screens, Edge Functions, and notification wiring. Phase 0 (database) must be completed first as all other phases depend on it. Phases 1–13 can be partially parallelized once their service dependencies are met.

## Tasks

## Phase 0: Database Foundation

- [x] 1. Create Core Database Migration Scripts
  - **Spec**: requirements.md#Req 1, Req 2, Req 3, Req 4, Req 5, Req 6, Req 7, Req 9, Req 12, Req 14
  - **Description**: Write all Supabase SQL migration files (001–017) covering table creation, triggers, functions, indexes, seed data, and guard migration. Each script must be idempotent using `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, and `CREATE OR REPLACE`.
  - **Files**:
    - `supabase/migrations/001_extend_users_roles.sql` — ALTER TABLE users to add new role values
    - `supabase/migrations/002_create_workforce_categories.sql` — workforce_categories table + trigger
    - `supabase/migrations/003_create_workforce_personnel.sql` — workforce_personnel table + immutable employee_id trigger + updated_at trigger + generate_employee_id() function
    - `supabase/migrations/004_extend_sites.sql` — ADD COLUMN IF NOT EXISTS for 8 new site columns
    - `supabase/migrations/005_create_site_assignments.sql` — site_assignments table + deactivate_previous_assignment trigger
    - `supabase/migrations/006_create_client_users.sql` — client_users table + trigger
    - `supabase/migrations/007_create_complaints.sql` — complaints table + trigger
    - `supabase/migrations/008_create_complaint_comments.sql` — complaint_comments table (append-only, no updated_at)
    - `supabase/migrations/009_create_complaint_escalations.sql` — complaint_escalations table (append-only)
    - `supabase/migrations/010_create_workforce_attendance.sql` — workforce_attendance table + unique constraint + trigger
    - `supabase/migrations/011_create_workforce_documents.sql` — workforce_documents table + unique constraint + trigger
    - `supabase/migrations/012_create_replacements.sql` — replacements table + unique constraint + trigger
    - `supabase/migrations/013_create_workforce_ratings.sql` — workforce_ratings table
    - `supabase/migrations/014_extend_notifications.sql` — ALTER notifications type CHECK constraint
    - `supabase/migrations/015_seed_workforce_categories.sql` — INSERT 19 system categories ON CONFLICT DO NOTHING
    - `supabase/migrations/016_create_compatibility_views.sql` — guards_compat_view + guard_assignments_compat_view
    - `supabase/migrations/017_migrate_guards_to_workforce_personnel.sql` — idempotent INSERT of existing guards
  - **Dependencies**: none
  - **Subtasks**:
    - [x] 1.1 Write migrations 001–005 (users roles, categories, personnel, sites, assignments)
    - [x] 1.2 Write migrations 006–010 (client_users, complaints, comments, escalations, attendance)
    - [x] 1.3 Write migrations 011–015 (documents, replacements, ratings, notifications, seed data)
    - [x] 1.4 Write migrations 016–017 (compatibility views, guard migration)
    - [x] 1.5 Verify all scripts are idempotent by running each twice against a test Supabase project

- [x] 2. Apply RLS Policies Migration
  - **Spec**: requirements.md#Req 11, Req 3, Req 5, Req 6, Req 14
  - **Description**: Write migration 018 that enables RLS on all new tables and creates all role-scoped SELECT/INSERT/UPDATE policies using the `current_user_role()`, `current_user_site_id()`, and `current_supervisor_site_ids()` helper functions.
  - **Files**:
    - `supabase/migrations/018_apply_rls_policies.sql` — RLS enable + all policies for workforce_categories, workforce_personnel, site_assignments, client_users, complaints, complaint_comments, complaint_escalations, workforce_attendance, workforce_documents, replacements
  - **Dependencies**: 1
  - **Subtasks**:
    - [x] 2.1 Create `current_user_role()`, `current_user_site_id()`, `current_supervisor_site_ids()` helper functions
    - [x] 2.2 Write RLS policies for workforce_categories and workforce_personnel
    - [x] 2.3 Write RLS policies for complaints, complaint_comments, complaint_escalations (append-only enforcement)
    - [x] 2.4 Write RLS policies for workforce_documents (client permitted-types filter)
    - [x] 2.5 Write RLS policies for workforce_attendance, site_assignments, replacements, client_users

- [x] 3. Create Compatibility Views and Schedule Escalation Engine
  - **Spec**: requirements.md#Req 12, Req 4
  - **Description**: Verify compatibility views are correct after guard migration runs, and write migration 019 to schedule the escalation-engine Edge Function via pg_cron at 5-minute intervals.
  - **Files**:
    - `supabase/migrations/019_schedule_escalation_engine.sql` — pg_cron schedule for escalation-engine
  - **Dependencies**: 1, 2
  - **Subtasks**:
    - [x] 3.1 Validate guards_compat_view returns same columns as legacy /functions/v1/guards
    - [x] 3.2 Validate guard_assignments_compat_view returns same columns as legacy /functions/v1/assignments
    - [x] 3.3 Write pg_cron schedule statement for escalation-engine (every 5 minutes)

## Phase 1: Generic Workforce Personnel Architecture

- [x] 4. TypeScript Interfaces and Types
  - **Spec**: requirements.md#Req 1, Req 2, Req 3, Req 4, Req 5, Req 6, Req 7, Req 9, Req 10, Req 11, Req 13
  - **Description**: Create `src/types/workforce.ts` with all TypeScript interfaces, union types, and enums needed across the entire feature set, matching the database schema exactly.
  - **Files**:
    - `mobile/src/types/workforce.ts` — create: WorkforceCategory, WorkforcePersonnel, SiteAssignment, Site (extended), SiteDashboardMetrics, Complaint, ComplaintComment, ComplaintEscalation, ClientUser, Replacement, WorkforceAttendance, WorkforceDocument, WorkforceRating, RatingSummary, AppNotification, AnalyticsFilters, and all supporting union types
  - **Dependencies**: none
  - **Subtasks**:
    - [x] 4.1 Define EmploymentStatus, ShiftType, UserRole, ComplaintStatus, ReplacementStatus union types
    - [x] 4.2 Define WorkforceCategory, WorkforcePersonnel, SiteAssignment, Site interfaces
    - [x] 4.3 Define SiteDashboardMetrics, Complaint, ComplaintComment, ComplaintEscalation interfaces
    - [x] 4.4 Define ClientUser, Replacement, WorkforceAttendance, WorkforceDocument, WorkforceRating interfaces
    - [x] 4.5 Define RatingSummary, AppNotification, NotificationType, AnalyticsFilters and analytics result types

- [x] 5. workforceCategoryService.ts
  - **Spec**: requirements.md#Req 1, Req 7, Req 14
  - **Description**: Implement CRUD service for workforce_categories using `supabase.from('workforce_categories')`, including case-insensitive duplicate name validation and prefix format enforcement.
  - **Files**:
    - `mobile/src/api/workforceCategoryService.ts` — create: getCategories(), getCategoryById(), createCategory(), updateCategory()
  - **Dependencies**: 1, 2, 4
  - **Subtasks**:
    - [x] 5.1 Implement `getCategories()` — SELECT all, ordered by name
    - [x] 5.2 Implement `getCategoryById(id)` — SELECT single with error handling
    - [x] 5.3 Implement `createCategory(data)` — INSERT with duplicate name check (case-insensitive) and prefix format validation (^[A-Z]{2,5}$)
    - [x] 5.4 Implement `updateCategory(id, updates)` — UPDATE non-system categories only; block prefix_code changes on system-defined categories

- [x] 6. workforcePersonnelService.ts
  - **Spec**: requirements.md#Req 1, Req 7, Req 12, Req 14
  - **Description**: Implement CRUD service for workforce_personnel, calling `generate_employee_id()` via RPC on create, and implementing soft-delete (terminate) instead of hard delete.
  - **Files**:
    - `mobile/src/api/workforcePersonnelService.ts` — create: getPersonnel(), getPersonnelById(), createPersonnel(), updatePersonnel(), terminatePersonnel()
  - **Dependencies**: 1, 2, 4, 5
  - **Subtasks**:
    - [x] 6.1 Implement `getPersonnel(filters)` — SELECT with optional category_id, site_id (via join), status, and search filters
    - [x] 6.2 Implement `getPersonnelById(id)` — SELECT with joined category, today_attendance, and rating_summary
    - [x] 6.3 Implement `createPersonnel(data)` — call `supabase.rpc('generate_employee_id', { p_category_id })` then INSERT; attempt dual-write to legacy guards table; log failure without rollback
    - [x] 6.4 Implement `updatePersonnel(id, updates)` — UPDATE excluding employee_id field
    - [x] 6.5 Implement `terminatePersonnel(id)` — UPDATE employment_status = 'terminated' (soft delete only)

- [x] 7. WorkforceCategoryListScreen and AddWorkforceCategoryScreen
  - **Spec**: requirements.md#Req 1, Req 7, Req 11
  - **Description**: Build the admin screen to list all 19+ personnel categories with attendance_required toggle, and a form screen to create new custom categories with name and prefix_code inputs.
  - **Files**:
    - `mobile/src/screens/WorkforceCategoryListScreen.tsx` — create: FlatList of categories, attendance_required toggle per row, navigate to AddWorkforceCategory
    - `mobile/src/screens/AddWorkforceCategoryScreen.tsx` — create: form with name (text), prefix_code (uppercase, 2–5 chars), attendance_required (switch); validation + submit
  - **Dependencies**: 5, 37
  - **Subtasks**:
    - [x] 7.1 Build WorkforceCategoryListScreen with FlatList, CategoryBadge component, and attendance toggle
    - [x] 7.2 Build AddWorkforceCategoryScreen form with client-side validation (prefix format, required fields)
    - [x] 7.3 Wire createCategory() call with error toast on duplicate name rejection
    - [x] 7.4 Add system-defined badge and disable edit for is_system_defined = true categories

- [x] 8. WorkforcePersonnelListScreen and AddWorkforcePersonnelScreen
  - **Spec**: requirements.md#Req 1, Req 2, Req 7, Req 11
  - **Description**: Build the searchable personnel list with category filter chips, and a multi-step form to add new personnel with personal info, bank details, and document upload steps.
  - **Files**:
    - `mobile/src/screens/WorkforcePersonnelListScreen.tsx` — create: search bar, category filter chips, FlatList with WorkforcePersonnelCard, navigate to WorkforcePersonnelDetail
    - `mobile/src/screens/AddWorkforcePersonnelScreen.tsx` — create: 3-step form (personal info → bank details → initial documents); auto-display generated employee_id after creation
    - `mobile/src/components/WorkforcePersonnelCard.tsx` — create: photo, name, employee_id, CategoryBadge, AttendanceStatusBadge
  - **Dependencies**: 6, 37
  - **Subtasks**:
    - [x] 8.1 Build WorkforcePersonnelListScreen with search and category filter chips
    - [x] 8.2 Build AddWorkforcePersonnelScreen Step 1: personal info (name, phone, joining_date, shift_type, category_id picker)
    - [x] 8.3 Build AddWorkforcePersonnelScreen Step 2: bank details (account number, IFSC, bank name)
    - [x] 8.4 Build AddWorkforcePersonnelScreen Step 3: emergency contact + address; submit and show generated employee_id
    - [x] 8.5 Create WorkforcePersonnelCard shared component

- [x] 9. WorkforcePersonnelDetailScreen
  - **Spec**: requirements.md#Req 1, Req 2, Req 6, Req 7, Req 11
  - **Description**: Build the full personnel profile screen with tabs for profile info, document checklist, attendance history, and current site assignment — displaying employee_id prominently on all tabs.
  - **Files**:
    - `mobile/src/screens/WorkforcePersonnelDetailScreen.tsx` — create: tab navigator with Profile, Documents, Attendance, Assignment tabs; terminate button for admin
  - **Dependencies**: 6, 26, 37
  - **Subtasks**:
    - [x] 9.1 Build Profile tab: photo, employee_id, name, category, status badge, personal/bank/emergency info
    - [x] 9.2 Build Documents tab: embed DocumentChecklistScreen content inline
    - [x] 9.3 Build Attendance tab: last 30 days attendance list with AttendanceStatusBadge
    - [x] 9.4 Build Assignment tab: current site assignment card + assignment history
    - [x] 9.5 Add Terminate Personnel action with confirmation dialog (soft delete only)

## Phase 2: Site-Based Workforce Management

- [x] 10. siteAssignmentService.ts
  - **Spec**: requirements.md#Req 2, Req 5, Req 9
  - **Description**: Implement the site assignment service including roster retrieval grouped by category, site dashboard metrics computation, and assignment creation (which triggers deactivation of previous assignment via DB trigger).
  - **Files**:
    - `mobile/src/api/siteAssignmentService.ts` — create: getAssignmentsForSite(), getAssignmentsForPersonnel(), assignPersonnelToSite(), deactivateAssignment(), getSiteDashboardMetrics(), getWorkforceRoster()
  - **Dependencies**: 1, 2, 4, 6
  - **Subtasks**:
    - [x] 10.1 Implement `getAssignmentsForSite(siteId)` — SELECT with joined personnel and category
    - [x] 10.2 Implement `assignPersonnelToSite(data)` — INSERT into site_assignments (DB trigger handles deactivation of previous)
    - [x] 10.3 Implement `getSiteDashboardMetrics(siteId)` — compute all 7 metrics: total_workforce, security_count, housekeeping_count, supervisor_count, present_today, absent_today, vacant_positions (handle null workforce_strength → 'not_configured')
    - [x] 10.4 Implement `getWorkforceRoster(siteId)` — SELECT active assignments with personnel+category, group by category name in JS
    - [x] 10.5 Implement `deactivateAssignment(id)` — UPDATE is_active = false, end_date = today

- [x] 11. SiteDashboardScreen
  - **Spec**: requirements.md#Req 2, Req 11
  - **Description**: Build the per-site dashboard screen displaying 7 metric cards (Total Workforce, Security, Housekeeping, Supervisors, Present Today, Absent Today, Vacant Positions) with a Workforce Roster tab below.
  - **Files**:
    - `mobile/src/screens/SiteDashboardScreen.tsx` — create: 7 metric cards grid + tab for Roster; navigate to WorkforceRoster and AssignPersonnel
    - `mobile/src/components/SiteSummaryCard.tsx` — create: site name, workforce count, present/absent, open complaints
  - **Dependencies**: 10, 37
  - **Subtasks**:
    - [x] 11.1 Build 7-card metrics grid with loading skeleton and refresh
    - [x] 11.2 Display "Strength not configured" when workforce_strength is null
    - [x] 11.3 Add Workforce Roster tab linking to WorkforceRosterScreen
    - [x] 11.4 Add "Assign Personnel" FAB navigating to AssignPersonnelScreen

- [x] 12. WorkforceRosterScreen
  - **Spec**: requirements.md#Req 2, Req 3, Req 11
  - **Description**: Build the roster screen showing all active personnel at a site grouped by Personnel_Category, with each card showing photo, name, designation, employee_id, mobile, shift, and today's attendance status.
  - **Files**:
    - `mobile/src/screens/WorkforceRosterScreen.tsx` — create: SectionList grouped by category, WorkforcePersonnelCard per item, tap to navigate to WorkforcePersonnelDetail
  - **Dependencies**: 10, 8, 37
  - **Subtasks**:
    - [x] 12.1 Build SectionList with category headers and personnel cards
    - [x] 12.2 Show AttendanceStatusBadge (present/absent/late/N/A) on each card
    - [x] 12.3 Add search/filter bar to filter within roster

- [x] 13. AssignPersonnelScreen
  - **Spec**: requirements.md#Req 2, Req 9, Req 11
  - **Description**: Build the screen for admins to assign an unassigned or reassign an existing workforce personnel to a site, with shift type selection and start date picker.
  - **Files**:
    - `mobile/src/screens/AssignPersonnelScreen.tsx` — create: personnel picker (searchable, shows current assignment), shift_type selector, start_date picker, confirm button
  - **Dependencies**: 10, 8, 37
  - **Subtasks**:
    - [x] 13.1 Build personnel search picker showing name, employee_id, current site
    - [x] 13.2 Add shift_type radio buttons (day/night/rotational)
    - [x] 13.3 Add start_date date picker defaulting to today
    - [x] 13.4 Show confirmation dialog warning about deactivating previous assignment

## Phase 3: Client Portal

- [x] 14. clientPortalService.ts
  - **Spec**: requirements.md#Req 3, Req 11
  - **Description**: Implement the client portal service that reads data scoped to the authenticated client_user's site_id, including roster, attendance summaries, permitted documents, and performance overview.
  - **Files**:
    - `mobile/src/api/clientPortalService.ts` — create: getClientSiteInfo(), getClientWorkforceRoster(), getClientAttendance(), getClientDocuments(), getClientPerformanceOverview()
  - **Dependencies**: 1, 2, 4, 6, 10
  - **Subtasks**:
    - [x] 14.1 Implement `getClientSiteInfo()` — SELECT site for current client_user's site_id
    - [x] 14.2 Implement `getClientWorkforceRoster()` — reuse siteAssignmentService.getWorkforceRoster() scoped to client site
    - [x] 14.3 Implement `getClientAttendance(granularity, date)` — aggregate workforce_attendance by day/week/month for client site
    - [x] 14.4 Implement `getClientDocuments(personnelId)` — SELECT workforce_documents filtered to permitted types only
    - [x] 14.5 Implement `getClientPerformanceOverview()` — SELECT personnel with joined rating_summary (avg rating, open complaints, appreciation count, last review date)

- [x] 15. ClientPortalHomeScreen
  - **Spec**: requirements.md#Req 3, Req 11
  - **Description**: Build the client portal home screen showing site overview (workforce count, attendance %, open complaints count) with navigation cards to roster, attendance, documents, performance, and complaints.
  - **Files**:
    - `mobile/src/screens/ClientPortalHomeScreen.tsx` — create: site name header, 3 summary metrics, navigation cards to all client sub-screens
  - **Dependencies**: 14, 37
  - **Subtasks**:
    - [x] 15.1 Build site header with name, client_role badge, and site address
    - [x] 15.2 Build 3 summary metric cards (workforce count, attendance %, open complaints)
    - [x] 15.3 Build navigation cards grid (Roster, Attendance, Documents, Performance, Complaints)
    - [x] 15.4 Handle inactive account state — show access-restricted message instead of dashboard

- [x] 16. ClientWorkforceRosterScreen
  - **Spec**: requirements.md#Req 3, Req 11
  - **Description**: Build the read-only client roster screen showing personnel grouped by category with photo, name, designation, employee_id, mobile, and shift — no edit actions.
  - **Files**:
    - `mobile/src/screens/ClientWorkforceRosterScreen.tsx` — create: read-only SectionList, no navigation to detail/edit screens
  - **Dependencies**: 14, 37
  - **Subtasks**:
    - [x] 16.1 Build read-only SectionList with category headers
    - [x] 16.2 Show employee_id and shift timing on each card
    - [x] 16.3 Disable all tap-to-edit interactions

- [x] 17. ClientAttendanceScreen
  - **Spec**: requirements.md#Req 3, Req 5, Req 11
  - **Description**: Build the client attendance screen with Daily/Weekly/Monthly tab switcher showing attendance percentage and per-personnel status for the client's site.
  - **Files**:
    - `mobile/src/screens/ClientAttendanceScreen.tsx` — create: tab bar (Daily/Weekly/Monthly), attendance % header, personnel attendance list with AttendanceStatusBadge
  - **Dependencies**: 14, 37
  - **Subtasks**:
    - [x] 17.1 Build tab switcher for daily/weekly/monthly granularity
    - [x] 17.2 Display overall attendance % for selected period
    - [x] 17.3 List per-personnel attendance status with date range context

- [x] 18. ClientDocumentViewScreen and ClientPerformanceScreen
  - **Spec**: requirements.md#Req 3, Req 6, Req 11
  - **Description**: Build the document viewer screen (PDF/image) for permitted document types, and the performance overview screen showing per-personnel ratings, complaint counts, and appreciation.
  - **Files**:
    - `mobile/src/screens/ClientDocumentViewScreen.tsx` — create: PDF/image viewer for permitted document types; show 403 message for non-permitted types
    - `mobile/src/screens/ClientPerformanceScreen.tsx` — create: list of personnel with avg rating stars, open complaint count, appreciation count, last review date
  - **Dependencies**: 14, 37
  - **Subtasks**:
    - [x] 18.1 Build ClientDocumentViewScreen with PDF/image viewer (use expo-document-picker or WebView)
    - [x] 18.2 Enforce permitted document types client-side; show error for non-permitted
    - [x] 18.3 Build ClientPerformanceScreen with star rating display and complaint/appreciation counts

## Phase 4: Complaint & Escalation Workflow

- [x] 19. complaintService.ts
  - **Spec**: requirements.md#Req 4, Req 8, Req 11, Req 14
  - **Description**: Implement the complaint service for raising, querying, commenting on, and resolving complaints. Resolution must be atomic (single transaction). Escalation is handled server-side by the Escalation Engine.
  - **Files**:
    - `mobile/src/api/complaintService.ts` — create: raiseComplaint(), getComplaintsForSite(), getComplaintById(), addComment(), resolveComplaint()
  - **Dependencies**: 1, 2, 4
  - **Subtasks**:
    - [x] 19.1 Implement `raiseComplaint(data)` — INSERT complaint with sla_deadline = NOW() + 24h; trigger notification to supervisor
    - [x] 19.2 Implement `getComplaintsForSite(siteId)` — SELECT with status filter options
    - [x] 19.3 Implement `getComplaintById(id)` — SELECT complaint with joined comments (ordered by created_at ASC) and escalations
    - [x] 19.4 Implement `addComment(complaintId, text, actionTaken)` — INSERT into complaint_comments (append-only)
    - [x] 19.5 Implement `resolveComplaint(complaintId, resolutionNote)` — UPDATE status='resolved', resolved_at=NOW(), time_to_resolve_seconds computed; INSERT resolution comment atomically

- [x] 20. RaiseComplaintScreen and ClientComplaintListScreen
  - **Spec**: requirements.md#Req 4, Req 3, Req 11
  - **Description**: Build the complaint submission form for client users (category picker, description, severity), and the complaint list screen showing all complaints raised by the client with status badges.
  - **Files**:
    - `mobile/src/screens/RaiseComplaintScreen.tsx` — create: category picker, description TextInput, severity selector (low/medium/high/critical), submit button
    - `mobile/src/screens/ClientComplaintListScreen.tsx` — create: FlatList of complaints with status badge, tap to ComplaintDetail
  - **Dependencies**: 19, 37
  - **Subtasks**:
    - [x] 20.1 Build RaiseComplaintScreen form with category picker and severity selector
    - [x] 20.2 Validate required fields (category, description) before submit
    - [x] 20.3 Build ClientComplaintListScreen with status filter tabs (open/in_progress/resolved/all)
    - [x] 20.4 Show SLA deadline countdown on open complaints

- [x] 21. ComplaintDetailScreen and ComplaintTimelineScreen
  - **Spec**: requirements.md#Req 4, Req 8, Req 11, Req 14
  - **Description**: Build the complaint detail screen with resolve action for supervisors/managers, and the immutable timeline screen showing all comments and escalation events in chronological order.
  - **Files**:
    - `mobile/src/screens/ComplaintDetailScreen.tsx` — create: complaint header (status, level, SLA), resolve button (supervisor/manager only), add comment form, link to timeline
    - `mobile/src/screens/ComplaintTimelineScreen.tsx` — create: chronological FlatList of ComplaintTimelineItem components (comments + escalation events)
    - `mobile/src/components/ComplaintTimelineItem.tsx` — create: timestamp, author name+role, comment_text, action_taken badge
  - **Dependencies**: 19, 37
  - **Subtasks**:
    - [x] 21.1 Build ComplaintDetailScreen header with status badge, current_level indicator, SLA countdown
    - [x] 21.2 Add resolve action (visible only to supervisor at L1, ops_manager at L2/L3, admin at L3)
    - [x] 21.3 Add comment input with action_taken optional field
    - [x] 21.4 Build ComplaintTimelineScreen with chronological list
    - [x] 21.5 Create ComplaintTimelineItem component with escalation event styling

- [x] 22. Escalation Engine Edge Function
  - **Spec**: requirements.md#Req 4, Req 9, Req 13
  - **Description**: Implement the `escalation-engine` Supabase Edge Function that polls every 5 minutes for expired SLA complaints and stale vacancies, escalates complaints through levels 1→2→3, and sends FCM notifications.
  - **Files**:
    - `supabase/functions/escalation-engine/index.ts` — create: main handler, escalateToLevel2(), escalateToLevel3(), notifyOperationsManager() for stale vacancies
    - `supabase/functions/_shared/notifications.ts` — create: sendNotification() dispatch utility
  - **Dependencies**: 1, 3
  - **Subtasks**:
    - [x] 22.1 Implement main handler: query expired SLA complaints (sla_deadline < now, status not in resolved/closed)
    - [x] 22.2 Implement `escalateToLevel2()`: UPDATE complaint, INSERT escalation record, INSERT system comment, send FCM to site_manager + ops_manager
    - [x] 22.3 Implement `escalateToLevel3()`: UPDATE complaint, INSERT escalation record, INSERT system comment, send FCM to admin + super_admin
    - [x] 22.4 Implement stale vacancy check: query replacements with status='requested' and vacancy_start < NOW()-2h; notify ops_manager
    - [x] 22.5 Implement idempotency guard: verify current_level before escalating to prevent double-escalation

## Phase 5: Workforce Attendance Rules

- [x] 23. workforceAttendanceService.ts
  - **Spec**: requirements.md#Req 5, Req 8, Req 11
  - **Description**: Implement the workforce attendance service supporting geofence-verified check-in/check-out for Attendance Required categories and manual entry for Attendance Optional categories, plus correction approval.
  - **Files**:
    - `mobile/src/api/workforceAttendanceService.ts` — create: checkIn(), checkOut(), manualEntry(), getAttendanceForSite(), getAttendanceForPersonnel(), approveCorrection()
  - **Dependencies**: 1, 2, 4, 6
  - **Subtasks**:
    - [x] 23.1 Implement `checkIn(data)` — validate geofence (distance from site lat/lng ≤ geofence_radius) for Attendance Required categories; INSERT workforce_attendance record
    - [x] 23.2 Implement `checkOut(attendanceId, data)` — UPDATE check_out_time, compute hours_worked
    - [x] 23.3 Implement `manualEntry(data)` — INSERT with is_manual_entry=true; skip geofence check; allowed only for Attendance Optional or by supervisor/admin
    - [x] 23.4 Implement `getAttendanceForSite(siteId, date)` — SELECT all personnel attendance for site on date
    - [x] 23.5 Implement `getAttendanceForPersonnel(personnelId, from, to)` — SELECT attendance range
    - [x] 23.6 Implement `approveCorrection(attendanceId)` — UPDATE status='corrected', approved_by=current_user, approved_at=NOW()

- [x] 24. Attendance Check-In/Check-Out Flow for Workforce Personnel
  - **Spec**: requirements.md#Req 5, Req 11
  - **Description**: Extend the existing guard attendance flow to support workforce_personnel check-in/check-out, reusing the geofence hook and selfie capture, routing based on personnel category's attendance_required flag.
  - **Files**:
    - `mobile/src/screens/GuardAttendanceScreen.tsx` — modify: add support for workforce_personnel records alongside guards; use workforceAttendanceService for new personnel
  - **Dependencies**: 23, 37
  - **Subtasks**:
    - [x] 24.1 Detect whether logged-in user is legacy guard or workforce_personnel
    - [x] 24.2 Route Attendance Required personnel through geofence check-in flow
    - [x] 24.3 Route Attendance Optional personnel through manual entry form
    - [x] 24.4 Display today's check-in status and hours worked on home screen

- [x] 25. AttendanceCorrectionScreen (Supervisor)
  - **Spec**: requirements.md#Req 5, Req 8, Req 11
  - **Description**: Build the supervisor screen listing pending attendance correction requests with approve/reject actions, updating the attendance record status to 'corrected' on approval.
  - **Files**:
    - `mobile/src/screens/AttendanceCorrectionScreen.tsx` — create: FlatList of pending corrections (is_manual_entry=true, approved_by IS NULL), approve button per item
  - **Dependencies**: 23, 37
  - **Subtasks**:
    - [x] 25.1 Build list of pending manual attendance entries for supervisor's sites
    - [x] 25.2 Show personnel name, employee_id, date, shift, and reason for correction
    - [x] 25.3 Implement approve action calling approveCorrection(); update list optimistically

## Phase 6: Workforce Document Management

- [x] 26. workforceDocumentService.ts
  - **Spec**: requirements.md#Req 6, Req 11, Req 14
  - **Description**: Implement the document service for uploading files to Supabase Storage, persisting file_url in workforce_documents, verifying documents, and generating the per-personnel document checklist based on category-specific requirements.
  - **Files**:
    - `mobile/src/api/workforceDocumentService.ts` — create: getDocumentsForPersonnel(), getDocumentChecklist(), uploadDocument(), verifyDocument()
  - **Dependencies**: 1, 2, 4, 6
  - **Subtasks**:
    - [x] 26.1 Implement `getDocumentsForPersonnel(personnelId)` — SELECT all documents for personnel
    - [x] 26.2 Implement `getDocumentChecklist(personnelId)` — determine required document types from category (all/security/armed/housekeeping matrix), join with uploaded documents, return status per type
    - [x] 26.3 Implement `uploadDocument(personnelId, documentType, fileUri)` — upload to Supabase Storage bucket 'workforce-documents/{personnelId}/{documentType}', INSERT record with file_url
    - [x] 26.4 Implement `verifyDocument(documentId)` — UPDATE verified=true, verified_by=current_user, verified_at=NOW()

- [x] 27. DocumentChecklistScreen
  - **Spec**: requirements.md#Req 6, Req 11
  - **Description**: Build the per-personnel document checklist screen showing all required document types for the personnel's category with status indicators (Verified/Pending/Missing) and upload/verify action buttons.
  - **Files**:
    - `mobile/src/screens/DocumentChecklistScreen.tsx` — create: FlatList of DocumentChecklistItem components; upload button for missing/pending; verify button for uploaded-but-unverified (admin only)
    - `mobile/src/components/DocumentChecklistItem.tsx` — create: document_type label, status badge (green=verified, yellow=pending, red=missing), upload/verify action button
  - **Dependencies**: 26, 37
  - **Subtasks**:
    - [x] 27.1 Build DocumentChecklistScreen with checklist grouped by required/optional
    - [x] 27.2 Implement upload action: open image/file picker, call uploadDocument(), refresh checklist
    - [x] 27.3 Implement verify action (admin/supervisor only): call verifyDocument(), update badge
    - [x] 27.4 Create DocumentChecklistItem component with status badge and action button

## Phase 8: Supervisor Management

- [x] 28. supervisorService.ts
  - **Spec**: requirements.md#Req 8, Req 11
  - **Description**: Implement the supervisor service providing dashboard aggregates (assigned sites, total personnel, open complaints, attendance summary, vacancy count), pending attendance corrections, and incident report submission.
  - **Files**:
    - `mobile/src/api/supervisorService.ts` — create: getSupervisorDashboard(), getAssignedSites(), getPendingAttendanceCorrections(), approveAttendanceCorrection(), submitIncidentReport()
  - **Dependencies**: 1, 2, 4, 10, 19, 23
  - **Subtasks**:
    - [x] 28.1 Implement `getAssignedSites()` — SELECT sites where assigned_supervisor_id = current workforce_personnel.id
    - [x] 28.2 Implement `getSupervisorDashboard()` — aggregate: total personnel across assigned sites, open complaint count, today's attendance summary, vacancy count
    - [x] 28.3 Implement `getPendingAttendanceCorrections()` — SELECT workforce_attendance where is_manual_entry=true AND approved_by IS NULL for supervisor's sites
    - [x] 28.4 Implement `approveCorrection(attendanceId)` — delegate to workforceAttendanceService.approveCorrection()
    - [x] 28.5 Implement `submitIncidentReport(data)` — call complaintService.raiseComplaint() with incident_reported=true and severity

- [x] 29. SupervisorDashboardScreen
  - **Spec**: requirements.md#Req 8, Req 11
  - **Description**: Build the supervisor home dashboard showing assigned site cards (site name, workforce count, present today, open complaints) and summary metrics, with empty state when no sites are assigned.
  - **Files**:
    - `mobile/src/screens/SupervisorDashboardScreen.tsx` — create: summary metrics row, FlatList of SiteSummaryCard, quick-action buttons (Attendance Corrections, Vacancies, Incident Report)
  - **Dependencies**: 28, 37
  - **Subtasks**:
    - [x] 29.1 Build summary metrics row (total personnel, open complaints, vacancies)
    - [x] 29.2 Build SiteSummaryCard list with tap to SiteDashboard
    - [x] 29.3 Add empty state message when supervisor has zero assigned sites
    - [x] 29.4 Add quick-action buttons for Attendance Corrections, Vacancy Management, Incident Report

- [x] 30. VacancyManagementScreen and AssignReplacementScreen
  - **Spec**: requirements.md#Req 8, Req 9, Req 11
  - **Description**: Build the vacancy list screen showing open replacement requests for the supervisor's sites with VacancyWorkflowStepper, and the replacement assignment screen for picking an available replacement personnel.
  - **Files**:
    - `mobile/src/screens/VacancyManagementScreen.tsx` — create: FlatList of open replacements with VacancyWorkflowStepper, tap to AssignReplacement
    - `mobile/src/screens/AssignReplacementScreen.tsx` — create: personnel picker filtered to available (not assigned elsewhere on same shift_date), confirm assignment
    - `mobile/src/components/VacancyWorkflowStepper.tsx` — create: 4-step stepper (Absent → Requested → Assigned → Notified)
  - **Dependencies**: 32, 37
  - **Subtasks**:
    - [x] 30.1 Build VacancyManagementScreen with open replacements list
    - [x] 30.2 Show vacancy duration (time since vacancy_start) on each card
    - [x] 30.3 Build AssignReplacementScreen with available personnel picker
    - [x] 30.4 Prevent selecting personnel already assigned to another site on same shift_date
    - [x] 30.5 Create VacancyWorkflowStepper component

- [x] 31. IncidentReportScreen
  - **Spec**: requirements.md#Req 8, Req 11
  - **Description**: Build the incident report form for supervisors to submit a complaint with incident_reported=true, site picker (from assigned sites), description, and severity selector.
  - **Files**:
    - `mobile/src/screens/IncidentReportScreen.tsx` — create: site picker (assigned sites only), description TextInput, severity selector (low/medium/high/critical), submit button
  - **Dependencies**: 28, 19, 37
  - **Subtasks**:
    - [x] 31.1 Build form with site picker pre-filled if siteId param provided
    - [x] 31.2 Add severity selector with color-coded options
    - [x] 31.3 Submit via supervisorService.submitIncidentReport() and navigate to complaint detail

## Phase 9: Vacancy & Replacement Management

- [x] 32. replacementService.ts
  - **Spec**: requirements.md#Req 9, Req 11
  - **Description**: Implement the replacement service for querying open vacancies, assigning replacements (with conflict check for same-day assignments), cancelling, and completing replacements.
  - **Files**:
    - `mobile/src/api/replacementService.ts` — create: getReplacementsForSite(), assignReplacement(), cancelReplacement(), completeReplacement()
  - **Dependencies**: 1, 2, 4, 6
  - **Subtasks**:
    - [x] 32.1 Implement `getReplacementsForSite(siteId, date?)` — SELECT replacements with joined absent_personnel and replacement_personnel
    - [x] 32.2 Implement `assignReplacement(replacementId, replacementPersonnelId)` — check replacement personnel not already assigned on same shift_date; UPDATE status='assigned', client_notified=true; send notification to client_user
    - [x] 32.3 Implement `cancelReplacement(replacementId)` — UPDATE status='cancelled'
    - [x] 32.4 Implement `completeReplacement(replacementId)` — UPDATE status='completed', vacancy_end=NOW()

- [x] 33. Replacement Auto-Creation Trigger
  - **Spec**: requirements.md#Req 9, Req 14
  - **Description**: Write a database trigger on workforce_attendance that automatically creates a replacement record when a personnel from an Attendance Required category is marked absent.
  - **Files**:
    - `supabase/migrations/020_replacement_auto_trigger.sql` — create: trigger function `auto_create_replacement_on_absent()` + trigger on workforce_attendance AFTER INSERT OR UPDATE
  - **Dependencies**: 1
  - **Subtasks**:
    - [x] 33.1 Write `auto_create_replacement_on_absent()` function: check NEW.status='absent', check category attendance_required=true, INSERT into replacements ON CONFLICT DO NOTHING
    - [x] 33.2 Attach trigger AFTER INSERT OR UPDATE OF status ON workforce_attendance FOR EACH ROW
    - [x] 33.3 Verify idempotency: duplicate absent records do not create duplicate replacements (UNIQUE constraint on absent_personnel_id + site_id + shift_date)

- [x] 34. Vacancy Escalation in Escalation Engine
  - **Spec**: requirements.md#Req 9, Req 13
  - **Description**: Extend the escalation-engine Edge Function (task 22) to handle the 2-hour vacancy escalation: query stale requested replacements and send FCM notification to Operations Manager.
  - **Files**:
    - `supabase/functions/escalation-engine/index.ts` — modify: add stale vacancy query and notifyOperationsManager() call (already scaffolded in task 22)
  - **Dependencies**: 22, 32
  - **Subtasks**:
    - [x] 34.1 Verify stale vacancy query uses correct 2-hour threshold
    - [x] 34.2 Implement `notifyOperationsManager(vacancy)` — lookup ops_manager users, call sendNotification() with type='vacancy_escalated'
    - [x] 34.3 Prevent duplicate notifications: track notified vacancies or check client_notified flag

## Phase 10: Analytics Dashboard

- [x] 35. analyticsService.ts
  - **Spec**: requirements.md#Req 10, Req 11
  - **Description**: Implement the analytics service computing all 7 dashboard metrics with filter support (site_ids, category_ids, date range, region), including zero-denominator guards for attendance % and turnover rate, and CSV export.
  - **Files**:
    - `mobile/src/api/analyticsService.ts` — create: getWorkforceDistribution(), getAttendanceTrend(), getSiteDeployment(), getComplaintTrends(), getAverageResolutionTime(), getStaffTurnoverRate(), getVacancyRate(), exportAnalyticsCSV()
  - **Dependencies**: 1, 2, 4, 6, 10, 19, 23, 32
  - **Subtasks**:
    - [x] 35.1 Implement `getWorkforceDistribution(filters)` — GROUP BY category_id, count active personnel
    - [x] 35.2 Implement `getAttendanceTrend(filters)` — daily attendance % over date range; return 0% when expected days = 0
    - [x] 35.3 Implement `getSiteDeployment(filters)` — active assignment count per site
    - [x] 35.4 Implement `getComplaintTrends(filters)` — complaints created per day/week over date range
    - [x] 35.5 Implement `getAverageResolutionTime(filters)` — AVG(time_to_resolve_seconds) per site
    - [x] 35.6 Implement `getStaffTurnoverRate(filters)` — terminations / avg active headcount; return 'N/A' when headcount = 0
    - [x] 35.7 Implement `getVacancyRate(filters)` — vacancy duration days / (workforce_strength × period days) per site
    - [x] 35.8 Implement `exportAnalyticsCSV(filters)` — build CSV string from filtered data, save to device via expo-sharing

- [x] 36. AnalyticsDashboardScreen
  - **Spec**: requirements.md#Req 10, Req 11
  - **Description**: Build the analytics dashboard screen with 7 charts (using react-native-chart-kit or victory-native), filter bar (site multi-select, category multi-select, date range), and CSV export button. Accessible to Admin and Super_Admin only.
  - **Files**:
    - `mobile/src/screens/AnalyticsDashboardScreen.tsx` — create: filter bar, 7 chart sections, export button; re-fetch all charts on filter change
  - **Dependencies**: 35, 37
  - **Subtasks**:
    - [x] 36.1 Build filter bar: site multi-select, category multi-select, date range pickers, region text input
    - [x] 36.2 Build Workforce Distribution pie/donut chart
    - [x] 36.3 Build Attendance Percentage line chart over time
    - [x] 36.4 Build Site-wise Deployment bar chart
    - [x] 36.5 Build Complaint Trends line chart and Average Resolution Time bar chart
    - [x] 36.6 Build Staff Turnover Rate line chart and Vacancy Rate bar chart
    - [x] 36.7 Add CSV export button calling exportAnalyticsCSV() and sharing via native share sheet
    - [x] 36.8 Add role guard: redirect non-admin users away from this screen

## Phase 11: Navigation & Role-Based Routing

- [x] 37. Extend App.tsx RootStackParamList with All New Routes
  - **Spec**: requirements.md#Req 11
  - **Description**: Add all new screen routes to the existing `RootStackParamList` type in `App.tsx` and register each screen in the Stack.Navigator, covering Admin, Supervisor, Client Portal, Operations Manager, and shared routes.
  - **Files**:
    - `mobile/App.tsx` — modify: extend RootStackParamList with all 25+ new routes; add Stack.Screen registrations for all new screens
  - **Dependencies**: none
  - **Subtasks**:
    - [x] 37.1 Add Admin workforce routes: WorkforceCategoryList, AddWorkforceCategory, WorkforcePersonnelList, AddWorkforcePersonnel, WorkforcePersonnelDetail
    - [x] 37.2 Add Admin site routes: SiteDashboard, WorkforceRoster, DocumentChecklist, AssignPersonnel, AnalyticsDashboard
    - [x] 37.3 Add Supervisor routes: SupervisorDashboard, AttendanceCorrection, VacancyManagement, AssignReplacement, IncidentReport, SupervisorComplaintList
    - [x] 37.4 Add Client Portal routes: ClientPortalHome, ClientWorkforceRoster, ClientAttendance, ClientDocumentView, ClientPerformance, RaiseComplaint, ClientComplaintList
    - [x] 37.5 Add shared routes: ComplaintDetail, ComplaintTimeline; add Operations Manager routes: OperationsDashboard, EscalatedComplaints

- [x] 38. Role-Based Routing on Login
  - **Spec**: requirements.md#Req 11, Req 3
  - **Description**: Update the post-authentication navigation logic in `SplashScreen` and `OtpScreen` to route each role to their designated home screen, including the new operations_manager, supervisor, client_user, and workforce_personnel roles.
  - **Files**:
    - `mobile/src/screens/SplashScreen.tsx` — modify: add role-based navigation switch for all 6 new roles
    - `mobile/src/screens/OtpScreen.tsx` — modify: add same role-based navigation switch after OTP verification
  - **Dependencies**: 37
  - **Subtasks**:
    - [x] 38.1 Add `operations_manager` → OperationsDashboard routing
    - [x] 38.2 Add `supervisor` → SupervisorDashboard routing
    - [x] 38.3 Add `client_user` → ClientPortalHome routing with inactive account check
    - [x] 38.4 Add `workforce_personnel` → GuardHome routing (reuse existing)
    - [x] 38.5 Preserve legacy `guard`, `manager`, `recruiter` role routing unchanged

## Phase 12: Notification System

- [x] 39. Notification Dispatch Shared Utility
  - **Spec**: requirements.md#Req 13, Req 14
  - **Description**: Implement the `sendNotification()` shared utility in `supabase/functions/_shared/notifications.ts` that looks up FCM tokens, inserts a notifications table record, sends FCM via HTTP, and logs delivery failures without throwing.
  - **Files**:
    - `supabase/functions/_shared/notifications.ts` — create: sendNotification(), sendNotificationToMultiple() helper
  - **Dependencies**: 1, 22
  - **Subtasks**:
    - [x] 39.1 Implement `sendNotification(userId, payload)` — SELECT fcm_token from users, INSERT notifications record, POST to FCM API
    - [x] 39.2 Implement `sendNotificationToMultiple(userIds, payload)` — loop over userIds calling sendNotification(); catch per-user errors without stopping others
    - [x] 39.3 Handle invalid/expired FCM token: catch FCM 400/404 response, log error with userId, continue (Req 13.8)
    - [x] 39.4 Extend notifications type CHECK constraint to include all 5 new notification types (already in migration 014)

- [x] 40. Wire Notifications to All Trigger Points
  - **Spec**: requirements.md#Req 13
  - **Description**: Integrate `sendNotification()` calls at all 5 trigger points: complaint raised (→ supervisor), complaint escalated L2 (→ site_manager + ops_manager), complaint escalated L3 (→ admin + super_admin), replacement assigned (→ client_user), vacancy open >2h (→ ops_manager).
  - **Files**:
    - `mobile/src/api/complaintService.ts` — modify: call sendNotification after raiseComplaint() (via Edge Function or direct)
    - `supabase/functions/escalation-engine/index.ts` — modify: verify all FCM calls use sendNotification() from shared utility
    - `mobile/src/api/replacementService.ts` — modify: call notification after assignReplacement() sets client_notified=true
  - **Dependencies**: 19, 22, 32, 39
  - **Subtasks**:
    - [x] 40.1 Wire complaint_raised notification: after raiseComplaint(), lookup site supervisor and call sendNotification()
    - [x] 40.2 Verify escalation-engine escalateToLevel2() calls sendNotificationToMultiple() for site_manager + ops_manager
    - [x] 40.3 Verify escalation-engine escalateToLevel3() calls sendNotificationToMultiple() for admin + super_admin
    - [x] 40.4 Wire replacement_assigned notification: after assignReplacement(), lookup client_user for site and call sendNotification()
    - [x] 40.5 Verify escalation-engine notifyOperationsManager() sends vacancy_escalated notification with correct entity_id and site_id

## Phase 13: Operations Manager Screens

- [x] 41. OperationsDashboardScreen and EscalatedComplaintsScreen
  - **Spec**: requirements.md#Req 4, Req 11
  - **Description**: Build the operations manager home dashboard showing multi-site overview with escalated complaint counts and open vacancy counts, and the escalated complaints list filtered to L2/L3 status.
  - **Files**:
    - `mobile/src/screens/OperationsDashboardScreen.tsx` — create: multi-site summary cards, escalated complaint count badge, open vacancy count, navigate to EscalatedComplaints and SiteDashboard
    - `mobile/src/screens/EscalatedComplaintsScreen.tsx` — create: FlatList filtered to status IN (escalated_l2, escalated_l3), tap to ComplaintDetail
  - **Dependencies**: 10, 19, 37
  - **Subtasks**:
    - [x] 41.1 Build OperationsDashboardScreen with site cards showing workforce count and escalated complaint badge
    - [x] 41.2 Add escalated complaints summary section with count and navigate to EscalatedComplaintsScreen
    - [x] 41.3 Build EscalatedComplaintsScreen with L2/L3 filter tabs and SLA countdown per complaint
    - [x] 41.4 Add resolve action on L2/L3 complaints for operations_manager role

## Shared Components Summary

- [x] 42. Shared UI Components
  - **Spec**: requirements.md#Req 2, Req 4, Req 5, Req 6, Req 9
  - **Description**: Create all shared UI components referenced across multiple screens that are not yet built as part of individual screen tasks.
  - **Files**:
    - `mobile/src/components/AttendanceStatusBadge.tsx` — create: color-coded badge (green=present, red=absent, yellow=late, grey=N/A)
    - `mobile/src/components/CategoryBadge.tsx` — create: colored chip with category name
  - **Dependencies**: none
  - **Subtasks**:
    - [x] 42.1 Create AttendanceStatusBadge with present/absent/late/half_day/corrected/N/A states
    - [x] 42.2 Create CategoryBadge with consistent color mapping per category name
    - [x] 42.3 Ensure all shared components are accessible (sufficient color contrast, screen reader labels)

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 0,
      "tasks": [1, 4, 37, 42],
      "description": "Database migrations, TypeScript types, navigation routes, and shared components — no dependencies"
    },
    {
      "wave": 1,
      "tasks": [2, 5, 6, 10, 14, 19, 23, 26, 32, 35, 39],
      "description": "RLS policies and all service layer modules — depend on wave 0"
    },
    {
      "wave": 2,
      "tasks": [3, 7, 8, 11, 12, 13, 15, 16, 17, 18, 20, 21, 22, 24, 25, 27, 28, 33, 36, 38],
      "description": "Compatibility views, all screens, escalation engine, replacement trigger, role routing — depend on wave 1"
    },
    {
      "wave": 3,
      "tasks": [9, 29, 30, 31, 34, 40, 41],
      "description": "Detail screens, supervisor screens, vacancy escalation, notification wiring, ops screens — depend on wave 2"
    }
  ]
}
```

## Notes

- All migration scripts must be idempotent (safe to run twice). Use `IF NOT EXISTS`, `CREATE OR REPLACE`, and `ON CONFLICT DO NOTHING` throughout.
- The `employee_id` field is immutable after INSERT — enforced by DB trigger `trg_immutable_employee_id`. Never attempt to UPDATE it in service code.
- `complaint_comments` and `complaint_escalations` are append-only — no UPDATE or DELETE RLS policies exist for any role.
- Soft deletes only: never hard-delete `workforce_personnel`, `complaints`, `complaint_comments`, `complaint_escalations`, or `workforce_documents`.
- The legacy `guards` table and all existing API endpoints must remain functional throughout. New Guard records dual-write to both `workforce_personnel` and `guards`; failure of the legacy write is logged but does not roll back the primary insert.
- Task 37 (App.tsx route registration) should be done early as all screen tasks depend on it for navigation type safety.
- The Escalation Engine Edge Function (task 22) runs every 5 minutes via pg_cron — ensure idempotency by checking `current_level` before escalating.
