-- ============================================================
-- PAN INDIA SECURITY — Complete Seed Data
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

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
ON CONFLICT (phone) DO NOTHING;

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

-- VERIFY
SELECT 'users' as tbl, COUNT(*) FROM users
UNION ALL SELECT 'guards', COUNT(*) FROM guards
UNION ALL SELECT 'sites', COUNT(*) FROM sites
UNION ALL SELECT 'assignments', COUNT(*) FROM guard_site_assignments
UNION ALL SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL SELECT 'uniforms', COUNT(*) FROM uniforms
ORDER BY tbl;
