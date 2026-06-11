-- ============================================================
-- PAN INDIA SECURITY — FULL CLIENT DEMO SEED DATA
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run: cleans existing seed data first
--
-- This populates EVERY feature with realistic data:
--   ✅ 12 Users (admin, managers, recruiter, guards)
--   ✅ 8 Guard profiles with full details
--   ✅ 5 Sites with GPS coordinates
--   ✅ 7 Active guard-site assignments
--   ✅ 30 days of attendance (May 2026)
--   ✅ 3 months of payroll (Mar, Apr, May 2026)
--   ✅ 15+ uniform items across guards
--   ✅ 10 recruitment candidates at various stages
--   ✅ 8+ site inspections across dates
--   ✅ 20+ notifications for all roles
-- ============================================================

-- =====================
-- CLEANUP (reverse dependency order)
-- =====================
DELETE FROM notifications WHERE user_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);
DELETE FROM inspections WHERE inspector_id IN ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002') OR site_id::text LIKE 'f0000000%';
DELETE FROM payroll WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM attendance WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM uniforms WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM candidates WHERE recruiter_id = 'c0000000-0000-0000-0000-000000000001' OR converted_guard_id::text LIKE 'e0000000%' OR phone IN ('9200000001','9200000002','9200000003','9200000004','9200000005','9200000006','9200000007','9200000008','9200000009','9200000010');
DELETE FROM guard_documents WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM guard_site_assignments WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM guards WHERE id::text LIKE 'e0000000%';
DELETE FROM sites WHERE id::text LIKE 'f0000000%';
DELETE FROM users WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000008'
);

-- =====================
-- 1. USERS (12 users)
-- =====================
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

-- =====================
-- 2. GUARD PROFILES (8 guards — full details)
-- =====================
INSERT INTO guards (id, user_id, aadhaar_number, pan_number, base_salary, shift_type, employment_status, joining_date, address, height, weight, education, police_verification, emergency_contact_name, emergency_contact_phone, bank_account_number, bank_ifsc, bank_name) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '234567890123', 'ABCPY1234A', 12000, 'day',   'active',   '2025-01-15', 'Kankarbagh, Patna',       170, 65, '10th Pass',  true,  'Sunita Devi',  '9111111101', '12345678901234', 'SBIN0001234', 'State Bank of India'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '345678901234', 'BCDQZ5678B', 13000, 'night',  'active',   '2025-02-10', 'Boring Road, Patna',      175, 72, '12th Pass',  true,  'Geeta Devi',   '9111111102', '23456789012345', 'SBIN0002345', 'State Bank of India'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', '456789012345', NULL,         12000, 'day',   'active',   '2025-03-20', 'Danapur, Patna',          168, 60, '10th Pass',  false, 'Ramesh Kumar',  '9111111103', '34567890123456', 'PUNB0001234', 'Punjab National Bank'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', '567890123456', 'DEFRS9012D', 14000, 'night',  'active',   '2025-04-05', 'Patliputra, Patna',       180, 78, 'Graduate',   true,  'Sita Kumari',   '9111111104', '45678901234567', 'HDFC0001234', 'HDFC Bank'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', '678901234567', NULL,         12000, 'day',   'active',   '2025-05-12', 'Rajendra Nagar, Patna',   165, 62, '8th Pass',   false, 'Lakshmi Devi',  '9111111105', '56789012345678', 'SBIN0003456', 'State Bank of India'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', '789012345678', 'FGHTU3456F', 13000, 'night',  'active',   '2025-06-18', 'Bailey Road, Patna',      172, 68, '10th Pass',  true,  'Parvati Devi',  '9111111106', '67890123456789', 'ICIC0001234', 'ICICI Bank'),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', '890123456789', 'GHIVW7890G', 12000, 'day',   'active',   '2025-07-22', 'Ashok Rajpath, Patna',    170, 65, '12th Pass',  true,  'Meena Kumari',  '9111111107', '78901234567890', 'SBIN0004567', 'State Bank of India'),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', '901234567890', NULL,         11000, 'day',   'inactive', '2025-08-10', 'Gardanibagh, Patna',      167, 61, '8th Pass',   false, 'Rani Devi',     '9111111108', NULL,              NULL,          NULL)
ON CONFLICT DO NOTHING;

-- =====================
-- 3. SITES (5 Patna locations with real GPS)
-- =====================
INSERT INTO sites (id, site_name, client_name, address, latitude, longitude, geofence_radius, contact_person, contact_phone, is_active) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Patna Main Office',       'ABC Corp',              'Fraser Road, Patna',            25.61200000, 85.15800000, 100, 'Amit Jha',      '9876543210', true),
  ('f0000000-0000-0000-0000-000000000002', 'Boring Road Complex',     'XYZ Industries',        'Boring Road, Patna',            25.60700000, 85.12300000, 150, 'Rajan Gupta',   '9876543211', true),
  ('f0000000-0000-0000-0000-000000000003', 'Kankarbagh Mall',         'MegaMart Retail',       'Kankarbagh Main Road, Patna',   25.59400000, 85.17100000, 100, 'Suresh Dubey',  '9876543212', true),
  ('f0000000-0000-0000-0000-000000000004', 'Patliputra Society',      'Residential Society',   'Patliputra Colony, Patna',      25.62800000, 85.10500000, 200, 'Manoj Tiwari',  '9876543213', true),
  ('f0000000-0000-0000-0000-000000000005', 'Exhibition Road Tower',   'InfoTech Solutions',    'Exhibition Road, Patna',        25.61500000, 85.14200000, 100, 'Deepak Sinha',  '9876543214', true)
ON CONFLICT DO NOTHING;

-- =====================
-- 4. ASSIGNMENTS (7 active guards → sites)
-- =====================
INSERT INTO guard_site_assignments (guard_id, site_id, shift_type, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day',   true),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'night', true),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'day',   true),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'night', true),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000003', 'day',   true),
  ('e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000003', 'night', true),
  ('e0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000004', 'day',   true)
ON CONFLICT DO NOTHING;

-- =====================
-- 5. ATTENDANCE — 28 days (May 1–28, 2026) for ALL 7 active guards
-- Realistic patterns: present/late/absent, check-in/out times, GPS, hours
-- Sundays (May 3, 10, 17, 24) are off-days (no records)
-- =====================

-- Helper: We insert attendance using generate_series for bulk realistic data.
-- Guard e001 → Site f001, day shift
-- Guard e002 → Site f001, night shift
-- Guard e003 → Site f002, day shift
-- Guard e004 → Site f002, night shift
-- Guard e005 → Site f003, day shift
-- Guard e006 → Site f003, night shift
-- Guard e007 → Site f004, day shift

-- ── GUARD 1: Ravi Yadav — Day Shift at Patna Main Office (very regular, 2 absences, 1 late) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'day',
  d::date,
  -- Check-in between 7:50 AM and 8:15 AM IST
  (d + INTERVAL '7 hours 50 minutes' + (random() * INTERVAL '25 minutes'))::timestamptz,
  -- Check-out between 7:55 PM and 8:10 PM IST
  (d + INTERVAL '19 hours 55 minutes' + (random() * INTERVAL '15 minutes'))::timestamptz,
  25.61200 + (random()-0.5)*0.0005,  -- near site GPS
  85.15800 + (random()-0.5)*0.0005,
  25.61200 + (random()-0.5)*0.0005,
  85.15800 + (random()-0.5)*0.0005,
  (random()*50)::int,  -- distance < 100m geofence
  (random()*60)::int,
  CASE WHEN EXTRACT(DOW FROM d) IN (0) THEN 0 ELSE 11.5 + round((random()*1)::numeric, 1) END,
  CASE
    WHEN d = '2026-05-06'::date THEN 'absent'
    WHEN d = '2026-05-20'::date THEN 'absent'
    WHEN d = '2026-05-13'::date THEN 'late'
    ELSE 'present'
  END,
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0  -- skip Sundays
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

-- Fix: absent days should have NULL check-in/out
UPDATE attendance SET check_in_time = NULL, check_out_time = NULL, hours_worked = 0,
  check_in_latitude = NULL, check_in_longitude = NULL, check_out_latitude = NULL, check_out_longitude = NULL
WHERE guard_id = 'e0000000-0000-0000-0000-000000000001' AND status = 'absent';

-- ── GUARD 2: Sanjay Paswan — Night Shift at Patna Main Office (mostly present, 1 late) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'night',
  d::date,
  (d + INTERVAL '19 hours 55 minutes' + (random() * INTERVAL '20 minutes'))::timestamptz,
  (d + INTERVAL '32 hours' + (random() * INTERVAL '15 minutes'))::timestamptz,
  25.61200 + (random()-0.5)*0.0004,
  85.15800 + (random()-0.5)*0.0004,
  25.61200 + (random()-0.5)*0.0004,
  85.15800 + (random()-0.5)*0.0004,
  (random()*40)::int,
  (random()*50)::int,
  11.5 + round((random()*0.8)::numeric, 1),
  CASE
    WHEN d = '2026-05-09'::date THEN 'absent'
    WHEN d = '2026-05-15'::date THEN 'late'
    ELSE 'present'
  END,
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

UPDATE attendance SET check_in_time = NULL, check_out_time = NULL, hours_worked = 0,
  check_in_latitude = NULL, check_in_longitude = NULL, check_out_latitude = NULL, check_out_longitude = NULL
WHERE guard_id = 'e0000000-0000-0000-0000-000000000002' AND status = 'absent';

-- ── GUARD 3: Vikash Kumar — Day Shift at Boring Road Complex (3 absences, 2 lates) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000002',
  'day',
  d::date,
  (d + INTERVAL '7 hours 55 minutes' + (random() * INTERVAL '30 minutes'))::timestamptz,
  (d + INTERVAL '19 hours 50 minutes' + (random() * INTERVAL '20 minutes'))::timestamptz,
  25.60700 + (random()-0.5)*0.0005,
  85.12300 + (random()-0.5)*0.0005,
  25.60700 + (random()-0.5)*0.0005,
  85.12300 + (random()-0.5)*0.0005,
  (random()*60)::int,
  (random()*55)::int,
  11.0 + round((random()*1.2)::numeric, 1),
  CASE
    WHEN d IN ('2026-05-05'::date, '2026-05-14'::date, '2026-05-22'::date) THEN 'absent'
    WHEN d IN ('2026-05-08'::date, '2026-05-19'::date) THEN 'late'
    ELSE 'present'
  END,
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

UPDATE attendance SET check_in_time = NULL, check_out_time = NULL, hours_worked = 0,
  check_in_latitude = NULL, check_in_longitude = NULL, check_out_latitude = NULL, check_out_longitude = NULL
WHERE guard_id = 'e0000000-0000-0000-0000-000000000003' AND status = 'absent';

-- ── GUARD 4: Manoj Thakur — Night Shift at Boring Road Complex (perfect attendance) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000002',
  'night',
  d::date,
  (d + INTERVAL '19 hours 50 minutes' + (random() * INTERVAL '15 minutes'))::timestamptz,
  (d + INTERVAL '32 hours 5 minutes' + (random() * INTERVAL '10 minutes'))::timestamptz,
  25.60700 + (random()-0.5)*0.0004,
  85.12300 + (random()-0.5)*0.0004,
  25.60700 + (random()-0.5)*0.0004,
  85.12300 + (random()-0.5)*0.0004,
  (random()*30)::int,
  (random()*35)::int,
  12.0 + round((random()*0.5)::numeric, 1),
  'present',
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

-- ── GUARD 5: Deepak Singh — Day Shift at Kankarbagh Mall (4 absences, attendance issues) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000005',
  'f0000000-0000-0000-0000-000000000003',
  'day',
  d::date,
  (d + INTERVAL '7 hours 45 minutes' + (random() * INTERVAL '40 minutes'))::timestamptz,
  (d + INTERVAL '19 hours 45 minutes' + (random() * INTERVAL '25 minutes'))::timestamptz,
  25.59400 + (random()-0.5)*0.0005,
  85.17100 + (random()-0.5)*0.0005,
  25.59400 + (random()-0.5)*0.0005,
  85.17100 + (random()-0.5)*0.0005,
  (random()*50)::int,
  (random()*60)::int,
  11.0 + round((random()*1)::numeric, 1),
  CASE
    WHEN d IN ('2026-05-02'::date, '2026-05-09'::date, '2026-05-16'::date, '2026-05-23'::date) THEN 'absent'
    WHEN d IN ('2026-05-07'::date, '2026-05-12'::date, '2026-05-21'::date) THEN 'late'
    WHEN d = '2026-05-26'::date THEN 'half_day'
    ELSE 'present'
  END,
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

UPDATE attendance SET check_in_time = NULL, check_out_time = NULL, hours_worked = 0,
  check_in_latitude = NULL, check_in_longitude = NULL, check_out_latitude = NULL, check_out_longitude = NULL
WHERE guard_id = 'e0000000-0000-0000-0000-000000000005' AND status = 'absent';

-- half_day: set checkout early
UPDATE attendance SET
  check_out_time = check_in_time + INTERVAL '5 hours',
  hours_worked = 5.0
WHERE guard_id = 'e0000000-0000-0000-0000-000000000005' AND status = 'half_day';

-- ── GUARD 6: Amit Raj — Night Shift at Kankarbagh Mall (mostly present, 1 absence) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000006',
  'f0000000-0000-0000-0000-000000000003',
  'night',
  d::date,
  (d + INTERVAL '19 hours 50 minutes' + (random() * INTERVAL '20 minutes'))::timestamptz,
  (d + INTERVAL '32 hours' + (random() * INTERVAL '15 minutes'))::timestamptz,
  25.59400 + (random()-0.5)*0.0004,
  85.17100 + (random()-0.5)*0.0004,
  25.59400 + (random()-0.5)*0.0004,
  85.17100 + (random()-0.5)*0.0004,
  (random()*45)::int,
  (random()*50)::int,
  11.5 + round((random()*0.8)::numeric, 1),
  CASE
    WHEN d = '2026-05-18'::date THEN 'absent'
    WHEN d = '2026-05-11'::date THEN 'late'
    ELSE 'present'
  END,
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

UPDATE attendance SET check_in_time = NULL, check_out_time = NULL, hours_worked = 0,
  check_in_latitude = NULL, check_in_longitude = NULL, check_out_latitude = NULL, check_out_longitude = NULL
WHERE guard_id = 'e0000000-0000-0000-0000-000000000006' AND status = 'absent';

-- ── GUARD 7: Rohit Verma — Day Shift at Patliputra Society (good record, 1 late) ──
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, check_in_distance, check_out_distance, hours_worked, status, is_manual_entry)
SELECT
  'e0000000-0000-0000-0000-000000000007',
  'f0000000-0000-0000-0000-000000000004',
  'day',
  d::date,
  (d + INTERVAL '7 hours 48 minutes' + (random() * INTERVAL '20 minutes'))::timestamptz,
  (d + INTERVAL '19 hours 50 minutes' + (random() * INTERVAL '15 minutes'))::timestamptz,
  25.62800 + (random()-0.5)*0.0006,
  85.10500 + (random()-0.5)*0.0006,
  25.62800 + (random()-0.5)*0.0006,
  85.10500 + (random()-0.5)*0.0006,
  (random()*55)::int,
  (random()*60)::int,
  11.8 + round((random()*0.5)::numeric, 1),
  CASE
    WHEN d = '2026-05-15'::date THEN 'absent'
    WHEN d = '2026-05-21'::date THEN 'late'
    ELSE 'present'
  END,
  false
FROM generate_series('2026-05-01'::date, '2026-05-28'::date, '1 day') AS d
WHERE EXTRACT(DOW FROM d) != 0
ON CONFLICT (guard_id, attendance_date, shift_type) DO NOTHING;

UPDATE attendance SET check_in_time = NULL, check_out_time = NULL, hours_worked = 0,
  check_in_latitude = NULL, check_in_longitude = NULL, check_out_latitude = NULL, check_out_longitude = NULL
WHERE guard_id = 'e0000000-0000-0000-0000-000000000007' AND status = 'absent';


-- =====================
-- 6. PAYROLL — 3 months (March, April, May 2026) for all 7 active guards
-- March = paid, April = paid, May = mix of draft/generated/approved
-- =====================

-- ── MARCH 2026 (all paid) ──
INSERT INTO payroll (guard_id, month, total_working_days, days_present, days_late, days_absent, base_salary, pro_rated_salary, overtime_hours, overtime_amount, penalty_amount, uniform_deduction, advance_deduction, other_deduction, final_salary, status, approved_by, approved_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', '2026-03', 27, 25, 0, 2, 12000, 11111, 4, 600,  0,   0,   0, 0, 11711, 'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02'),
  ('e0000000-0000-0000-0000-000000000002', '2026-03', 27, 27, 0, 0, 13000, 13000, 6, 900,  0,   0,   0, 0, 13900, 'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02'),
  ('e0000000-0000-0000-0000-000000000003', '2026-03', 27, 23, 1, 3, 12000, 10222, 0, 0,    400, 300, 0, 0, 9522,  'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02'),
  ('e0000000-0000-0000-0000-000000000004', '2026-03', 27, 27, 0, 0, 14000, 14000, 8, 1400, 0,   0,   0, 0, 15400, 'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02'),
  ('e0000000-0000-0000-0000-000000000005', '2026-03', 27, 20, 2, 5, 12000, 8889,  0, 0,    800, 300, 0, 0, 7789,  'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02'),
  ('e0000000-0000-0000-0000-000000000006', '2026-03', 27, 26, 0, 1, 13000, 12519, 3, 450,  0,   0,   0, 0, 12969, 'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02'),
  ('e0000000-0000-0000-0000-000000000007', '2026-03', 27, 26, 1, 0, 12000, 11556, 2, 300,  100, 0,   0, 0, 11756, 'paid', 'a0000000-0000-0000-0000-000000000001', '2026-04-02')
ON CONFLICT (guard_id, month) DO NOTHING;

-- ── APRIL 2026 (paid/approved mix) ──
INSERT INTO payroll (guard_id, month, total_working_days, days_present, days_late, days_absent, base_salary, pro_rated_salary, overtime_hours, overtime_amount, penalty_amount, uniform_deduction, advance_deduction, other_deduction, final_salary, status, approved_by, approved_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', '2026-04', 26, 24, 1, 1, 12000, 11077, 3, 450,  100, 0,    0,   0, 11427, 'paid',     'a0000000-0000-0000-0000-000000000001', '2026-05-03'),
  ('e0000000-0000-0000-0000-000000000002', '2026-04', 26, 25, 0, 1, 13000, 12500, 5, 750,  0,   0,    500, 0, 12750, 'paid',     'a0000000-0000-0000-0000-000000000001', '2026-05-03'),
  ('e0000000-0000-0000-0000-000000000003', '2026-04', 26, 22, 2, 2, 12000, 10154, 0, 0,    300, 300,  0,   0, 9554,  'paid',     'a0000000-0000-0000-0000-000000000001', '2026-05-03'),
  ('e0000000-0000-0000-0000-000000000004', '2026-04', 26, 26, 0, 0, 14000, 14000, 10,1750, 0,   0,    0,   0, 15750, 'paid',     'a0000000-0000-0000-0000-000000000001', '2026-05-03'),
  ('e0000000-0000-0000-0000-000000000005', '2026-04', 26, 19, 3, 4, 12000, 8769,  0, 0,    900, 300,  0,   0, 7569,  'approved', 'a0000000-0000-0000-0000-000000000001', '2026-05-03'),
  ('e0000000-0000-0000-0000-000000000006', '2026-04', 26, 25, 1, 0, 13000, 12500, 4, 600,  100, 0,    0,   0, 13000, 'paid',     'a0000000-0000-0000-0000-000000000001', '2026-05-03'),
  ('e0000000-0000-0000-0000-000000000007', '2026-04', 26, 25, 0, 1, 12000, 11538, 2, 300,  0,   0,    0,   0, 11838, 'paid',     'a0000000-0000-0000-0000-000000000001', '2026-05-03')
ON CONFLICT (guard_id, month) DO NOTHING;

-- ── MAY 2026 (current — mix: draft, generated, approved) ──
INSERT INTO payroll (guard_id, month, total_working_days, days_present, days_late, days_absent, base_salary, pro_rated_salary, overtime_hours, overtime_amount, penalty_amount, uniform_deduction, advance_deduction, other_deduction, other_deduction_reason, final_salary, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', '2026-05', 24, 22, 1, 2, 12000, 11000, 3.5, 525, 100, 300, 0,   0,    NULL,                          11125, 'generated'),
  ('e0000000-0000-0000-0000-000000000002', '2026-05', 24, 23, 1, 1, 13000, 12458, 5,   750, 0,   0,   500, 0,    NULL,                          12708, 'approved'),
  ('e0000000-0000-0000-0000-000000000003', '2026-05', 24, 19, 2, 3, 12000, 9500,  0,   0,   500, 300, 0,   0,    NULL,                          8700,  'draft'),
  ('e0000000-0000-0000-0000-000000000004', '2026-05', 24, 24, 0, 0, 14000, 14000, 8,   1400,0,   0,   0,   0,    NULL,                          15400, 'approved'),
  ('e0000000-0000-0000-0000-000000000005', '2026-05', 24, 16, 3, 5, 12000, 8000,  0,   0,   1200,300, 0,   500,  'Uniform damage penalty',      6000,  'generated'),
  ('e0000000-0000-0000-0000-000000000006', '2026-05', 24, 23, 1, 1, 13000, 12458, 4,   600, 100, 0,   0,   0,    NULL,                          12958, 'generated'),
  ('e0000000-0000-0000-0000-000000000007', '2026-05', 24, 22, 1, 1, 12000, 11000, 2,   300, 100, 0,   0,   0,    NULL,                          11200, 'draft')
ON CONFLICT (guard_id, month) DO NOTHING;


-- =====================
-- 7. UNIFORMS — 18 items across 6 guards (various payment states)
-- =====================
INSERT INTO uniforms (guard_id, item_name, item_cost, issued_date, payment_status, amount_paid, deducted_in_month, remarks) VALUES
  -- Ravi Yadav
  ('e0000000-0000-0000-0000-000000000001', 'uniform_set', 2500, '2025-01-20', 'deducted', 2500, '2025-02',  'Full set issued on joining'),
  ('e0000000-0000-0000-0000-000000000001', 'shoes',        1200, '2025-01-20', 'paid',     1200, NULL,       'Black leather boots'),
  ('e0000000-0000-0000-0000-000000000001', 'torch',        450,  '2025-03-10', 'paid',     450,  NULL,       'Rechargeable LED torch'),
  -- Sanjay Paswan
  ('e0000000-0000-0000-0000-000000000002', 'uniform_set', 2500, '2025-02-15', 'paid',     2500, NULL,       'Full set issued'),
  ('e0000000-0000-0000-0000-000000000002', 'shoes',        1200, '2025-02-15', 'paid',     1200, NULL,       'Black leather boots'),
  ('e0000000-0000-0000-0000-000000000002', 'baton',        800,  '2025-04-01', 'paid',     800,  NULL,       'Standard security baton'),
  -- Vikash Kumar
  ('e0000000-0000-0000-0000-000000000003', 'uniform_set', 2500, '2025-03-25', 'partial',  1200, NULL,       'EMI: ₹300/month deduction pending'),
  ('e0000000-0000-0000-0000-000000000003', 'cap',          350,  '2025-03-25', 'paid',     350,  NULL,       'Security cap'),
  -- Manoj Thakur
  ('e0000000-0000-0000-0000-000000000004', 'uniform_set', 2500, '2025-04-10', 'paid',     2500, NULL,       'Full set — premium quality'),
  ('e0000000-0000-0000-0000-000000000004', 'shoes',        1500, '2025-04-10', 'paid',     1500, NULL,       'Heavy-duty patrol boots'),
  ('e0000000-0000-0000-0000-000000000004', 'id_card',      200,  '2025-04-10', 'paid',     200,  NULL,       'Photo ID badge'),
  ('e0000000-0000-0000-0000-000000000004', 'whistle',      150,  '2025-04-10', 'paid',     150,  NULL,       'Metal whistle'),
  -- Deepak Singh
  ('e0000000-0000-0000-0000-000000000005', 'uniform_set', 2500, '2025-05-15', 'pending',  0,    NULL,       'Not yet collected payment'),
  ('e0000000-0000-0000-0000-000000000005', 'belt',         600,  '2025-05-15', 'pending',  0,    NULL,       'Leather belt'),
  -- Amit Raj
  ('e0000000-0000-0000-0000-000000000006', 'uniform_set', 2500, '2025-06-20', 'partial',  1500, NULL,       '₹1000 remaining — next month deduction'),
  ('e0000000-0000-0000-0000-000000000006', 'shoes',        1200, '2025-06-20', 'paid',     1200, NULL,       'Issued with uniform'),
  -- Rohit Verma
  ('e0000000-0000-0000-0000-000000000007', 'uniform_set', 2500, '2025-07-25', 'deducted', 2500, '2025-08',  'Deducted from August salary'),
  ('e0000000-0000-0000-0000-000000000007', 'torch',        450,  '2025-09-01', 'pending',  0,    NULL,       'Replacement torch issued')
ON CONFLICT DO NOTHING;


-- =====================
-- 8. CANDIDATES — 10 candidates at various pipeline stages
-- =====================
INSERT INTO candidates (name, phone, height, weight, education, experience_years, preferred_location, salary_expectation, availability_date, status, recruiter_id, notes) VALUES
  ('Rakesh Kumar',    '9200000001', 172, 68, '10th Pass',  2, 'Patna',       13000, '2026-06-01', 'new',                 'c0000000-0000-0000-0000-000000000001', 'Walk-in candidate, referred by Ravi'),
  ('Santosh Yadav',   '9200000002', 175, 72, '12th Pass',  4, 'Patna',       15000, '2026-06-10', 'contacted',           'c0000000-0000-0000-0000-000000000001', 'Ex-army personnel. Excellent candidate. Called twice.'),
  ('Pintu Kumar',     '9200000003', 168, 60, '8th Pass',   0, 'Danapur',     10000, '2026-06-15', 'interested',          'c0000000-0000-0000-0000-000000000001', 'First job, eager to work. Lives near Kankarbagh site.'),
  ('Govind Singh',    '9200000004', 178, 75, 'Graduate',   5, 'Patna',       16000, '2026-06-05', 'interview_scheduled', 'c0000000-0000-0000-0000-000000000001', 'Interview scheduled for Monday 10 AM. Strong references.'),
  ('Rajesh Thakur',   '9200000005', 170, 66, '10th Pass',  1, 'Boring Road', 12000, '2026-06-01', 'selected',            'c0000000-0000-0000-0000-000000000001', 'Selected — awaiting document verification.'),
  ('Bablu Sharma',    '9200000006', 173, 70, '12th Pass',  3, 'Patna',       14000, '2026-06-20', 'interested',          'c0000000-0000-0000-0000-000000000001', 'Previously worked at Reliance Security for 2 years.'),
  ('Mohan Yadav',     '9200000007', 176, 73, 'Graduate',   6, 'Patliputra',  17000, '2026-07-01', 'interview_scheduled', 'c0000000-0000-0000-0000-000000000001', 'B.A. degree holder. Police verification already done.'),
  ('Dinesh Paswan',   '9200000008', 165, 58, '8th Pass',   0, 'Danapur',     10000, NULL,         'rejected',            'c0000000-0000-0000-0000-000000000001', 'Below minimum height requirement (165cm). Rejected.'),
  ('Suraj Kumar',     '9200000009', 180, 80, '10th Pass',  2, 'Patna',       13000, '2026-06-01', 'hired',               'c0000000-0000-0000-0000-000000000001', 'Hired and converted to guard. Strong build, reliable.'),
  ('Vijay Thakur',    '9200000010', 171, 67, '10th Pass',  1, 'Exhibition Road', 12000, '2026-06-10', 'new',             'c0000000-0000-0000-0000-000000000001', 'Walked in today. Documents pending.')
ON CONFLICT DO NOTHING;


-- =====================
-- 9. INSPECTIONS — 8 detailed inspections across sites and dates
-- =====================
INSERT INTO inspections (site_id, inspector_id, inspection_date, remarks, guards_present, guards_absent, total_guards_expected, photos, latitude, longitude, incident_reported, incident_severity, incident_description) VALUES
  -- May 5: Patna Main Office — all clear
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   '2026-05-05 10:30:00+05:30',
   'All guards present in proper uniform. Logbook up to date. Main gate secured. CCTV cameras operational.',
   ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[],
   ARRAY[]::uuid[], 2, ARRAY[]::text[],
   25.6121, 85.1581, false, NULL, NULL),

  -- May 10: Boring Road — incident
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   '2026-05-10 14:00:00+05:30',
   'One guard absent without notice. Gate 2 lock needs replacement. Perimeter fence has a gap near parking lot.',
   ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[],
   ARRAY['e0000000-0000-0000-0000-000000000004']::uuid[], 2, ARRAY[]::text[],
   25.6072, 85.1232, true, 'medium', 'Guard absent without prior notice. Gate 2 padlock found broken — replacement ordered. Fence gap of approx 2 feet found near south parking.'),

  -- May 12: Kankarbagh Mall — night check
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
   '2026-05-12 22:15:00+05:30',
   'Night shift inspection. All guards alert and in position. Emergency exits clear. Fire extinguishers checked.',
   ARRAY['e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000006']::uuid[],
   ARRAY[]::uuid[], 2, ARRAY[]::text[],
   25.5941, 85.1712, false, NULL, NULL),

  -- May 15: Patliputra Society — critical incident (guard sleeping)
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002',
   '2026-05-15 01:30:00+05:30',
   'Guard found sleeping on duty at main gate during surprise night inspection. Written warning issued. Society chairman informed.',
   ARRAY['e0000000-0000-0000-0000-000000000007']::uuid[],
   ARRAY[]::uuid[], 1, ARRAY[]::text[],
   25.6282, 85.1052, true, 'high', 'Guard Rohit Verma found sleeping during night shift at main gate. Written warning #1 issued. Incident logged. Society chairman Mr. Tiwari notified.'),

  -- May 18: Patna Main Office — routine follow-up
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   '2026-05-18 09:45:00+05:30',
   'Follow-up inspection. Both guards present and attentive. Visitor log maintained properly. Parking area well-managed.',
   ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[],
   ARRAY[]::uuid[], 2, ARRAY[]::text[],
   25.6119, 85.1579, false, NULL, NULL),

  -- May 22: Exhibition Road Tower — new site audit
  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   '2026-05-22 11:00:00+05:30',
   'First audit of Exhibition Road Tower. Site requires additional guard for night shift. Client requested 24/7 CCTV monitoring integration.',
   ARRAY[]::uuid[],
   ARRAY[]::uuid[], 0, ARRAY[]::text[],
   25.6151, 85.1421, false, NULL, NULL),

  -- May 25: Kankarbagh Mall — low severity incident
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
   '2026-05-25 16:30:00+05:30',
   'Day shift inspection. One guard arrived late. Minor altercation between vendor and customer resolved by security. Guards handled it professionally.',
   ARRAY['e0000000-0000-0000-0000-000000000005']::uuid[],
   ARRAY['e0000000-0000-0000-0000-000000000006']::uuid[], 2, ARRAY[]::text[],
   25.5942, 85.1709, true, 'low', 'Minor verbal altercation between a vendor and customer at food court entrance. Guard Deepak Singh de-escalated the situation. No injuries. Vendor warned.'),

  -- May 27: Boring Road — all secure
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   '2026-05-27 10:00:00+05:30',
   'Routine inspection. All guards present. Gate 2 lock replaced (ref: May 10 report). Perimeter fence repaired. Overall security posture excellent.',
   ARRAY['e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004']::uuid[],
   ARRAY[]::uuid[], 2, ARRAY[]::text[],
   25.6071, 85.1231, false, NULL, NULL)
ON CONFLICT DO NOTHING;


-- =====================
-- 10. NOTIFICATIONS — Rich set for Admin, Managers, Guards
-- =====================
INSERT INTO notifications (user_id, title, body, type, is_read, created_at) VALUES
  -- ─── Admin notifications ───
  ('a0000000-0000-0000-0000-000000000001', 'Payroll Generated — May 2026',
   'Monthly payroll for May 2026 has been generated for 7 guards. Total payout: ₹78,091. Review and approve pending slips.',
   'salary_generated', false, NOW() - INTERVAL '2 hours'),

  ('a0000000-0000-0000-0000-000000000001', '⚠️ Attendance Alert',
   'Guard Deepak Singh has been absent 5 times this month at Kankarbagh Mall. Please review and take action.',
   'attendance_alert', false, NOW() - INTERVAL '5 hours'),

  ('a0000000-0000-0000-0000-000000000001', 'Inspection Report: Critical Incident',
   'Manager Anil Sharma reported a critical incident at Patliputra Society — Guard Rohit Verma found sleeping on duty. Review the inspection report.',
   'inspection_reminder', false, NOW() - INTERVAL '3 days'),

  ('a0000000-0000-0000-0000-000000000001', 'New Candidate Added',
   'Recruiter Priya Singh added Vijay Thakur to the recruitment pipeline. Status: New. Preferred location: Exhibition Road.',
   'recruitment_update', true, NOW() - INTERVAL '1 day'),

  ('a0000000-0000-0000-0000-000000000001', 'Payroll Approved — April 2026',
   'April 2026 payroll has been fully approved and processed. 6 of 7 guards marked as paid.',
   'salary_generated', true, NOW() - INTERVAL '25 days'),

  ('a0000000-0000-0000-0000-000000000001', 'Site Inspection Complete',
   'Sunil Verma completed a routine inspection at Patna Main Office. All guards present, no incidents reported.',
   'inspection_reminder', true, NOW() - INTERVAL '10 days'),

  ('a0000000-0000-0000-0000-000000000001', 'Uniform Payment Pending',
   '3 guards have pending uniform payments totalling ₹6,050. Consider scheduling payroll deductions.',
   'general', false, NOW() - INTERVAL '6 hours'),

  -- ─── Manager (Sunil Verma) notifications ───
  ('b0000000-0000-0000-0000-000000000001', 'Inspection Reminder',
   'You have a scheduled inspection at Boring Road Complex tomorrow. Last inspection reported fence damage — please verify repairs.',
   'inspection_reminder', false, NOW() - INTERVAL '12 hours'),

  ('b0000000-0000-0000-0000-000000000001', 'Guard Absence Notification',
   'Guard Vikash Kumar reported absent today at Boring Road Complex. This is his 3rd absence this month.',
   'attendance_alert', false, NOW() - INTERVAL '4 hours'),

  ('b0000000-0000-0000-0000-000000000001', 'Attendance Summary — Week 21',
   'Weekly attendance summary: 47 of 49 possible check-ins recorded across your assigned sites. 2 absences noted.',
   'general', true, NOW() - INTERVAL '2 days'),

  -- ─── Manager (Anil Sharma) notifications ───
  ('b0000000-0000-0000-0000-000000000002', 'Inspection Complete',
   'Your inspection at Kankarbagh Mall has been logged successfully. Minor vendor altercation incident recorded.',
   'inspection_reminder', true, NOW() - INTERVAL '3 days'),

  ('b0000000-0000-0000-0000-000000000002', 'New Guard Assignment',
   'Guard Rohit Verma has been reassigned to Patliputra Society following the incident review. Please monitor closely.',
   'general', false, NOW() - INTERVAL '1 day'),

  -- ─── Recruiter (Priya Singh) notifications ───
  ('c0000000-0000-0000-0000-000000000001', 'Candidate Interview Tomorrow',
   'Govind Singh interview is scheduled for tomorrow at 10:00 AM at Patna Main Office. Strong candidate — ex-security professional.',
   'recruitment_update', false, NOW() - INTERVAL '8 hours'),

  ('c0000000-0000-0000-0000-000000000001', 'Candidate Hired',
   'Suraj Kumar has been successfully converted from candidate to active guard. All documents verified.',
   'recruitment_update', true, NOW() - INTERVAL '5 days'),

  -- ─── Guard (Ravi Yadav) notifications ───
  ('d0000000-0000-0000-0000-000000000001', 'Shift Reminder',
   'Your day shift at Patna Main Office starts at 8:00 AM tomorrow. Report on time.',
   'shift_reminder', false, NOW() - INTERVAL '10 hours'),

  ('d0000000-0000-0000-0000-000000000001', 'Salary Slip Available',
   'Your May 2026 salary slip has been generated. Net pay: ₹11,125. View details in the Salary section.',
   'salary_generated', false, NOW() - INTERVAL '3 hours'),

  ('d0000000-0000-0000-0000-000000000001', 'Attendance Confirmed',
   'Your check-in at Patna Main Office on May 27 has been verified. Status: Present. Duration: 12.1 hours.',
   'attendance_alert', true, NOW() - INTERVAL '1 day'),

  -- ─── Guard (Deepak Singh) notifications ───
  ('d0000000-0000-0000-0000-000000000005', 'Attendance Warning',
   'You have been marked absent 5 times this month. Further absences may result in salary deduction and disciplinary action.',
   'attendance_alert', false, NOW() - INTERVAL '2 hours'),

  ('d0000000-0000-0000-0000-000000000005', 'Uniform Payment Due',
   'Your uniform set payment of ₹2,500 is still pending. Please clear the dues or it will be deducted from your salary.',
   'general', false, NOW() - INTERVAL '4 days'),

  -- ─── Guard (Rohit Verma) notifications ───
  ('d0000000-0000-0000-0000-000000000007', 'Written Warning Issued',
   'A formal written warning has been issued for sleeping on duty at Patliputra Society on May 15. Please report to admin office.',
   'general', false, NOW() - INTERVAL '13 days'),

  ('d0000000-0000-0000-0000-000000000007', 'Shift Reminder',
   'Your day shift at Patliputra Society starts at 8:00 AM tomorrow. Please ensure punctuality.',
   'shift_reminder', false, NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;


-- =====================
-- 11. GUARD DOCUMENTS (sample records)
-- =====================
INSERT INTO guard_documents (guard_id, document_type, document_url, document_name) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'aadhaar',              'https://placeholder.co/aadhaar_ravi.pdf',      'Aadhaar Card - Ravi Yadav'),
  ('e0000000-0000-0000-0000-000000000001', 'pan',                  'https://placeholder.co/pan_ravi.pdf',          'PAN Card - Ravi Yadav'),
  ('e0000000-0000-0000-0000-000000000001', 'police_verification',  'https://placeholder.co/pv_ravi.pdf',           'Police Verification Certificate'),
  ('e0000000-0000-0000-0000-000000000002', 'aadhaar',              'https://placeholder.co/aadhaar_sanjay.pdf',    'Aadhaar Card - Sanjay Paswan'),
  ('e0000000-0000-0000-0000-000000000002', 'police_verification',  'https://placeholder.co/pv_sanjay.pdf',         'Police Verification Certificate'),
  ('e0000000-0000-0000-0000-000000000004', 'aadhaar',              'https://placeholder.co/aadhaar_manoj.pdf',     'Aadhaar Card - Manoj Thakur'),
  ('e0000000-0000-0000-0000-000000000004', 'pan',                  'https://placeholder.co/pan_manoj.pdf',         'PAN Card - Manoj Thakur'),
  ('e0000000-0000-0000-0000-000000000004', 'police_verification',  'https://placeholder.co/pv_manoj.pdf',          'Police Verification Certificate'),
  ('e0000000-0000-0000-0000-000000000004', 'address_proof',        'https://placeholder.co/address_manoj.pdf',     'Address Proof - Electricity Bill'),
  ('e0000000-0000-0000-0000-000000000007', 'aadhaar',              'https://placeholder.co/aadhaar_rohit.pdf',     'Aadhaar Card - Rohit Verma'),
  ('e0000000-0000-0000-0000-000000000007', 'police_verification',  'https://placeholder.co/pv_rohit.pdf',          'Police Verification Certificate')
ON CONFLICT DO NOTHING;


-- =====================
-- VERIFICATION — Print record counts
-- =====================
SELECT '✅ DEMO SEED COMPLETE' AS status;

SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'guards', COUNT(*) FROM guards
UNION ALL SELECT 'sites', COUNT(*) FROM sites
UNION ALL SELECT 'assignments', COUNT(*) FROM guard_site_assignments
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'payroll', COUNT(*) FROM payroll
UNION ALL SELECT 'uniforms', COUNT(*) FROM uniforms
UNION ALL SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL SELECT 'inspections', COUNT(*) FROM inspections
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'guard_documents', COUNT(*) FROM guard_documents
ORDER BY tbl;
