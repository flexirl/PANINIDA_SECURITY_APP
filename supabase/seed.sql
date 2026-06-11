-- ============================================================
-- PAN INDIA SECURITY — Complete Seed Data
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run: cleans existing seed data first
-- ============================================================

-- CLEANUP (delete in reverse dependency order)
DELETE FROM notifications WHERE user_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);

-- Delete complaint-related records
DELETE FROM complaint_escalations WHERE complaint_id IN (SELECT id FROM complaints WHERE site_id::text LIKE 'f0000000%');
DELETE FROM complaint_comments WHERE complaint_id IN (SELECT id FROM complaints WHERE site_id::text LIKE 'f0000000%') OR author_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);
DELETE FROM complaints WHERE site_id::text LIKE 'f0000000%' OR assigned_to IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);
DELETE FROM client_users WHERE site_id::text LIKE 'f0000000%' OR user_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);

DELETE FROM inspections WHERE inspector_id IN ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002') OR site_id::text LIKE 'f0000000%';

-- Delete replacements and ratings referencing sites or personnel
DELETE FROM replacements WHERE site_id::text LIKE 'f0000000%' OR absent_personnel_id::text LIKE 'e0000000%' OR replacement_personnel_id::text LIKE 'e0000000%';
DELETE FROM workforce_ratings WHERE site_id::text LIKE 'f0000000%' OR personnel_id::text LIKE 'e0000000%';

DELETE FROM payroll WHERE guard_id::text LIKE 'e0000000%' OR approved_by IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001'
);

DELETE FROM attendance WHERE guard_id::text LIKE 'e0000000%' OR manual_entry_by IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001'
);
DELETE FROM workforce_attendance WHERE site_id::text LIKE 'f0000000%' OR personnel_id::text LIKE 'e0000000%';

DELETE FROM uniforms WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM candidates WHERE recruiter_id = 'c0000000-0000-0000-0000-000000000001' OR converted_guard_id::text LIKE 'e0000000%' OR phone IN ('9200000001','9200000002','9200000003','9200000004','9200000005');
DELETE FROM workforce_documents WHERE personnel_id::text LIKE 'e0000000%';

DELETE FROM guard_site_assignments WHERE guard_id::text LIKE 'e0000000%' OR site_id::text LIKE 'f0000000%';
DELETE FROM site_assignments WHERE personnel_id::text LIKE 'e0000000%' OR site_id::text LIKE 'f0000000%';

-- Null out supervisor reference in sites before deleting personnel
UPDATE sites SET assigned_supervisor_id = NULL WHERE id::text LIKE 'f0000000%';

DELETE FROM sites WHERE id::text LIKE 'f0000000%';

DELETE FROM guards WHERE id::text LIKE 'e0000000%' OR user_id IN (
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);

DELETE FROM workforce_personnel WHERE id::text LIKE 'e0000000%' OR user_id IN (
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);

DELETE FROM users WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);

-- 0. WORKFORCE CATEGORIES (required for PersonnelCategoryContext)
-- These system-defined categories power the category filter throughout the app.
-- Must be seeded before any workforce_personnel records are created.
INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined)
VALUES
  ('Guard',               'PIS', true,  true),
  ('Gunman',              'GM',  false, true),
  ('Rifleman',            'RM',  false, true),
  ('PSO',                 'PSO', false, true),
  ('Bouncer',             'BNC', false, true),
  ('Supervisor',          'SUP', true,  true),
  ('Security Officer',    'SO',  true,  true),
  ('Housekeeping',        'HK',  true,  true),
  ('Sweeper',             'SWP', true,  true),
  ('Gardener',            'GRD', true,  true),
  ('Electrician',         'ELE', true,  true),
  ('Plumber',             'PLM', true,  true),
  ('Carpenter',           'CRP', true,  true),
  ('Lift Operator',       'LFT', true,  true),
  ('Pump Operator',       'PMP', true,  true),
  ('Technician',          'TCH', true,  true),
  ('Receptionist',        'REC', true,  true),
  ('Office Assistant',    'OA',  true,  true),
  ('Data Entry Operator', 'DEO', true,  true)
ON CONFLICT (name) DO NOTHING;

-- 1. USERS
INSERT INTO users (id, name, phone, role, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Rajesh Kumar (Admin)', '9999999999', 'admin', true),
  ('b0000000-0000-0000-0000-000000000001', 'Sunil Verma', '9888888881', 'manager', true),
  ('b0000000-0000-0000-0000-000000000002', 'Anil Sharma', '9888888882', 'manager', true),
  ('c0000000-0000-0000-0000-000000000001', 'Priya Singh', '9888888883', 'recruiter', true),
  ('d0000000-0000-0000-0000-000000000001', 'Ravi Yadav', '9777777771', 'guard', true),
  ('d0000000-0000-0000-0000-000000000002', 'Sanjay Paswan', '9777777772', 'guard', true),
  ('d0000000-0000-0000-0000-000000000003', 'Vikash Kumar', '9777777773', 'guard', true),
  ('d0000000-0000-0000-0000-000000000004', 'Manoj Thakur', '9777777774', 'guard', true),
  ('d0000000-0000-0000-0000-000000000005', 'Deepak Singh', '9777777775', 'guard', true),
  ('d0000000-0000-0000-0000-000000000006', 'Amit Raj', '9777777776', 'guard', true),
  ('d0000000-0000-0000-0000-000000000007', 'Rohit Verma', '9777777777', 'guard', true),
  ('d0000000-0000-0000-0000-000000000008', 'Pappu Kumar', '9777777778', 'guard', true)
ON CONFLICT DO NOTHING;

-- 2. GUARD PROFILES
INSERT INTO guards (id, user_id, base_salary, shift_type, employment_status, joining_date, address, height, weight, education, police_verification) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 12000, 'day', 'active', '2025-01-15', 'Kankarbagh, Patna', 170, 65, '10th Pass', true),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 13000, 'night', 'active', '2025-02-10', 'Boring Road, Patna', 175, 72, '12th Pass', true),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 12000, 'day', 'active', '2025-03-20', 'Danapur, Patna', 168, 60, '10th Pass', false),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 14000, 'night', 'active', '2025-04-05', 'Patliputra, Patna', 180, 78, 'Graduate', true),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 12000, 'day', 'active', '2025-05-12', 'Rajendra Nagar, Patna', 165, 62, '8th Pass', false),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 13000, 'night', 'active', '2025-06-18', 'Bailey Road, Patna', 172, 68, '10th Pass', true),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 12000, 'day', 'active', '2025-07-22', 'Ashok Rajpath, Patna', 170, 65, '12th Pass', true),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 11000, 'day', 'inactive', '2025-08-10', 'Gardanibagh, Patna', 167, 61, '8th Pass', false)
ON CONFLICT DO NOTHING;

-- 3. SITES (real Patna GPS coordinates)
INSERT INTO sites (id, site_name, client_name, address, latitude, longitude, geofence_radius, contact_person, contact_phone, is_active) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Patna Main Office', 'ABC Corp', 'Fraser Road, Patna', 25.61200000, 85.15800000, 100, 'Amit Jha', '9876543210', true),
  ('f0000000-0000-0000-0000-000000000002', 'Boring Road Complex', 'XYZ Industries', 'Boring Road, Patna', 25.60700000, 85.12300000, 150, 'Rajan Gupta', '9876543211', true),
  ('f0000000-0000-0000-0000-000000000003', 'Kankarbagh Mall', 'MegaMart Retail', 'Kankarbagh Main Road, Patna', 25.59400000, 85.17100000, 100, 'Suresh Dubey', '9876543212', true),
  ('f0000000-0000-0000-0000-000000000004', 'Patliputra Society', 'Residential Society', 'Patliputra Colony, Patna', 25.62800000, 85.10500000, 200, 'Manoj Tiwari', '9876543213', true),
  ('f0000000-0000-0000-0000-000000000005', 'Exhibition Road Tower', 'InfoTech Solutions', 'Exhibition Road, Patna', 25.61500000, 85.14200000, 100, 'Deepak Sinha', '9876543214', true)
ON CONFLICT DO NOTHING;

-- 4. ASSIGNMENTS
INSERT INTO guard_site_assignments (guard_id, site_id, shift_type, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day', true),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'night', true),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'day', true),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'night', true),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000003', 'day', true),
  ('e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000003', 'night', true),
  ('e0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000004', 'day', true)
ON CONFLICT DO NOTHING;

-- 5. CANDIDATES
INSERT INTO candidates (name, phone, height, weight, education, experience_years, preferred_location, salary_expectation, status, recruiter_id, notes) VALUES
  ('Rakesh Kumar', '9200000001', 172, 68, '10th Pass', 2, 'Patna', 13000, 'new', 'c0000000-0000-0000-0000-000000000001', 'Walk-in candidate'),
  ('Santosh Yadav', '9200000002', 175, 72, '12th Pass', 4, 'Patna', 15000, 'contacted', 'c0000000-0000-0000-0000-000000000001', 'Ex-army, good candidate'),
  ('Pintu Kumar', '9200000003', 168, 60, '8th Pass', 0, 'Danapur', 10000, 'interested', 'c0000000-0000-0000-0000-000000000001', 'First job'),
  ('Govind Singh', '9200000004', 178, 75, 'Graduate', 5, 'Patna', 16000, 'interview_scheduled', 'c0000000-0000-0000-0000-000000000001', 'Interview Monday'),
  ('Rajesh Thakur', '9200000005', 170, 66, '10th Pass', 1, 'Boring Road', 12000, 'selected', 'c0000000-0000-0000-0000-000000000001', 'Joining next week')
ON CONFLICT DO NOTHING;

-- 6. UNIFORMS
INSERT INTO uniforms (guard_id, item_name, item_cost, payment_status, amount_paid) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'uniform_set', 2500, 'pending', 0),
  ('e0000000-0000-0000-0000-000000000001', 'shoes', 1200, 'partial', 600),
  ('e0000000-0000-0000-0000-000000000002', 'uniform_set', 2500, 'paid', 2500),
  ('e0000000-0000-0000-0000-000000000003', 'uniform_set', 2500, 'pending', 0),
  ('e0000000-0000-0000-0000-000000000005', 'uniform_set', 2500, 'pending', 0)
ON CONFLICT DO NOTHING;

-- 7. ATTENDANCE (today + recent days)
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, status, is_manual_entry) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day', CURRENT_DATE, NOW() - INTERVAL '6 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'night', CURRENT_DATE, NOW() - INTERVAL '2 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'day', CURRENT_DATE, NOW() - INTERVAL '5 hours', 'late', false),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'night', CURRENT_DATE - 1, NOW() - INTERVAL '30 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000003', 'day', CURRENT_DATE, NULL, 'absent', true)
ON CONFLICT DO NOTHING;

-- 8. PAYROLL (current month)
INSERT INTO payroll (guard_id, month, total_working_days, days_present, base_salary, pro_rated_salary, overtime_amount, penalty_amount, uniform_deduction, advance_deduction, other_deduction, final_salary, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 26, 12000, 10400, 800, 200, 300, 0, 0, 10700, 'generated'),
  ('e0000000-0000-0000-0000-000000000002', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 28, 13000, 12133, 1200, 0, 0, 500, 0, 12833, 'approved'),
  ('e0000000-0000-0000-0000-000000000003', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 22, 12000, 8800, 0, 500, 300, 0, 0, 8000, 'draft'),
  ('e0000000-0000-0000-0000-000000000004', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 30, 14000, 14000, 2000, 0, 0, 0, 0, 16000, 'paid'),
  ('e0000000-0000-0000-0000-000000000005', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 18, 12000, 7200, 0, 1000, 300, 0, 0, 5900, 'generated')
ON CONFLICT DO NOTHING;

-- 9. INSPECTIONS
INSERT INTO inspections (site_id, inspector_id, remarks, guards_present, guards_absent, photos, latitude, longitude, incident_reported, incident_severity, incident_description) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'All guards present in proper uniform. Logbook up to date.', ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[], ARRAY[]::uuid[], ARRAY[]::text[], 25.612, 85.158, false, NULL, NULL),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'One guard absent without notice. Gate 2 lock needs replacement.', ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[], ARRAY['e0000000-0000-0000-0000-000000000004']::uuid[], ARRAY[]::text[], 25.607, 85.123, true, 'medium', 'Guard absent without prior notice. Gate 2 padlock found broken.'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Night shift inspection. All guards alert and in position.', ARRAY['e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000006']::uuid[], ARRAY[]::uuid[], ARRAY[]::text[], 25.594, 85.171, false, NULL, NULL),
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Society perimeter clear. Guard found sleeping on duty.', ARRAY['e0000000-0000-0000-0000-000000000007']::uuid[], ARRAY[]::uuid[], ARRAY[]::text[], 25.628, 85.105, true, 'high', 'Guard Rohit Verma found sleeping during night shift at main gate. Written warning issued.')
ON CONFLICT DO NOTHING;

-- 10. NOTIFICATIONS
INSERT INTO notifications (user_id, title, body, type, is_read) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Payroll Generated', 'May 2026 payroll has been generated for 5 guards. Review and approve.', 'salary_generated', false),
  ('a0000000-0000-0000-0000-000000000001', 'Attendance Alert', 'Guard Deepak Singh marked absent at Kankarbagh Mall today.', 'attendance_alert', false),
  ('a0000000-0000-0000-0000-000000000001', 'Inspection Completed', 'Sunil Verma completed inspection at Patna Main Office. No incidents.', 'inspection_reminder', true),
  ('a0000000-0000-0000-0000-000000000001', 'New Candidate', 'Rakesh Kumar added to recruitment pipeline by Priya Singh.', 'recruitment_update', true),
  ('d0000000-0000-0000-0000-000000000001', 'Shift Reminder', 'Your day shift at Patna Main Office starts at 6:00 AM tomorrow.', 'shift_reminder', false)
ON CONFLICT DO NOTHING;

-- VERIFY
SELECT 'workforce_categories' as tbl, COUNT(*) FROM workforce_categories
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'guards', COUNT(*) FROM guards
UNION ALL SELECT 'sites', COUNT(*) FROM sites
UNION ALL SELECT 'assignments', COUNT(*) FROM guard_site_assignments
UNION ALL SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL SELECT 'uniforms', COUNT(*) FROM uniforms
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'payroll', COUNT(*) FROM payroll
UNION ALL SELECT 'inspections', COUNT(*) FROM inspections
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
ORDER BY tbl;
