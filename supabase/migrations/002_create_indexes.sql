-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 002: Performance Indexes
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Guards
CREATE INDEX IF NOT EXISTS idx_guards_user_id ON guards(user_id);
CREATE INDEX IF NOT EXISTS idx_guards_employment_status ON guards(employment_status);
CREATE INDEX IF NOT EXISTS idx_guards_shift_type ON guards(shift_type);

-- Guard Documents
CREATE INDEX IF NOT EXISTS idx_guard_docs_guard_id ON guard_documents(guard_id);
CREATE INDEX IF NOT EXISTS idx_guard_docs_type ON guard_documents(document_type);

-- Sites
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active);
CREATE INDEX IF NOT EXISTS idx_sites_client ON sites(client_name);

-- Guard-Site Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_guard ON guard_site_assignments(guard_id, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_site ON guard_site_assignments(site_id, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON guard_site_assignments(is_active);

-- Attendance (most queried table — needs best indexes)
CREATE INDEX IF NOT EXISTS idx_attendance_guard_date ON attendance(guard_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_site_date ON attendance(site_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_guard_month ON attendance(guard_id, attendance_date) WHERE check_in_time IS NOT NULL;

-- Payroll
CREATE INDEX IF NOT EXISTS idx_payroll_guard_month ON payroll(guard_id, month);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);

-- Uniforms
CREATE INDEX IF NOT EXISTS idx_uniforms_guard ON uniforms(guard_id);
CREATE INDEX IF NOT EXISTS idx_uniforms_payment ON uniforms(payment_status);

-- Candidates
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_recruiter ON candidates(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidates(preferred_location);

-- Inspections
CREATE INDEX IF NOT EXISTS idx_inspections_site ON inspections(site_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_incident ON inspections(incident_reported) WHERE incident_reported = true;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
