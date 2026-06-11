# Pan India Security — Remaining Admin Screens

This document outlines the frontend screens that are yet to be developed for the Admin flow in the mobile application.

---

## 1. Sites Module

* **ADM-005: Site List**
  * **Brief:** Browse all client sites with a search bar, status filter chips (Active/Inactive), and site cards showing guard counts and contact info.
* **ADM-006: Site Detail**
  * **Brief:** View detailed site information including the geofence map, shift timings, assigned guards (with options to add/remove), today's attendance, and recent inspection highlights.
* **ADM-007: Add / Edit Site Form**
  * **Brief:** Form to add/edit sites featuring an interactive map picker with geofence radius slider (50m–500m), shift timing pickers, and client contact details.
* **ADM-008: Assign Guard to Site**
  * **Brief:** Full screen or bottom sheet to search and assign available guards to a specific site and shift (Day/Night) with a confirmation prompt.

---

## 2. Payroll Module

* **ADM-009: Payroll List**
  * **Brief:** Monthly payroll overview with a horizontal month selector, status filters (Draft, Generated, Approved, Paid), total salary summary card, and a list of guard salary statuses.
* **ADM-010: Salary Slip Detail**
  * **Brief:** Detailed earnings and deductions breakdown (base, overtime, penalties, uniform dues) with actions to approve, download PDF, or open an adjustments editor.

---

## 3. Recruitment Module

* **ADM-012: Candidate List (Recruitment)**
  * **Brief:** Recruitment pipeline dashboard with horizontal status stats (New, Contacted, Selected, Hired), search/filters, and candidate profiles.
* **ADM-013: Candidate Detail**
  * **Brief:** Comprehensive candidate details showing profile info, an interactive status stepper, notes, and a "Convert to Guard" action for hired candidates.
* **ADM-014: Add Candidate Form**
  * **Brief:** Input form for new recruits including contact details, education, experience metrics, physical attributes (height/weight), and interviewer notes.

---

## 4. More Menu & Settings

* **ADM-011: More Menu**
  * **Brief:** Central hub for secondary features containing the admin profile card and links to Payroll, Recruitment, Uniforms, Inspections, Reports, Notifications, Settings, and Logout.
* **ADM-017: Admin Settings**
  * **Brief:** Configure language, notification toggles, theme, and system constants (default geofence radius, late penalties, overtime multipliers), along with a logout option.

---

## 5. Uniforms, Inspections & Reports

* **ADM-015: Uniform Management**
  * **Brief:** Manage uniform inventory and dues. Displays stats for issued items, pending amounts, and lists guard uniform logs with a payment record sheet.
* **ADM-016: Notification Center**
  * **Brief:** Browse system alerts, shift reminders, attendance alerts, and recruitment notifications with swipe-to-delete actions.
* **ADM-018: Inspection List (Admin View)**
  * **Brief:** Date and site filtered view of inspection reports submitted by field inspectors, highlighting reported incidents.
* **ADM-019: Inspection Detail (Admin View)**
  * **Brief:** Deep dive into specific inspector reports showing present/absent guards, submitted site photos, inspector remarks, and incident gravity indicators.
* **ADM-020: Reports Screen**
  * **Brief:** Grid menu to generate and export professional CSV/PDF reports (Attendance, Payroll, Inspection, Recruitment, and Guard Directory) with custom date filters.
