# Requirements Document

## Introduction

Pan India Security currently operates a Guard-only workforce management mobile application (React Native/Expo with Supabase backend). This feature expands the platform into a complete **Workforce & Facility Management System** capable of managing all manpower categories deployed at client sites — including security personnel, facility & maintenance staff, and administrative staff.

The expansion is delivered in ten modular phases to ensure the existing Guard functionality continues operating without interruption during migration. New capabilities include: a generic personnel architecture with dynamic categories, site-based workforce dashboards, a dedicated client portal, a 3-level complaint and escalation workflow, configurable attendance rules, category-specific document management, structured employee ID formats, supervisor management, vacancy and replacement tracking, and an analytics dashboard.

---

## Glossary

- **Platform**: The Pan India Security React Native/Expo mobile application backed by Supabase.
- **Workforce_Personnel**: Any employee managed by the Platform, regardless of category (replaces the legacy "Guard" concept for new features while remaining backward-compatible).
- **Personnel_Category**: A named classification of Workforce_Personnel (e.g., Guard, Housekeeping, Electrician). Categories are either system-defined or admin-created.
- **Site**: A client location where Workforce_Personnel are deployed.
- **Site_Dashboard**: The per-site screen showing workforce composition, attendance, and vacancy metrics.
- **Workforce_Roster**: The list of Workforce_Personnel assigned to a Site, grouped by Personnel_Category.
- **Client_User**: A read-only portal user representing a client contact (Society President, Society Secretary, or Facility Manager).
- **Complaint**: A formal issue raised by a Client_User or Supervisor against a Site or Workforce_Personnel.
- **Escalation_Engine**: The automated service that advances a Complaint to the next escalation level when an SLA timer expires.
- **SLA**: Service Level Agreement — the maximum time allowed at each complaint escalation level before automatic escalation.
- **Attendance_Rule**: A per-category configuration that marks attendance as Required or Optional.
- **Workforce_Document**: A file (Aadhaar, PAN, Police Verification, etc.) attached to a Workforce_Personnel record.
- **Employee_ID**: A system-generated, category-prefixed identifier assigned to each Workforce_Personnel (e.g., PIS-0001, HK-0001).
- **Supervisor**: A Workforce_Personnel with the Supervisor role who manages one or more Sites.
- **Vacancy**: A position at a Site that is unfilled due to absence or an open headcount slot.
- **Replacement**: A Workforce_Personnel assigned to cover a Vacancy temporarily.
- **Analytics_Dashboard**: The admin-facing screen displaying aggregated workforce metrics with charts and filters.
- **RLS**: Row-Level Security — Supabase policy controlling which database rows each role can read or write.
- **Super_Admin**: The highest-privilege system role with unrestricted access.
- **Admin**: A company-level user who manages all Sites and Workforce_Personnel.
- **Operations_Manager**: A user who oversees multiple Sites and handles Level 2 escalations.
- **Guard**: Legacy term for a security guard; maps to the "Guard" Personnel_Category in the new architecture.

---

## Requirements

---

### Requirement 1: Generic Workforce Personnel Architecture

**User Story:** As an Admin, I want to manage all types of deployed personnel under a single unified architecture, so that I can replace the Guard-only model without losing existing data or functionality.

#### Acceptance Criteria

1. THE Platform SHALL maintain full backward compatibility with all existing Guard records, attendance data, payroll records, and assignments during and after migration to the new architecture.
2. THE Platform SHALL define the following system Personnel_Categories at initial migration: Guard, Gunman, Rifleman, PSO, Bouncer, Supervisor, Security Officer, Housekeeping, Sweeper, Gardener, Electrician, Plumber, Carpenter, Lift Operator, Pump Operator, Technician, Receptionist, Office Assistant, Data Entry Operator.
3. WHEN an Admin creates a new Personnel_Category, THE Platform SHALL persist the category name, a unique prefix code (2–5 uppercase letters), and the creating Admin's ID.
4. IF a Personnel_Category name already exists (case-insensitive), THEN THE Platform SHALL reject the creation request and return a descriptive error message.
5. THE Platform SHALL assign each Workforce_Personnel record to exactly one Personnel_Category.
6. WHEN a Workforce_Personnel record is created, THE Platform SHALL generate a unique Employee_ID using the format `<PREFIX>-<SEQUENCE>` where SEQUENCE is a zero-padded 4-digit integer incrementing per category (e.g., PIS-0001, HK-0001).
7. THE Platform SHALL expose a `workforce_personnel` table in Supabase that stores: id, user_id (FK → users), category_id (FK → workforce_categories), employee_id, name, phone, photo_url, base_salary, joining_date, shift_type, employment_status, emergency_contact_name, emergency_contact_phone, bank_account_number, bank_ifsc, bank_name, aadhaar_number, pan_number, address, and created_at.
8. THE Platform SHALL expose a `workforce_categories` table that stores: id, name, prefix_code, attendance_required (boolean), is_system_defined (boolean), created_by, and created_at.
9. WHEN the Platform generates an Employee_ID, THE Employee_ID_Generator SHALL guarantee uniqueness within the Personnel_Category across concurrent inserts using a database-level sequence or advisory lock. IF the uniqueness mechanism fails and a duplicate Employee_ID is detected at the application level, THE Platform SHALL log the conflict, append a collision-resolution suffix, and retry generation to produce a unique value.

---

### Requirement 2: Site-Based Workforce Management

**User Story:** As an Admin or Operations_Manager, I want to view and manage all Workforce_Personnel deployed at each Site through a dedicated Site Dashboard, so that I can monitor staffing levels and identify gaps in real time.

#### Acceptance Criteria

1. THE Platform SHALL extend the existing `sites` table with the following additional columns: site_type (VARCHAR), society_president_name (VARCHAR), society_president_phone (VARCHAR), society_secretary_name (VARCHAR), society_secretary_phone (VARCHAR), site_manager_id (FK → users), assigned_supervisor_id (FK → workforce_personnel), and workforce_strength (INT).
2. WHEN an Admin or Operations_Manager opens a Site, THE Site_Dashboard SHALL display: Total Workforce count, Security Personnel count, Housekeeping Personnel count, Supervisor count, Present Today count, Absent Today count, and Vacant Positions count.
3. THE Site_Dashboard SHALL compute Vacant Positions as `workforce_strength − count of active assignments`. THE Platform SHALL NOT subtract absent personnel from the assignment count; a position is considered filled as long as an active assignment exists regardless of today's attendance status.
4. WHEN an Admin or Operations_Manager views the Workforce_Roster for a Site, THE Platform SHALL display Workforce_Personnel grouped by Personnel_Category, showing for each person: photo, name, designation (Personnel_Category name), Employee_ID, mobile number, shift timing, and today's attendance status.
5. THE Platform SHALL expose a `site_assignments` table that stores: id, site_id (FK → sites), personnel_id (FK → workforce_personnel), shift_type, start_date, end_date (nullable), and is_active (boolean).
6. WHEN a Workforce_Personnel is assigned to a Site, THE Platform SHALL deactivate any previous active assignment for that personnel record before creating the new assignment.
7. IF workforce_strength is not set for a Site, THEN THE Site_Dashboard SHALL display "Strength not configured" in place of the Vacant Positions metric.

---

### Requirement 3: Client Portal

**User Story:** As a Society President, Society Secretary, or Facility Manager, I want a dedicated read-only portal showing my assigned Site's workforce, documents, attendance, and performance data, so that I can monitor service quality without contacting the company directly.

#### Acceptance Criteria

1. THE Platform SHALL support a Client_User role with read-only access restricted to the single Site assigned to that Client_User.
2. THE Platform SHALL enforce RLS policies on all Supabase tables so that a Client_User can only SELECT rows belonging to their assigned site_id.
3. WHEN a Client_User logs in, THE Platform SHALL navigate them to their Site's Client Portal screen, not the Admin Dashboard. IF the Client_User's account is inactive or their site access has been revoked, THE Platform SHALL display an access-restricted message on the Client Portal screen rather than redirecting to a different screen.
4. THE Client Portal SHALL display the Workforce_Roster for the assigned Site, showing: photo, name, designation, Employee_ID, mobile number, and shift timing for each Workforce_Personnel.
5. WHEN a Client_User requests to view a Workforce_Document, THE Platform SHALL display the document only if the document type is one of: Aadhaar, PAN, Police Verification, Training Certificate, or Gun License.
6. THE Client Portal SHALL display attendance data for the assigned Site at daily, weekly, and monthly granularities.
7. THE Client Portal SHALL display a Workforce Performance Overview for each Workforce_Personnel at the assigned Site, showing: average rating (0–5 stars), open complaint count, appreciation count, and date of last review.
8. IF a Client_User attempts to access any Site other than their assigned site_id, THEN THE Platform SHALL return a 403 Forbidden response.
9. THE Platform SHALL expose a `client_users` table that stores: id, user_id (FK → users), site_id (FK → sites), client_role (CHECK: society_president, society_secretary, facility_manager), and is_active (boolean).

---

### Requirement 4: Complaint and Escalation Workflow

**User Story:** As a Society President, I want to raise complaints about workforce performance or site issues and track their resolution through a structured escalation process, so that problems are addressed within defined timeframes.

#### Acceptance Criteria

1. WHEN a Client_User raises a Complaint, THE Platform SHALL create a complaint record with: id, site_id, raised_by (FK → client_users), category (VARCHAR), description (TEXT), status (CHECK: open, in_progress, escalated_l2, escalated_l3, resolved, closed), current_level (INT CHECK: 1, 2, 3), sla_deadline (TIMESTAMPTZ), and created_at.
2. WHEN a Complaint is created at Level 1, THE Platform SHALL assign it to the Supervisor of the Site and start an SLA timer with a deadline of 24 hours from creation time.
3. WHEN the SLA timer for a Level 1 Complaint expires without resolution, THE Escalation_Engine SHALL automatically advance the Complaint to Level 2, assign it to the Site Manager and Operations_Manager, reset the SLA timer to 12 hours, and send push notifications to the Site Manager and Operations_Manager.
4. WHEN the SLA timer for a Level 2 Complaint expires without resolution, THE Escalation_Engine SHALL automatically advance the Complaint to Level 3, assign it to the Admin and Super_Admin, mark the Complaint status as "Critical Issue", reset the SLA timer to 6 hours, and send push notifications to the Admin and Super_Admin.
5. THE Platform SHALL maintain an immutable complaint timeline in a `complaint_comments` table that stores: id, complaint_id (FK → complaints), author_id (FK → users), comment_text, action_taken (VARCHAR), created_at. No UPDATE or DELETE operations SHALL be permitted on this table.
6. THE Platform SHALL expose a `complaint_escalations` table that stores: id, complaint_id, from_level, to_level, escalated_at, escalated_by (system or user_id), reason.
7. WHEN a Supervisor or Manager resolves a Complaint, THE Platform SHALL atomically set the complaint status to "resolved", record the resolution timestamp, and stop the SLA timer within a single database transaction. IF any part of this transaction fails, THE Platform SHALL roll back all changes and leave the complaint in its previous unresolved state.
8. THE Platform SHALL display the full complaint timeline to all users with access to that complaint, ordered by created_at ascending.
9. IF a Complaint is resolved before the SLA deadline, THE Platform SHALL record the resolution time and compute the time-to-resolve metric for analytics.
10. THE Escalation_Engine SHALL run as a Supabase scheduled function (pg_cron or Edge Function cron) polling for expired SLA deadlines at intervals no greater than 5 minutes.

---

### Requirement 5: Workforce Attendance Rules

**User Story:** As an Admin, I want to configure attendance tracking as required or optional per Personnel_Category, so that the system correctly enforces check-in obligations for relevant staff while excluding categories where attendance tracking is not applicable.

#### Acceptance Criteria

1. THE Platform SHALL mark the following Personnel_Categories as Attendance Required by default: Guard, Supervisor, Housekeeping, Gardener, Electrician, Plumber, Receptionist, Technician.
2. THE Platform SHALL mark the following Personnel_Categories as Attendance Optional by default: Bouncer, Gunman, Rifleman, PSO.
3. WHEN an Admin updates the `attendance_required` flag for a Personnel_Category, THE Platform SHALL apply the new rule to all future attendance records for that category without modifying historical records.
4. WHILE a Workforce_Personnel belongs to an Attendance Required category, THE Platform SHALL enforce the existing geofence-verified check-in/check-out flow for that personnel.
5. WHILE a Workforce_Personnel belongs to an Attendance Optional category, THE Platform SHALL allow attendance to be recorded manually by a Supervisor or Admin without geofence enforcement.
6. THE Platform SHALL extend the existing `attendance` table (or create a `workforce_attendance` table) to reference `workforce_personnel.id` instead of (or in addition to) `guards.id`, preserving all existing columns and constraints.
7. WHEN the Site_Dashboard computes Present Today, THE Platform SHALL count only Workforce_Personnel from Attendance Required categories who have a check-in record for the current date.
8. THE Platform SHALL control attendance visibility per role: Client_Users see only their site's attendance; Supervisors see only their assigned sites; Admins and Operations_Managers see all sites.

---

### Requirement 6: Workforce Document Management

**User Story:** As an Admin, I want to upload and manage category-specific documents for each Workforce_Personnel, so that compliance requirements are met and documents are accessible to authorised users.

#### Acceptance Criteria

1. THE Platform SHALL require the following documents for all Workforce_Personnel categories: Aadhaar Card, PAN Card, Address Proof, Bank Passbook, Photograph.
2. THE Platform SHALL additionally require the following documents for Security Personnel categories (Guard, Gunman, Rifleman, PSO, Bouncer, Supervisor, Security Officer): Police Verification Certificate, Security Training Certificate.
3. THE Platform SHALL additionally require the following documents for armed personnel categories (Gunman, Rifleman, PSO): Gun License, Ex-Servicemen Proof, Weapon Training Certificate.
4. THE Platform SHALL additionally require the following document exclusively for the Housekeeping Personnel_Category: Medical Fitness Certificate. This requirement SHALL NOT apply to any other Personnel_Category.
5. THE Platform SHALL expose a `workforce_documents` table that stores: id, personnel_id (FK → workforce_personnel), document_type (VARCHAR), file_url (TEXT), uploaded_by (FK → users), verified (BOOLEAN DEFAULT false), verified_by (FK → users, nullable), verified_at (TIMESTAMPTZ, nullable), and created_at.
6. WHEN an Admin uploads a Workforce_Document, THE Platform SHALL store the file in Supabase Storage and persist the resulting file_url in the `workforce_documents` table.
7. WHEN an Admin marks a Workforce_Document as verified, THE Platform SHALL record the verifying user's ID and the verification timestamp.
8. THE Platform SHALL display a document checklist per Workforce_Personnel showing required document types for their category, with status indicators: Uploaded & Verified, Uploaded & Pending Verification, or Missing.
9. IF a Client_User requests a document type not in the permitted list (Aadhaar, PAN, Police Verification, Training Certificate, Gun License), THEN THE Platform SHALL return a 403 Forbidden response.
10. THE Platform SHALL enforce RLS on `workforce_documents` so that a Workforce_Personnel can only read their own documents, Supervisors can read documents for personnel at their assigned sites, and Admins can read and write all documents.

---

### Requirement 7: Workforce Employee ID Format

**User Story:** As an Admin, I want each Workforce_Personnel to receive a unique, category-specific Employee ID automatically upon creation, so that personnel can be identified unambiguously across all system screens and reports.

#### Acceptance Criteria

1. THE Platform SHALL assign Employee_IDs using the following category-to-prefix mapping: Guard → PIS, Bouncer → BNC, Gunman → GM, Rifleman → RM, PSO → PSO, Supervisor → SUP, Security Officer → SO, Housekeeping → HK, Sweeper → SWP, Gardener → GRD, Electrician → ELE, Plumber → PLM, Carpenter → CRP, Lift Operator → LFT, Pump Operator → PMP, Technician → TCH, Receptionist → REC, Office Assistant → OA, Data Entry Operator → DEO.
2. THE Platform SHALL format Employee_IDs as `<PREFIX>-<SEQUENCE>` where SEQUENCE is a zero-padded 4-digit integer starting at 0001 per category (e.g., PIS-0001, HK-0001, ELE-0001). WHEN the sequence number for a category exceeds 9999, THE Employee_ID_Generator SHALL expand the sequence to 5 or more digits without zero-padding truncation (e.g., PIS-10000, PIS-10001).
3. WHEN a new Personnel_Category is created by an Admin, THE Admin SHALL provide a unique prefix code of 2–5 uppercase letters, and THE Platform SHALL use that prefix for all Employee_IDs in that category.
4. THE Platform SHALL guarantee that no two Workforce_Personnel records share the same Employee_ID.
5. WHEN a Workforce_Personnel record is displayed anywhere in the Platform, THE Platform SHALL show the Employee_ID alongside the personnel's name.
6. THE Platform SHALL NOT allow manual editing of an Employee_ID after it has been assigned.

---

### Requirement 8: Supervisor Management

**User Story:** As a Supervisor, I want a dedicated dashboard showing my assigned sites, the workforce under my management, open complaints, attendance status, and vacancies, so that I can manage daily operations efficiently.

#### Acceptance Criteria

1. WHEN a Supervisor logs in, THE Platform SHALL display the Supervisor Dashboard showing: list of assigned Sites, total Workforce_Personnel under management, open Complaint count, today's attendance summary, and current Vacancy count. WHEN a Supervisor has zero assigned Sites, THE Platform SHALL display the Supervisor Dashboard with empty state messages for each metric section.
2. THE Supervisor Dashboard SHALL display each assigned Site as a card with: site name, workforce count, present today count, and open complaint count.
3. WHEN a Supervisor approves an attendance correction request, THE Platform SHALL update the attendance record status to "corrected", record the approving Supervisor's ID and approval timestamp, and log the action in the complaint timeline if the correction is linked to a complaint.
4. WHEN a Supervisor resolves a Level 1 Complaint, THE Platform SHALL set the complaint status to "resolved" and record the resolution in the `complaint_comments` table.
5. WHEN a Supervisor assigns a Replacement for a Vacancy, THE Platform SHALL create a replacement record linking the absent Workforce_Personnel, the replacement Workforce_Personnel, the Site, and the shift date.
6. WHEN a Supervisor submits an incident report, THE Platform SHALL create a complaint record with incident_reported = true and severity set by the Supervisor (low, medium, high, critical).
7. THE Platform SHALL restrict Supervisor access so that a Supervisor can only view and act on Workforce_Personnel, attendance records, complaints, and vacancies belonging to their assigned Sites.

---

### Requirement 9: Vacancy and Replacement Management

**User Story:** As an Admin or Supervisor, I want to track workforce vacancies and manage replacements through a structured workflow, so that client sites are never understaffed and clients are notified of coverage changes.

#### Acceptance Criteria

1. THE Platform SHALL expose a `replacements` table that stores: id, absent_personnel_id (FK → workforce_personnel), replacement_personnel_id (FK → workforce_personnel, nullable), site_id (FK → sites), shift_date (DATE), status (CHECK: requested, assigned, completed, cancelled), requested_by (FK → users), assigned_by (FK → users, nullable), client_notified (BOOLEAN DEFAULT false), vacancy_start (TIMESTAMPTZ), vacancy_end (TIMESTAMPTZ, nullable), and created_at.
2. WHEN a Workforce_Personnel from an Attendance Required category is marked absent, THE Platform SHALL automatically create a replacement record with status = "requested" for that personnel's Site and shift date.
3. WHEN an Admin or Supervisor assigns a Replacement, THE Platform SHALL update the replacement record status to "assigned", record the assigning user's ID, and send a push notification to the Client_User of the affected Site.
4. WHEN a replacement record status is set to "assigned", THE Platform SHALL set client_notified = true.
5. THE Platform SHALL track vacancy duration as the elapsed time between vacancy_start and vacancy_end. WHEN vacancy_start and vacancy_end are identical, THE Platform SHALL record a vacancy duration of zero and treat the vacancy as valid.
6. THE Platform SHALL display the vacancy workflow status using the sequence: Absent Employee → Replacement Requested → Replacement Assigned → Client Notified.
7. IF a replacement Workforce_Personnel is not available within 2 hours of a vacancy being created, THE Platform SHALL escalate the vacancy notification to the Operations_Manager.
8. THE Platform SHALL prevent assigning a Workforce_Personnel as a Replacement if they are already assigned to another Site on the same shift_date.

---

### Requirement 10: Analytics Dashboard

**User Story:** As an Admin or Super_Admin, I want an analytics dashboard with charts and filters showing workforce distribution, attendance trends, complaint metrics, and staff turnover, so that I can make data-driven operational decisions.

#### Acceptance Criteria

1. THE Analytics_Dashboard SHALL display the following charts: Workforce Distribution by Personnel_Category (pie or donut chart), Attendance Percentage over time (line chart), Site-wise Deployment (bar chart), Complaint Trends over time (line chart), Average Complaint Resolution Time (bar chart), Staff Turnover Rate (line chart), and Vacancy Rate by Site (bar chart).
2. THE Analytics_Dashboard SHALL provide the following filter controls: Site (multi-select), Region (text or multi-select), Personnel_Category (multi-select), and Date Range (start date and end date pickers).
3. WHEN a filter is applied, THE Analytics_Dashboard SHALL recompute and re-render all charts using only data matching the selected filter criteria within 3 seconds on a standard mobile device.
4. THE Platform SHALL compute Attendance Percentage as `(total present days / total expected attendance days) × 100` for the selected date range and filters. WHEN the total expected attendance days for the selected period and filters is zero, THE Analytics_Dashboard SHALL display 0% for the Attendance Percentage metric.
5. THE Platform SHALL compute Staff Turnover Rate as `(number of terminations in period / average active headcount in period) × 100`. WHEN the average active headcount for the selected period is zero, THE Analytics_Dashboard SHALL display "N/A" for the Staff Turnover Rate metric rather than a numeric value.
6. THE Platform SHALL compute Vacancy Rate as `(total vacant position-days / total workforce_strength-days) × 100` for the selected period and site filters.
7. THE Analytics_Dashboard SHALL be accessible only to users with the Super_Admin or Admin role.
8. WHEN an Admin exports analytics data, THE Platform SHALL generate a CSV file containing the filtered dataset and make it available for download or sharing via the device's native share sheet.

---

### Requirement 11: Role-Based Access Control

**User Story:** As a Super_Admin, I want a clearly defined role hierarchy with enforced access boundaries, so that each user type can only access and modify data appropriate to their responsibilities.

#### Acceptance Criteria

1. THE Platform SHALL support the following roles: Super_Admin, Admin, Operations_Manager, Supervisor, Client_User, Workforce_Personnel.
2. THE Platform SHALL enforce the following access matrix:
   - Super_Admin: full read/write access to all tables and all sites.
   - Admin: full read/write access to all Workforce_Personnel, Sites, Complaints, Documents, and Analytics for their company.
   - Operations_Manager: read/write access to Sites and Workforce_Personnel assigned to them; read access to all complaints; write access to Level 2 and Level 3 complaints.
   - Supervisor: read/write access to Workforce_Personnel, attendance, complaints, and vacancies for their assigned Sites only.
   - Client_User: read-only access to their assigned Site's roster, documents (permitted types only), attendance, and performance data.
   - Workforce_Personnel: read access to their own profile, attendance records, salary slips, and documents.
3. THE Platform SHALL implement all access boundaries as Supabase RLS policies on every affected table.
4. IF a user attempts an operation outside their role's permitted access, THEN THE Platform SHALL return a 403 Forbidden response with a descriptive error message.
5. THE Platform SHALL navigate each role to their designated home screen upon successful login: Super_Admin and Admin → Admin Dashboard; Operations_Manager → Operations Dashboard; Supervisor → Supervisor Dashboard; Client_User → Client Portal; Workforce_Personnel → Personnel Home Screen.

---

### Requirement 12: Backward Compatibility and Migration

**User Story:** As an Admin, I want the existing Guard functionality to continue working without interruption during and after the platform expansion, so that daily operations are not disrupted.

#### Acceptance Criteria

1. THE Platform SHALL preserve all existing `guards` table records and map each guard to the "Guard" Personnel_Category in the new `workforce_personnel` table during migration.
2. THE Platform SHALL preserve all existing `attendance`, `payroll`, `guard_site_assignments`, `guard_documents`, and `uniforms` records without data loss during migration.
3. THE Platform SHALL provide Supabase migration scripts that are idempotent — running the migration twice SHALL produce the same result as running it once.
4. WHEN the migration is applied, THE Platform SHALL create database views or foreign key references so that existing API endpoints (`/functions/v1/guards`, `/functions/v1/attendance`, `/functions/v1/assignments`) continue to return correct data. THE Platform SHALL allow these compatibility views to be created before the full data migration runs, so that API endpoints remain functional throughout the migration process.
5. THE Platform SHALL implement all new tables and columns as additive changes (no DROP TABLE, no DROP COLUMN, no destructive ALTER TABLE) in the migration scripts.
6. WHEN a new Workforce_Personnel record is created for the Guard category, THE Platform SHALL attempt to also create a corresponding record in the legacy `guards` table to maintain compatibility with existing Guard-specific screens until those screens are migrated. IF the legacy `guards` table record creation fails, THE Platform SHALL retain the `workforce_personnel` record, log the failure, and continue without rolling back the personnel creation.

---

### Requirement 13: Notification Workflows

**User Story:** As any platform user, I want to receive timely push notifications for events relevant to my role, so that I can act on time-sensitive information without polling the app manually.

#### Acceptance Criteria

1. THE Platform SHALL send push notifications to the assigned Supervisor when a new Level 1 Complaint is raised at their Site.
2. THE Platform SHALL send push notifications to the Site Manager and Operations_Manager when a Complaint is escalated to Level 2.
3. THE Platform SHALL send push notifications to the Admin and Super_Admin when a Complaint is escalated to Level 3 (Critical Issue).
4. THE Platform SHALL send a push notification to the Client_User of a Site when a Replacement is assigned for a vacancy at their Site.
5. THE Platform SHALL send a push notification to the Operations_Manager when a vacancy at a Site has not been filled within 2 hours.
6. THE Platform SHALL send push notifications using the existing Firebase Cloud Messaging (FCM) integration via the `fcm_token` field on the `users` table.
7. WHEN a push notification is sent, THE Platform SHALL create a record in the `notifications` table with the appropriate type, title, body, and recipient user_id.
8. IF an FCM token is invalid or expired, THEN THE Platform SHALL log the delivery failure and continue processing other notifications without throwing an unhandled exception.

---

### Requirement 14: Data Integrity and Audit

**User Story:** As a Super_Admin, I want all critical data changes to be auditable and all complaint timelines to be immutable, so that the system maintains a trustworthy record of all operations.

#### Acceptance Criteria

1. THE Platform SHALL apply `updated_at` auto-update triggers to all new tables: `workforce_personnel`, `workforce_categories`, `sites` (extended columns), `workforce_documents`, `workforce_attendance`, `complaints`, `replacements`, `client_users`.
2. THE Platform SHALL enforce an immutability constraint on the `complaint_comments` table by applying a Supabase RLS policy that denies UPDATE and DELETE operations for all roles including Admin.
3. THE Platform SHALL enforce an immutability constraint on the `complaint_escalations` table by applying a Supabase RLS policy that denies UPDATE and DELETE operations for all roles including Admin.
4. THE Platform SHALL enforce an immutability constraint on Employee_ID values by applying a database-level CHECK or trigger that prevents UPDATE of the `employee_id` column after initial INSERT.
5. WHEN any Workforce_Personnel record is soft-deleted (employment_status set to "terminated"), THE Platform SHALL retain the record and all associated documents, attendance, and payroll data.
6. THE Platform SHALL NOT perform hard deletes on `workforce_personnel`, `complaints`, `complaint_comments`, `complaint_escalations`, or `workforce_documents` records.
