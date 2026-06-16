// =============================================================================
// Workforce & Facility Management — TypeScript Interfaces & Types
// =============================================================================
// Task 4: All TypeScript interfaces and union types matching the DB schema.
// This file is the single source of truth for all workforce-related types
// used across services, screens, and components.
// =============================================================================

// ─── Union Types (Task 4.1) ─────────────────────────────────────────────────

export type EmploymentStatus = 'active' | 'inactive' | 'terminated';

export type ShiftType = 'day' | 'night' | 'rotational';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'operations_manager'
  | 'supervisor'
  | 'client_user'
  | 'workforce_personnel'
  | 'inspector'
  // Legacy roles (preserved for backward compatibility)
  | 'manager'
  | 'recruiter'
  | 'guard';

export type ComplaintStatus =
  | 'open'
  | 'in_progress'
  | 'escalated_l2'
  | 'escalated_l3'
  | 'resolved'
  | 'closed';

export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReplacementStatus = 'requested' | 'assigned' | 'completed' | 'cancelled';

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'corrected' | 'present_late';

export type ClientRole = 'society_president' | 'society_secretary' | 'facility_manager';

export type NotificationType =
  | 'complaint_raised'
  | 'complaint_escalated_l2'
  | 'complaint_escalated_l3'
  | 'replacement_assigned'
  | 'vacancy_escalated'
  | 'shift_reminder'
  | 'attendance_alert'
  | 'salary_generated'
  | 'general';

// ─── Core Interfaces (Task 4.2) ─────────────────────────────────────────────

export interface WorkforceCategory {
  id: string;
  name: string;
  prefix_code: string;
  attendance_required: boolean;
  is_system_defined: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkforcePersonnel {
  id: string;
  user_id?: string;
  category_id: string;
  employee_id: string;
  name: string;
  phone?: string;
  photo_url?: string;
  base_salary: number;
  joining_date?: string;
  shift_type?: ShiftType;
  employment_status: EmploymentStatus;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  aadhaar_number?: string;
  pan_number?: string;
  address?: string;
  gender?: string;
  date_of_birth?: string;
  police_verification?: boolean;
  height?: string;
  weight?: string;
  education?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (populated by service queries)
  category?: WorkforceCategory;
  today_attendance?: WorkforceAttendance | null;
  rating_summary?: RatingSummary;
}

export interface SiteAssignment {
  id: string;
  site_id: string;
  personnel_id: string;
  shift_type?: ShiftType;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  personnel?: WorkforcePersonnel;
  site?: Site;
}

export interface Site {
  id: string;
  site_name: string;
  client_name?: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  is_active: boolean;
  // Extended columns (Req 2.1)
  site_type?: string;
  society_president_name?: string;
  society_president_phone?: string;
  society_secretary_name?: string;
  society_secretary_phone?: string;
  site_manager_id?: string;
  assigned_supervisor_id?: string;
  site_supervisor_name?: string;
  site_supervisor_phone?: string;
  workforce_strength?: number | null;
  // Shift timings
  day_shift_start?: string;
  day_shift_end?: string;
  night_shift_start?: string;
  night_shift_end?: string;
  // Attendance thresholds (Migration 030)
  late_threshold_minutes?: number;   // default 120 (2 hours)
  min_hours_present?: number;        // default 7
  min_hours_half_day?: number;       // default 4
}

// ─── Dashboard & Metrics (Task 4.3) ─────────────────────────────────────────

export interface SiteDashboardMetrics {
  total_workforce: number;
  security_count: number;
  housekeeping_count: number;
  supervisor_count: number;
  present_today: number;
  absent_today: number;
  vacant_positions: number | 'not_configured';
}

export interface Complaint {
  id: string;
  site_id: string;
  raised_by: string;
  assigned_to?: string | null;
  category: string;
  description: string;
  status: ComplaintStatus;
  current_level: 1 | 2 | 3;
  severity?: ComplaintSeverity | null;
  incident_reported: boolean;
  sla_deadline?: string | null;
  resolved_at?: string | null;
  time_to_resolve_seconds?: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  site?: Site;
  raised_by_user?: { name: string; role: UserRole };
}

export interface ComplaintComment {
  id: string;
  complaint_id: string;
  author_id: string;
  comment_text: string;
  action_taken?: string;
  created_at: string;
  // Joined fields
  author?: { name: string; role: UserRole };
}

export interface ComplaintEscalation {
  id: string;
  complaint_id: string;
  from_level: number;
  to_level: number;
  escalated_at: string;
  escalated_by: string; // 'system' or user_id
  reason?: string;
}

// ─── Client, Replacement, Attendance, Documents, Ratings (Task 4.4) ─────────

export interface ClientUser {
  id: string;
  user_id: string;
  site_id: string;
  client_role: ClientRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Replacement {
  id: string;
  absent_personnel_id: string;
  replacement_personnel_id?: string | null;
  site_id: string;
  shift_date: string;
  status: ReplacementStatus;
  requested_by: string;
  assigned_by?: string | null;
  client_notified: boolean;
  vacancy_start: string;
  vacancy_end?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  absent_personnel?: WorkforcePersonnel;
  replacement_personnel?: WorkforcePersonnel;
  site?: Site;
}

export interface WorkforceAttendance {
  id: string;
  personnel_id: string;
  site_id: string;
  attendance_date: string;
  shift_type?: ShiftType;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_selfie?: string | null;
  check_out_selfie?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  hours_worked?: number | null;
  status: AttendanceStatus;
  is_manual_entry: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  personnel?: WorkforcePersonnel;
}

export interface WorkforceDocument {
  id: string;
  personnel_id: string;
  document_type: string;
  file_url: string;
  uploaded_by: string;
  verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkforceRating {
  id: string;
  personnel_id: string;
  site_id: string;
  rated_by: string;
  rating: number;
  review_text?: string;
  appreciation: boolean;
  review_date: string;
  created_at: string;
}

export interface VisitorLog {
  id: string;
  site_id: string;
  guard_id: string;
  visitor_name: string;
  visitor_phone: string;
  flat_number?: string | null;
  purpose: string;
  check_in_time: string;
  check_out_time?: string | null;
  status: 'active' | 'completed';
  created_at: string;
}

// ─── Aggregates & Analytics (Task 4.5) ──────────────────────────────────────

export interface RatingSummary {
  average_rating: number;
  open_complaint_count: number;
  appreciation_count: number;
  last_review_date?: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
export interface DocumentChecklistItem {
  document_type: string;
  display_name: string;
  status: 'verified' | 'pending' | 'missing';
  document?: WorkforceDocument;
}

export interface SupervisorDashboard {
  assigned_sites: Site[];
  total_personnel: number;
  open_complaint_count: number;
  today_attendance_summary: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  vacancy_count: number;
}
