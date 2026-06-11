-- ═══════════════════════════════════════════════════════════════
-- PAN INDIA SECURITY — Complete Mock Data Seed
-- ═══════════════════════════════════════════════════════════════
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run: cleans all mock data first
--
-- Category Structure (4 main filter groups):
--   1. Guards     → Guard (PIS)
--   2. Gunman     → Gunman (GM), PSO, Rifleman (RM)
--   3. Bouncers   → Bouncer (BNC)
--   4. Helpers    → Housekeeping (HK), Sweeper (SWP), Gardener (GRD),
--                   Electrician (ELE), Plumber (PLM), Carpenter (CRP),
--                   Lift Operator (LFT), Pump Operator (PMP), etc.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 0. CLEANUP — Delete in reverse dependency order
-- ═══════════════════════════════════════════════════════════════

-- Remove FK refs from sites first
UPDATE sites SET assigned_supervisor_id = NULL, site_manager_id = NULL
  WHERE id::text LIKE 'f0000000%';

DELETE FROM notifications WHERE user_id::text LIKE 'a0000000%' OR user_id::text LIKE 'b0000000%'
  OR user_id::text LIKE 'c0000000%' OR user_id::text LIKE 'd0000000%';
DELETE FROM inspections WHERE site_id::text LIKE 'f0000000%';
DELETE FROM candidates WHERE recruiter_id::text LIKE 'c0000000%'
  OR id::text LIKE 'a4000000%';
DELETE FROM uniforms WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM payroll WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM complaint_escalations WHERE complaint_id::text LIKE 'a1000000%';
DELETE FROM complaint_comments WHERE complaint_id::text LIKE 'a1000000%';
DELETE FROM complaints WHERE id::text LIKE 'a1000000%';
DELETE FROM replacements WHERE id::text LIKE 'a2000000%'
  OR absent_personnel_id::text LIKE 'e0000000%';
DELETE FROM workforce_ratings WHERE personnel_id::text LIKE 'e0000000%';
DELETE FROM workforce_documents WHERE personnel_id::text LIKE 'e0000000%';
DELETE FROM workforce_attendance WHERE personnel_id::text LIKE 'e0000000%';
DELETE FROM attendance WHERE guard_id::text LIKE 'e0000000%';
DELETE FROM site_assignments WHERE personnel_id::text LIKE 'e0000000%'
  OR site_id::text LIKE 'f0000000%';
DELETE FROM guard_site_assignments WHERE guard_id::text LIKE 'e0000000%'
  OR site_id::text LIKE 'f0000000%';
DELETE FROM client_users WHERE id::text LIKE 'a3000000%';
DELETE FROM workforce_personnel WHERE id::text LIKE 'e0000000%';
DELETE FROM guards WHERE id::text LIKE 'e0000000%';
DELETE FROM sites WHERE id::text LIKE 'f0000000%';
DELETE FROM users WHERE id::text LIKE 'a0000000%' OR id::text LIKE 'b0000000%'
  OR id::text LIKE 'c0000000%' OR id::text LIKE 'd0000000%';

-- ═══════════════════════════════════════════════════════════════
-- 1. WORKFORCE CATEGORIES (19 system categories)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined) VALUES
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

-- ═══════════════════════════════════════════════════════════════
-- 2. USERS (24 users across all roles)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO users (id, name, phone, role, is_active) VALUES
  -- Admin
  ('a0000000-0000-0000-0000-000000000001', 'Rajesh Kumar',        '9999999999', 'admin',               true),
  -- Operations Managers
  ('a0000000-0000-0000-0000-000000000002', 'Vikram Sharma',       '9999999998', 'operations_manager',  true),
  ('a0000000-0000-0000-0000-000000000003', 'Pradeep Mishra',      '9999999997', 'operations_manager',  true),
  -- Supervisors
  ('b0000000-0000-0000-0000-000000000001', 'Sunil Verma',         '9888888881', 'supervisor',          true),
  ('b0000000-0000-0000-0000-000000000002', 'Anil Sharma',         '9888888882', 'supervisor',          true),
  -- Client Users
  ('c0000000-0000-0000-0000-000000000001', 'Amit Jha',            '9888888883', 'client_user',         true),
  ('c0000000-0000-0000-0000-000000000002', 'Manoj Tiwari',        '9888888884', 'client_user',         true),
  -- Recruiter
  ('c0000000-0000-0000-0000-000000000003', 'Priya Singh',         '9888888885', 'recruiter',           true),
  -- Guard personnel (10)
  ('d0000000-0000-0000-0000-000000000001', 'Ravi Yadav',          '9777777771', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000002', 'Sanjay Paswan',       '9777777772', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000003', 'Vikash Kumar',        '9777777773', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000004', 'Manoj Thakur',        '9777777774', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000005', 'Deepak Singh',        '9777777775', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000006', 'Amit Raj',            '9777777776', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000007', 'Rohit Verma',         '9777777777', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000008', 'Pappu Kumar',         '9777777778', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000009', 'Rajendra Prasad',     '9777777779', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000010', 'Suresh Mahto',        '9777777780', 'workforce_personnel', true),
  -- Gunman/PSO personnel (3 with app access)
  ('d0000000-0000-0000-0000-000000000011', 'Ajay Pratap Singh',   '9666666661', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000012', 'Ram Bahadur Thapa',   '9666666662', 'workforce_personnel', true),
  ('d0000000-0000-0000-0000-000000000013', 'Bikram Thapa',        '9666666663', 'workforce_personnel', true),
  -- Bouncer with app access
  ('d0000000-0000-0000-0000-000000000016', 'Karan Singh Rathore', '9555555551', 'workforce_personnel', true),
  -- Housekeeping with app access
  ('d0000000-0000-0000-0000-000000000019', 'Lakshmi Devi',        '9444444441', 'workforce_personnel', true),
  -- Electrician with app access
  ('d0000000-0000-0000-0000-000000000023', 'Shankar Kumar',       '9444444445', 'workforce_personnel', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. SITES (5 Patna locations)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO sites (id, site_name, client_name, address, latitude, longitude,
  geofence_radius, contact_person, contact_phone, is_active,
  site_type, society_president_name, society_president_phone,
  society_secretary_name, society_secretary_phone, workforce_strength) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Patna Main Office',       'ABC Corp',             'Fraser Road, Patna',            25.61200000, 85.15800000, 100, 'Manoj Tiwari',  '9888888884', true, 'corporate',   NULL,          NULL,          NULL,             NULL,          8),
  ('f0000000-0000-0000-0000-000000000002', 'Boring Road Complex',     'XYZ Industries',       'Boring Road, Patna',            25.60700000, 85.12300000, 150, 'Rajan Gupta',   '9876543211', true, 'commercial',  NULL,          NULL,          NULL,             NULL,          6),
  ('f0000000-0000-0000-0000-000000000003', 'Kankarbagh Mall',         'MegaMart Retail',      'Kankarbagh Main Road, Patna',   25.59400000, 85.17100000, 100, 'Suresh Dubey',  '9876543212', true, 'commercial',  NULL,          NULL,          NULL,             NULL,          7),
  ('f0000000-0000-0000-0000-000000000004', 'Patliputra Society',      'Patliputra RWA',       'Patliputra Colony, Patna',      25.62800000, 85.10500000, 200, 'Amit Jha',      '9888888883', true, 'residential', 'Amit Jha',    '9888888883',  'Rakesh Sinha',   '9876543299', 8),
  ('f0000000-0000-0000-0000-000000000005', 'Exhibition Road Tower',   'InfoTech Solutions',   'Exhibition Road, Patna',        25.61500000, 85.14200000, 100, 'Deepak Sinha',  '9876543214', true, 'corporate',   NULL,          NULL,          NULL,             NULL,          5)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. WORKFORCE PERSONNEL (28 across all categories)
-- ═══════════════════════════════════════════════════════════════

-- 4a. Guards (10)
INSERT INTO workforce_personnel (id, user_id, category_id, employee_id, name, phone, base_salary, joining_date, shift_type, employment_status, address, aadhaar_number, pan_number, bank_account_number, bank_ifsc, bank_name, emergency_contact_name, emergency_contact_phone) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9001', 'Ravi Yadav',      '9777777771', 12000, '2025-01-15', 'day',   'active',     'Kankarbagh, Patna',        '123456789012', 'ABCDE1234F', '12345678901234', 'SBIN0001234', 'State Bank of India', 'Shanti Devi', '9333333331'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9002', 'Sanjay Paswan',   '9777777772', 13000, '2025-02-10', 'night', 'active',     'Boring Road, Patna',       '234567890123', 'BCDEF2345G', '23456789012345', 'SBIN0001234', 'State Bank of India', 'Geeta Devi',  '9333333332'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9003', 'Vikash Kumar',    '9777777773', 12000, '2025-03-20', 'day',   'active',     'Danapur, Patna',           '345678901234', 'CDEFG3456H', '34567890123456', 'PUNB0012300', 'Punjab National Bank','Sunita Devi', '9333333333'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9004', 'Manoj Thakur',    '9777777774', 14000, '2025-04-05', 'night', 'active',     'Patliputra, Patna',        '456789012345', 'DEFGH4567I', '45678901234567', 'CNRB0001234', 'Canara Bank',         'Rani Devi',   '9333333334'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9005', 'Deepak Singh',    '9777777775', 12000, '2025-05-12', 'day',   'active',     'Rajendra Nagar, Patna',    '567890123456', 'EFGHI5678J', '56789012345678', 'SBIN0001234', 'State Bank of India', 'Maya Devi',   '9333333335'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9006', 'Amit Raj',        '9777777776', 13000, '2025-06-18', 'night', 'active',     'Bailey Road, Patna',       '678901234567', 'FGHIJ6789K', '67890123456789', 'BKID0001234', 'Bank of India',       'Poonam Devi', '9333333336'),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9007', 'Rohit Verma',     '9777777777', 12000, '2025-07-22', 'day',   'active',     'Ashok Rajpath, Patna',     '789012345678', 'GHIJK7890L', '78901234567890', 'SBIN0001234', 'State Bank of India', 'Rekha Devi',  '9333333337'),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9008', 'Pappu Kumar',     '9777777778', 11000, '2025-08-10', 'day',   'active',     'Gardanibagh, Patna',       '890123456789', 'HIJKL8901M', '89012345678901', 'PUNB0012300', 'Punjab National Bank','Anita Devi',  '9333333338'),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9009', 'Rajendra Prasad', '9777777779', 12000, '2025-09-01', 'day',   'inactive',   'Kadamkuan, Patna',         '901234567890', 'IJKLM9012N', '90123456789012', 'SBIN0001234', 'State Bank of India', 'Kamla Devi',  '9333333339'),
  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000010', (SELECT id FROM workforce_categories WHERE name='Guard'), 'PIS-9010', 'Suresh Mahto',    '9777777780', 12500, '2025-10-15', 'night', 'active',     'Phulwari Sharif, Patna',   '012345678901', 'JKLMN0123O', '01234567890123', 'CNRB0001234', 'Canara Bank',         'Meena Devi',  '9333333340')
ON CONFLICT DO NOTHING;

-- 4b. Gunman group (5: 2 Gunman, 1 PSO, 2 Rifleman)
INSERT INTO workforce_personnel (id, user_id, category_id, employee_id, name, phone, base_salary, joining_date, shift_type, employment_status, address) VALUES
  ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000011', (SELECT id FROM workforce_categories WHERE name='Gunman'),   'GM-9001',  'Ajay Pratap Singh',   '9666666661', 18000, '2025-01-10', 'day',   'active', 'Anisabad, Patna'),
  ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000012', (SELECT id FROM workforce_categories WHERE name='Gunman'),   'GM-9002',  'Ram Bahadur Thapa',   '9666666662', 17000, '2025-03-05', 'night', 'active', 'Bankipur, Patna'),
  ('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000013', (SELECT id FROM workforce_categories WHERE name='PSO'),      'PSO-9001', 'Bikram Thapa',        '9666666663', 25000, '2025-02-20', 'day',   'active', 'Digha, Patna'),
  ('e0000000-0000-0000-0000-000000000014', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Rifleman'), 'RM-9001',  'Surya Narayan Yadav', '9666666664', 20000, '2025-04-15', 'day',   'active', 'Mithapur, Patna'),
  ('e0000000-0000-0000-0000-000000000015', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Rifleman'), 'RM-9002',  'Dinesh Rana',         '9666666665', 19000, '2025-05-20', 'night', 'active', 'Sampatchak, Patna')
ON CONFLICT DO NOTHING;

-- 4c. Bouncers (3)
INSERT INTO workforce_personnel (id, user_id, category_id, employee_id, name, phone, base_salary, joining_date, shift_type, employment_status, address) VALUES
  ('e0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000016', (SELECT id FROM workforce_categories WHERE name='Bouncer'), 'BNC-9001', 'Karan Singh Rathore', '9555555551', 15000, '2025-02-01', 'night', 'active', 'Patna City, Patna'),
  ('e0000000-0000-0000-0000-000000000017', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Bouncer'), 'BNC-9002', 'Vinod Yadav',         '9555555552', 14000, '2025-04-10', 'night', 'active', 'Jakkanpur, Patna'),
  ('e0000000-0000-0000-0000-000000000018', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Bouncer'), 'BNC-9003', 'Suraj Thakur',        '9555555553', 13000, '2025-06-01', 'night', 'active', 'Khajekalan, Patna')
ON CONFLICT DO NOTHING;

-- 4d. Helpers/Housekeeping (8 across subcategories)
INSERT INTO workforce_personnel (id, user_id, category_id, employee_id, name, phone, base_salary, joining_date, shift_type, employment_status, address) VALUES
  ('e0000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000019', (SELECT id FROM workforce_categories WHERE name='Housekeeping'),   'HK-9001',  'Lakshmi Devi',   '9444444441', 9000,  '2025-01-20', 'day', 'active', 'Naubatpur, Patna'),
  ('e0000000-0000-0000-0000-000000000020', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Housekeeping'),   'HK-9002',  'Sunita Kumari',  '9444444442', 8500,  '2025-03-15', 'day', 'active', 'Maner, Patna'),
  ('e0000000-0000-0000-0000-000000000021', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Sweeper'),        'SWP-9001', 'Ramesh Manjhi',  '9444444443', 7500,  '2025-02-10', 'day', 'active', 'Alamganj, Patna'),
  ('e0000000-0000-0000-0000-000000000022', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Gardener'),       'GRD-9001', 'Gopal Das',      '9444444444', 8000,  '2025-05-01', 'day', 'active', 'Dighaghat, Patna'),
  ('e0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000023', (SELECT id FROM workforce_categories WHERE name='Electrician'),    'ELE-9001', 'Shankar Kumar',  '9444444445', 14000, '2025-01-05', 'day', 'active', 'Mahendru, Patna'),
  ('e0000000-0000-0000-0000-000000000024', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Plumber'),        'PLM-9001', 'Mukesh Yadav',   '9444444446', 11000, '2025-04-20', 'day', 'active', 'Saguna More, Patna'),
  ('e0000000-0000-0000-0000-000000000025', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Carpenter'),      'CRP-9001', 'Birju Sharma',   '9444444447', 11000, '2025-06-15', 'day', 'active', 'Yarpur, Patna'),
  ('e0000000-0000-0000-0000-000000000026', NULL,                                   (SELECT id FROM workforce_categories WHERE name='Lift Operator'),  'LFT-9001', 'Mohan Lal',      '9444444448', 10000, '2025-07-01', 'day', 'active', 'Agamkuan, Patna')
ON CONFLICT DO NOTHING;

-- 4e. Supervisors (2)
INSERT INTO workforce_personnel (id, user_id, category_id, employee_id, name, phone, base_salary, joining_date, shift_type, employment_status, address) VALUES
  ('e0000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000001', (SELECT id FROM workforce_categories WHERE name='Supervisor'), 'SUP-9001', 'Sunil Verma', '9888888881', 22000, '2024-06-01', 'day', 'active', 'Boring Road, Patna'),
  ('e0000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000002', (SELECT id FROM workforce_categories WHERE name='Supervisor'), 'SUP-9002', 'Anil Sharma', '9888888882', 20000, '2024-08-15', 'day', 'active', 'Kankarbagh, Patna')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. LEGACY GUARDS TABLE (10 guards for payroll/uniform compat)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO guards (id, user_id, base_salary, shift_type, employment_status, joining_date, address, height, weight, education, police_verification, aadhaar_number, pan_number, bank_account_number, bank_ifsc, bank_name, emergency_contact_name, emergency_contact_phone) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 12000, 'day',   'active',   '2025-01-15', 'Kankarbagh, Patna',      170, 65, '10th Pass',  true,  '123456789012', 'ABCDE1234F', '12345678901234', 'SBIN0001234', 'State Bank of India', 'Shanti Devi', '9333333331'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 13000, 'night', 'active',   '2025-02-10', 'Boring Road, Patna',     175, 72, '12th Pass',  true,  '234567890123', 'BCDEF2345G', '23456789012345', 'SBIN0001234', 'State Bank of India', 'Geeta Devi',  '9333333332'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 12000, 'day',   'active',   '2025-03-20', 'Danapur, Patna',         168, 60, '10th Pass',  false, '345678901234', 'CDEFG3456H', '34567890123456', 'PUNB0012300', 'Punjab National Bank','Sunita Devi', '9333333333'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 14000, 'night', 'active',   '2025-04-05', 'Patliputra, Patna',      180, 78, 'Graduate',   true,  '456789012345', 'DEFGH4567I', '45678901234567', 'CNRB0001234', 'Canara Bank',         'Rani Devi',   '9333333334'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 12000, 'day',   'active',   '2025-05-12', 'Rajendra Nagar, Patna',  165, 62, '8th Pass',   false, '567890123456', 'EFGHI5678J', '56789012345678', 'SBIN0001234', 'State Bank of India', 'Maya Devi',   '9333333335'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 13000, 'night', 'active',   '2025-06-18', 'Bailey Road, Patna',     172, 68, '10th Pass',  true,  '678901234567', 'FGHIJ6789K', '67890123456789', 'BKID0001234', 'Bank of India',       'Poonam Devi', '9333333336'),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 12000, 'day',   'active',   '2025-07-22', 'Ashok Rajpath, Patna',   170, 65, '12th Pass',  true,  '789012345678', 'GHIJK7890L', '78901234567890', 'SBIN0001234', 'State Bank of India', 'Rekha Devi',  '9333333337'),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 11000, 'day',   'active',   '2025-08-10', 'Gardanibagh, Patna',     167, 61, '8th Pass',   false, '890123456789', 'HIJKL8901M', '89012345678901', 'PUNB0012300', 'Punjab National Bank','Anita Devi',  '9333333338'),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', 12000, 'day',   'inactive', '2025-09-01', 'Kadamkuan, Patna',       169, 63, '10th Pass',  true,  '901234567890', 'IJKLM9012N', '90123456789012', 'SBIN0001234', 'State Bank of India', 'Kamla Devi',  '9333333339'),
  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000010', 12500, 'night', 'active',   '2025-10-15', 'Phulwari Sharif, Patna', 174, 70, 'Graduate',   true,  '012345678901', 'JKLMN0123O', '01234567890123', 'CNRB0001234', 'Canara Bank',         'Meena Devi',  '9333333340')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 6. CLIENT USERS (2 — society president + facility manager)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO client_users (id, user_id, site_id, client_role, is_active) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'society_president', true),
  ('a3000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'facility_manager',  true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 7. SITE ASSIGNMENTS (28 — one per personnel)
-- ═══════════════════════════════════════════════════════════════
-- Site F01 (Patna Main Office): 3 guards, 1 gunman, 1 housekeeping, 1 supervisor
-- Site F02 (Boring Road):       2 guards, 1 PSO, 1 bouncer, 1 sweeper
-- Site F03 (Kankarbagh Mall):   2 guards, 1 rifleman, 1 bouncer, 1 gardener, 1 electrician
-- Site F04 (Patliputra Society):2 guards, 1 rifleman, 1 housekeeping, 1 plumber, 1 carpenter, 1 supervisor
-- Site F05 (Exhibition Road):   1 guard, 1 gunman, 1 bouncer, 1 lift operator

INSERT INTO site_assignments (site_id, personnel_id, shift_type, start_date, is_active) VALUES
  -- F01 Patna Main Office
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'day',   '2025-01-15', true),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'night', '2025-02-10', true),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'day',   '2025-03-20', true),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000011', 'day',   '2025-01-10', true),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000019', 'day',   '2025-01-20', true),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000027', 'day',   '2024-06-01', true),
  -- F02 Boring Road Complex
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'night', '2025-04-05', true),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'day',   '2025-05-12', true),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000013', 'day',   '2025-02-20', true),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000016', 'night', '2025-02-01', true),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000021', 'day',   '2025-02-10', true),
  -- F03 Kankarbagh Mall
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000006', 'night', '2025-06-18', true),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'day',   '2025-07-22', true),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000014', 'day',   '2025-04-15', true),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000017', 'night', '2025-04-10', true),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000022', 'day',   '2025-05-01', true),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000023', 'day',   '2025-01-05', true),
  -- F04 Patliputra Society
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000008', 'day',   '2025-08-10', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'day',   '2025-09-01', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000015', 'night', '2025-05-20', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000020', 'day',   '2025-03-15', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000024', 'day',   '2025-04-20', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000025', 'day',   '2025-06-15', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000028', 'day',   '2024-08-15', true),
  -- F05 Exhibition Road Tower
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000010', 'night', '2025-10-15', true),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000012', 'night', '2025-03-05', true),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000018', 'night', '2025-06-01', true),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000026', 'day',   '2025-07-01', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 8. LEGACY GUARD-SITE ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO guard_site_assignments (guard_id, site_id, shift_type, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day',   true),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'night', true),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'day',   true),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'night', true),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', 'day',   true),
  ('e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000003', 'night', true),
  ('e0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000003', 'day',   true),
  ('e0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000004', 'day',   true),
  ('e0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000004', 'day',   true),
  ('e0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000005', 'night', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 9. WORKFORCE ATTENDANCE — Today (manual, precise statuses)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO workforce_attendance (personnel_id, site_id, attendance_date, shift_type, status, check_in_time, check_out_time, hours_worked, is_manual_entry) VALUES
  -- F01: 3 guards + gunman + housekeeping + supervisor
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'night', 'present',  NOW() - INTERVAL '2 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'day',   'late',     NOW() - INTERVAL '4 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000019', 'f0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '7 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000027', 'f0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  -- F02: 2 guards + PSO + bouncer + sweeper
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'night', 'present',  NOW() - INTERVAL '2 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'day',   'absent',   NULL,                       NULL, 0,     true),
  ('e0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000016', 'f0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'night', 'present',  NOW() - INTERVAL '2 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000021', 'f0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '7 hours', NULL, NULL,  false),
  -- F03: 2 guards + rifleman + bouncer + gardener + electrician
  ('e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'night', 'late',     NOW() - INTERVAL '1 hour',  NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000014', 'f0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '5 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000017', 'f0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'night', 'absent',   NULL,                       NULL, 0,     true),
  ('e0000000-0000-0000-0000-000000000022', 'f0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '7 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'day',   'half_day', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '1 hour', 4.0, false),
  -- F04: 2 guards + rifleman + housekeeping + plumber + carpenter + supervisor
  ('e0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000015', 'f0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'night', 'present',  NOW() - INTERVAL '2 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000020', 'f0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '7 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000024', 'f0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'day',   'absent',   NULL,                       NULL, 0,     true),
  ('e0000000-0000-0000-0000-000000000025', 'f0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000028', 'f0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false),
  -- F05: guard + gunman + bouncer + lift operator
  ('e0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000005', CURRENT_DATE, 'night', 'present',  NOW() - INTERVAL '2 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000005', CURRENT_DATE, 'night', 'present',  NOW() - INTERVAL '2 hours', NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000018', 'f0000000-0000-0000-0000-000000000005', CURRENT_DATE, 'night', 'late',     NOW() - INTERVAL '1 hour',  NULL, NULL,  false),
  ('e0000000-0000-0000-0000-000000000026', 'f0000000-0000-0000-0000-000000000005', CURRENT_DATE, 'day',   'present',  NOW() - INTERVAL '6 hours', NULL, NULL,  false)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 9b. ATTENDANCE HISTORY (past 6 days, generated deterministically)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO workforce_attendance (personnel_id, site_id, attendance_date, shift_type, status, check_in_time, hours_worked, is_manual_entry)
SELECT
  v.pid::uuid, v.sid::uuid, d::date, v.shift,
  CASE MOD(ABS(hashtext(v.pid || d::text)), 10)
    WHEN 0 THEN 'absent' WHEN 1 THEN 'late' WHEN 2 THEN 'half_day' ELSE 'present'
  END::varchar,
  CASE WHEN MOD(ABS(hashtext(v.pid || d::text)), 10) != 0
    THEN (d + INTERVAL '2 hours 30 minutes' + (MOD(ABS(hashtext(v.pid || d::text)), 30) * INTERVAL '1 minute'))::timestamptz
    ELSE NULL END,
  CASE MOD(ABS(hashtext(v.pid || d::text)), 10)
    WHEN 0 THEN 0 WHEN 1 THEN 6.5 WHEN 2 THEN 4.0 ELSE 8.0
  END::decimal,
  false
FROM (VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day'),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'night'),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'day'),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'night'),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', 'day'),
  ('e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000003', 'night'),
  ('e0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000003', 'day'),
  ('e0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000004', 'day'),
  ('e0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000005', 'night'),
  ('e0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000001', 'day'),
  ('e0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000002', 'day'),
  ('e0000000-0000-0000-0000-000000000016', 'f0000000-0000-0000-0000-000000000002', 'night'),
  ('e0000000-0000-0000-0000-000000000019', 'f0000000-0000-0000-0000-000000000001', 'day'),
  ('e0000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000003', 'day'),
  ('e0000000-0000-0000-0000-000000000027', 'f0000000-0000-0000-0000-000000000001', 'day')
) AS v(pid, sid, shift)
CROSS JOIN generate_series(CURRENT_DATE - 6, CURRENT_DATE - 1, '1 day'::interval) AS d
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 10. LEGACY ATTENDANCE (today, for legacy screens)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO attendance (guard_id, site_id, shift_type, attendance_date, check_in_time, status, is_manual_entry) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day',   CURRENT_DATE, NOW() - INTERVAL '6 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'night', CURRENT_DATE, NOW() - INTERVAL '2 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'day',   CURRENT_DATE, NOW() - INTERVAL '4 hours', 'late',    false),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'night', CURRENT_DATE, NOW() - INTERVAL '2 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', 'day',   CURRENT_DATE, NULL,                       'absent',  true),
  ('e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000003', 'night', CURRENT_DATE, NOW() - INTERVAL '1 hour',  'late',    false),
  ('e0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000003', 'day',   CURRENT_DATE, NOW() - INTERVAL '6 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000004', 'day',   CURRENT_DATE, NOW() - INTERVAL '6 hours', 'present', false),
  ('e0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000005', 'night', CURRENT_DATE, NOW() - INTERVAL '2 hours', 'present', false)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 11. WORKFORCE DOCUMENTS (document checklist data)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO workforce_documents (personnel_id, document_type, file_url, uploaded_by, verified, verified_by, verified_at) VALUES
  -- Guard Ravi Yadav (e01) — all docs
  ('e0000000-0000-0000-0000-000000000001', 'aadhaar',              'https://example.com/docs/ravi_aadhaar.pdf',    'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days'),
  ('e0000000-0000-0000-0000-000000000001', 'pan',                  'https://example.com/docs/ravi_pan.pdf',        'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days'),
  ('e0000000-0000-0000-0000-000000000001', 'photo',                'https://example.com/docs/ravi_photo.jpg',      'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days'),
  ('e0000000-0000-0000-0000-000000000001', 'police_verification',  'https://example.com/docs/ravi_pv.pdf',         'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days'),
  ('e0000000-0000-0000-0000-000000000001', 'address_proof',        'https://example.com/docs/ravi_addr.pdf',       'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days'),
  -- Guard Sanjay (e02) — partial docs
  ('e0000000-0000-0000-0000-000000000002', 'aadhaar',              'https://example.com/docs/sanjay_aadhaar.pdf',  'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days'),
  ('e0000000-0000-0000-0000-000000000002', 'photo',                'https://example.com/docs/sanjay_photo.jpg',    'a0000000-0000-0000-0000-000000000001', false, NULL, NULL),
  -- Guard Vikash (e03) — pending verification
  ('e0000000-0000-0000-0000-000000000003', 'aadhaar',              'https://example.com/docs/vikash_aadhaar.pdf',  'b0000000-0000-0000-0000-000000000001', false, NULL, NULL),
  ('e0000000-0000-0000-0000-000000000003', 'pan',                  'https://example.com/docs/vikash_pan.pdf',      'b0000000-0000-0000-0000-000000000001', false, NULL, NULL),
  -- Gunman Ajay (e11)
  ('e0000000-0000-0000-0000-000000000011', 'aadhaar',              'https://example.com/docs/ajay_aadhaar.pdf',    'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),
  ('e0000000-0000-0000-0000-000000000011', 'police_verification',  'https://example.com/docs/ajay_pv.pdf',         'a0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),
  -- Housekeeping Lakshmi (e19)
  ('e0000000-0000-0000-0000-000000000019', 'aadhaar',              'https://example.com/docs/lakshmi_aadhaar.pdf', 'b0000000-0000-0000-0000-000000000002', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'),
  -- Electrician Shankar (e23)
  ('e0000000-0000-0000-0000-000000000023', 'aadhaar',              'https://example.com/docs/shankar_aadhaar.pdf', 'b0000000-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'),
  ('e0000000-0000-0000-0000-000000000023', 'address_proof',        'https://example.com/docs/shankar_addr.pdf',    'b0000000-0000-0000-0000-000000000001', false, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 12. WORKFORCE RATINGS (client performance reviews)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO workforce_ratings (personnel_id, site_id, rated_by, rating, review_text, appreciation, review_date) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 4.5, 'Very disciplined and punctual guard. Always alert on duty.', true,  CURRENT_DATE - 10),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 3.5, 'Good overall but sometimes arrives late for night shift.', false, CURRENT_DATE - 8),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 4.0, 'Handles visitors professionally. Good communication.', true,   CURRENT_DATE - 5),
  ('e0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 3.0, 'Needs improvement in alertness during early morning hours.', false, CURRENT_DATE - 12),
  ('e0000000-0000-0000-0000-000000000019', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 4.8, 'Excellent housekeeping. Always keeps the lobby spotless.', true,   CURRENT_DATE - 3),
  ('e0000000-0000-0000-0000-000000000020', 'f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 4.0, 'Hardworking and reliable. Good attendance record.', true,         CURRENT_DATE - 7),
  ('e0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 4.2, 'Professional gunman. Maintains weapons properly.', true,          CURRENT_DATE - 15),
  ('e0000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 3.8, 'Skilled electrician. Resolves issues quickly.', false,            CURRENT_DATE - 6)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 13. COMPLAINTS (8 — various statuses for all complaint screens)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO complaints (id, site_id, raised_by, assigned_to, category, description, status, current_level, severity, incident_reported, sla_deadline, resolved_at, time_to_resolve_seconds, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', NULL,                                   'Gate Entry Issue',      'Guard not present at main gate during visitor hours. Visitors had to wait 15 minutes.', 'open',          1, 'low',      false, NOW() + INTERVAL '47 hours', NULL,                     NULL,   NOW() - INTERVAL '1 day'),
  ('a1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Guard Misconduct',      'Guard Ravi Yadav found using mobile phone while on duty near reception area.',          'in_progress',   1, 'medium',   false, NOW() + INTERVAL '20 hours', NULL,                     NULL,   NOW() - INTERVAL '3 days'),
  ('a1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Unauthorized Absence',  'Guard Rajendra Prasad absent for 3 consecutive days without informing supervisor.',     'escalated_l2',  2, 'high',     false, NOW() - INTERVAL '1 day',    NULL,                     NULL,   NOW() - INTERVAL '5 days'),
  ('a1000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Security Breach',       'Unknown person entered society premises through back gate at 2 AM. CCTV shows unattended gate.', 'escalated_l3', 3, 'critical', true,  NOW() - INTERVAL '5 days',   NULL,                     NULL,   NOW() - INTERVAL '10 days'),
  ('a1000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Parking Issue',         'Parking area not properly managed during evening rush hours. Vehicles blocking driveway.', 'resolved',   1, 'medium',   false, NOW() - INTERVAL '10 days',  NOW() - INTERVAL '12 days', 259200, NOW() - INTERVAL '15 days'),
  ('a1000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Housekeeping Issue',    'Common area on 3rd floor not cleaned for 2 days. Garbage overflowing near lift lobby.',  'resolved',      1, 'low',      false, NOW() - INTERVAL '15 days',  NOW() - INTERVAL '17 days', 259200, NOW() - INTERVAL '20 days'),
  ('a1000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Noise Complaint',       'Night shift guard talking loudly on phone at 11 PM disturbing residents near gate.',     'closed',        1, 'low',      false, NOW() - INTERVAL '20 days',  NOW() - INTERVAL '23 days', 172800, NOW() - INTERVAL '25 days'),
  ('a1000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', NULL,                                   'Equipment Issue',       'Security cabin light not working. Guard using mobile flashlight at night. Safety risk.',  'open',          1, 'high',     false, NOW() + INTERVAL '46 hours', NULL,                     NULL,   NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 14. COMPLAINT COMMENTS (timeline data)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO complaint_comments (complaint_id, author_id, comment_text, action_taken, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Guard was not at main gate from 10 AM to 10:15 AM. Multiple visitors were stranded.', NULL, NOW() - INTERVAL '1 day'),
  ('a1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Spotted the guard using phone while sitting at reception desk.', NULL, NOW() - INTERVAL '3 days'),
  ('a1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Spoken to the guard. Written warning issued. Will monitor closely.', 'acknowledged', NOW() - INTERVAL '2 days' + INTERVAL '4 hours'),
  ('a1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Guard Rajendra Prasad has not shown up for 3 days. No communication.', NULL, NOW() - INTERVAL '5 days'),
  ('a1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Replacement guard arranged from tomorrow. Investigating the situation with HR.', 'assigned_to_supervisor', NOW() - INTERVAL '4 days'),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'L2 escalation review. HR contacted the guard — he is unwell. Medical certificate requested.', 'site_visited', NOW() - INTERVAL '3 days'),
  ('a1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'CCTV footage shows back gate was unattended from 1:45 AM to 2:30 AM. Intruder entered at 2:05 AM.', NULL, NOW() - INTERVAL '10 days'),
  ('a1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Immediate action: Extra guard deployed at back gate. CCTV footage preserved.', 'replacement_arranged', NOW() - INTERVAL '9 days'),
  ('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'L3 management review scheduled. FIR to be filed. Insurance company notified.', NULL, NOW() - INTERVAL '5 days'),
  ('a1000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Parking chaos every evening 5-7 PM. Need dedicated parking attendant.', NULL, NOW() - INTERVAL '15 days'),
  ('a1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Dedicated parking attendant assigned for evening shift. Issue resolved.', 'resolved', NOW() - INTERVAL '12 days'),
  ('a1000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'Third floor common area and lift lobby have not been cleaned properly.', NULL, NOW() - INTERVAL '20 days'),
  ('a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Housekeeping staff counseled. Cleaning schedule revised and posted.', 'resolved', NOW() - INTERVAL '17 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 15. COMPLAINT ESCALATIONS (escalation history)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO complaint_escalations (complaint_id, from_level, to_level, escalated_at, escalated_by, reason) VALUES
  ('a1000000-0000-0000-0000-000000000003', 1, 2, NOW() - INTERVAL '3 days',  'system',                                  'SLA deadline exceeded — 48 hours without resolution at L1'),
  ('a1000000-0000-0000-0000-000000000004', 1, 2, NOW() - INTERVAL '8 days',  'b0000000-0000-0000-0000-000000000002',     'Critical security breach — immediate escalation by supervisor'),
  ('a1000000-0000-0000-0000-000000000004', 2, 3, NOW() - INTERVAL '5 days',  'system',                                  'SLA deadline exceeded — 24 hours without resolution at L2')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 16. REPLACEMENTS (vacancy management)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO replacements (id, absent_personnel_id, replacement_personnel_id, site_id, shift_date, status, requested_by, assigned_by, client_notified, vacancy_start, vacancy_end) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', NULL,                                   'f0000000-0000-0000-0000-000000000002', CURRENT_DATE,     'requested',  'b0000000-0000-0000-0000-000000000001', NULL,                                   false, NOW(),                    NULL),
  ('a2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000010',  'f0000000-0000-0000-0000-000000000004', CURRENT_DATE,     'assigned',   'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', true,  NOW() - INTERVAL '4 hours', NULL),
  ('a2000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009',  'f0000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, 'completed',  'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', true,  NOW() - INTERVAL '30 hours', NOW() - INTERVAL '18 hours'),
  ('a2000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000006', NULL,                                   'f0000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 'cancelled',  'b0000000-0000-0000-0000-000000000001', NULL,                                   false, NOW() - INTERVAL '54 hours', NOW() - INTERVAL '48 hours')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 17. PAYROLL (current month for 10 guards)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO payroll (guard_id, month, total_working_days, days_present, days_late, days_absent, base_salary, pro_rated_salary, overtime_hours, overtime_amount, penalty_amount, uniform_deduction, advance_deduction, other_deduction, final_salary, status, approved_by) VALUES
  ('e0000000-0000-0000-0000-000000000001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 26, 2, 2,  12000, 10400, 4,  800,  200, 300, 0,   0, 10700, 'generated', NULL),
  ('e0000000-0000-0000-0000-000000000002', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 28, 1, 1,  13000, 12133, 6,  1200, 0,   0,   500, 0, 12833, 'approved',  'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 22, 4, 4,  12000, 8800,  0,  0,    500, 300, 0,   0, 8000,  'draft',     NULL),
  ('e0000000-0000-0000-0000-000000000004', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 30, 0, 0,  14000, 14000, 10, 2000, 0,   0,   0,   0, 16000, 'paid',      'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000005', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 18, 3, 9,  12000, 7200,  0,  0,    1000,300, 0,   0, 5900,  'generated', NULL),
  ('e0000000-0000-0000-0000-000000000006', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 25, 3, 2,  13000, 10833, 2,  400,  300, 0,   0,   0, 10933, 'approved',  'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000007', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 27, 1, 2,  12000, 10800, 3,  600,  100, 0,   200, 0, 11100, 'generated', NULL),
  ('e0000000-0000-0000-0000-000000000008', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 24, 2, 4,  11000, 8800,  0,  0,    400, 300, 0,   0, 8100,  'draft',     NULL),
  ('e0000000-0000-0000-0000-000000000009', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 15, 0, 15, 12000, 6000,  0,  0,    0,   0,   0,   0, 6000,  'draft',     NULL),
  ('e0000000-0000-0000-0000-000000000010', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30, 29, 1, 0,  12500, 12083, 8,  1600, 0,   0,   0,   0, 13683, 'paid',      'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 18. UNIFORMS (uniform management data)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO uniforms (guard_id, item_name, item_cost, payment_status, amount_paid, remarks) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'uniform_set', 2500, 'pending', 0,    'New uniform issued on joining'),
  ('e0000000-0000-0000-0000-000000000001', 'shoes',       1200, 'partial', 600,  'Paying in 2 installments'),
  ('e0000000-0000-0000-0000-000000000001', 'id_card',     200,  'paid',    200,  NULL),
  ('e0000000-0000-0000-0000-000000000002', 'uniform_set', 2500, 'paid',    2500, 'Full payment on joining'),
  ('e0000000-0000-0000-0000-000000000002', 'shoes',       1200, 'paid',    1200, NULL),
  ('e0000000-0000-0000-0000-000000000003', 'uniform_set', 2500, 'pending', 0,    'To be deducted from first salary'),
  ('e0000000-0000-0000-0000-000000000005', 'uniform_set', 2500, 'pending', 0,    NULL),
  ('e0000000-0000-0000-0000-000000000005', 'torch',       500,  'paid',    500,  'Night duty equipment'),
  ('e0000000-0000-0000-0000-000000000007', 'uniform_set', 2500, 'deducted',2500, 'Deducted from July salary'),
  ('e0000000-0000-0000-0000-000000000008', 'uniform_set', 2500, 'pending', 0,    NULL)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 19. CANDIDATES (recruitment pipeline)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO candidates (id, name, phone, height, weight, education, experience_years, preferred_location, salary_expectation, status, recruiter_id, notes) VALUES
  ('a4000000-0000-0000-0000-000000000001', 'Rakesh Kumar',    '9200000001', 172, 68, '10th Pass',  2, 'Patna',       13000, 'new',                 'c0000000-0000-0000-0000-000000000003', 'Walk-in candidate. Looks fit and alert.'),
  ('a4000000-0000-0000-0000-000000000002', 'Santosh Yadav',   '9200000002', 175, 72, '12th Pass',  4, 'Patna',       15000, 'contacted',           'c0000000-0000-0000-0000-000000000003', 'Ex-army personnel. Good communication skills.'),
  ('a4000000-0000-0000-0000-000000000003', 'Pintu Kumar',     '9200000003', 168, 60, '8th Pass',   0, 'Danapur',     10000, 'interested',          'c0000000-0000-0000-0000-000000000003', 'First job seeker. Eager to work.'),
  ('a4000000-0000-0000-0000-000000000004', 'Govind Singh',    '9200000004', 178, 75, 'Graduate',   5, 'Patna',       16000, 'interview_scheduled', 'c0000000-0000-0000-0000-000000000003', 'Interview scheduled for Monday 10 AM.'),
  ('a4000000-0000-0000-0000-000000000005', 'Rajesh Thakur',   '9200000005', 170, 66, '10th Pass',  1, 'Boring Road', 12000, 'selected',            'c0000000-0000-0000-0000-000000000003', 'Selected. Joining next week at Kankarbagh Mall.')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 20. INSPECTIONS (site inspections with incidents)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO inspections (site_id, inspector_id, inspection_date, remarks, guards_present, guards_absent, photos, latitude, longitude, incident_reported, incident_severity, incident_description) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days',  'All guards present and in proper uniform. Logbook entries up to date. CCTV functioning.', ARRAY['e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003']::uuid[], ARRAY[]::uuid[], ARRAY[]::text[], 25.612, 85.158, false, NULL,     NULL),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days',  'Guard Deepak Singh absent without notice. Gate 2 padlock found broken. Temporary lock arranged.', ARRAY['e0000000-0000-0000-0000-000000000004']::uuid[], ARRAY['e0000000-0000-0000-0000-000000000005']::uuid[], ARRAY[]::text[], 25.607, 85.123, true,  'medium', 'Guard absent without prior notice. Gate 2 padlock broken — possibly tampered.'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days',  'Night shift inspection. All guards alert and in position. Mall premises secure.', ARRAY['e0000000-0000-0000-0000-000000000006','e0000000-0000-0000-0000-000000000007']::uuid[], ARRAY[]::uuid[], ARRAY[]::text[], 25.594, 85.171, false, NULL,     NULL),
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '7 days',  'Society perimeter check. Guard Rohit found sleeping during night shift at main gate. Written warning issued on spot.', ARRAY['e0000000-0000-0000-0000-000000000008']::uuid[], ARRAY[]::uuid[], ARRAY[]::text[], 25.628, 85.105, true,  'high',   'Guard Pappu Kumar found sleeping during night duty at main gate. Written warning issued. Incident logged.')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 21. NOTIFICATIONS (notification center data)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO notifications (user_id, title, body, type, is_read, created_at) VALUES
  -- Admin notifications
  ('a0000000-0000-0000-0000-000000000001', 'Payroll Generated',      'June 2026 payroll generated for 10 guards. Review and approve.',                          'salary_generated',    false, NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', 'Attendance Alert',       'Guard Deepak Singh (PIS-90) marked absent at Boring Road Complex today.',                'attendance_alert',    false, NOW() - INTERVAL '3 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'Inspection Completed',   'Supervisor Sunil Verma completed inspection at Patna Main Office. No incidents reported.', 'inspection_reminder', true,  NOW() - INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000001', 'New Candidate',          'Rakesh Kumar added to recruitment pipeline by Priya Singh.',                                'recruitment_update',  true,  NOW() - INTERVAL '3 days'),
  ('a0000000-0000-0000-0000-000000000001', 'Security Breach Alert',  'Critical complaint escalated to L3 at Patliputra Society. Immediate review required.',     'general',             false, NOW() - INTERVAL '5 days'),
  -- Guard notifications
  ('d0000000-0000-0000-0000-000000000001', 'Shift Reminder',         'Your day shift at Patna Main Office starts at 6:00 AM tomorrow.',                          'shift_reminder',      false, NOW() - INTERVAL '12 hours'),
  ('d0000000-0000-0000-0000-000000000001', 'Salary Slip Ready',      'Your salary slip for May 2026 is ready. Check Salary section in the app.',                 'salary_generated',    true,  NOW() - INTERVAL '5 days'),
  -- Supervisor notifications
  ('b0000000-0000-0000-0000-000000000001', 'Attendance Alert',       'Guard Deepak Singh absent at Boring Road Complex. Replacement needed.',                    'attendance_alert',    false, NOW() - INTERVAL '3 hours'),
  ('b0000000-0000-0000-0000-000000000001', 'New Complaint',          'New complaint raised by Manoj Tiwari at Patna Main Office: Gate Entry Issue.',             'general',             false, NOW() - INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000002', 'Escalation Notice',      'Complaint #3 escalated to L2 at Patliputra Society due to SLA breach.',                   'general',             false, NOW() - INTERVAL '3 days'),
  -- Client notifications
  ('c0000000-0000-0000-0000-000000000001', 'Replacement Assigned',   'Replacement guard Suresh Mahto assigned for absent guard Rajendra Prasad at your society.','general',             false, NOW() - INTERVAL '4 hours'),
  ('c0000000-0000-0000-0000-000000000002', 'Complaint Update',       'Your complaint about parking issue has been resolved. Dedicated attendant assigned.',      'general',             true,  NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 22. UPDATE SITE REFERENCES (supervisor + manager assignments)
-- ═══════════════════════════════════════════════════════════════
UPDATE sites SET
  assigned_supervisor_id = 'e0000000-0000-0000-0000-000000000027',
  site_manager_id = 'a0000000-0000-0000-0000-000000000002'
WHERE id = 'f0000000-0000-0000-0000-000000000001';

UPDATE sites SET
  assigned_supervisor_id = 'e0000000-0000-0000-0000-000000000027',
  site_manager_id = 'a0000000-0000-0000-0000-000000000002'
WHERE id = 'f0000000-0000-0000-0000-000000000002';

UPDATE sites SET
  assigned_supervisor_id = 'e0000000-0000-0000-0000-000000000028',
  site_manager_id = 'a0000000-0000-0000-0000-000000000003'
WHERE id = 'f0000000-0000-0000-0000-000000000003';

UPDATE sites SET
  assigned_supervisor_id = 'e0000000-0000-0000-0000-000000000028',
  site_manager_id = 'a0000000-0000-0000-0000-000000000003'
WHERE id = 'f0000000-0000-0000-0000-000000000004';

UPDATE sites SET
  site_manager_id = 'a0000000-0000-0000-0000-000000000002'
WHERE id = 'f0000000-0000-0000-0000-000000000005';

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- 23. VERIFICATION — Run after COMMIT to check counts
-- ═══════════════════════════════════════════════════════════════
SELECT '✅ VERIFICATION' AS status;
SELECT 'workforce_categories'  AS tbl, COUNT(*) AS cnt FROM workforce_categories
UNION ALL SELECT 'users',                COUNT(*) FROM users
UNION ALL SELECT 'sites',                COUNT(*) FROM sites
UNION ALL SELECT 'workforce_personnel',  COUNT(*) FROM workforce_personnel
UNION ALL SELECT 'guards (legacy)',      COUNT(*) FROM guards
UNION ALL SELECT 'client_users',         COUNT(*) FROM client_users
UNION ALL SELECT 'site_assignments',     COUNT(*) FROM site_assignments
UNION ALL SELECT 'workforce_attendance', COUNT(*) FROM workforce_attendance
UNION ALL SELECT 'attendance (legacy)',  COUNT(*) FROM attendance
UNION ALL SELECT 'workforce_documents',  COUNT(*) FROM workforce_documents
UNION ALL SELECT 'workforce_ratings',    COUNT(*) FROM workforce_ratings
UNION ALL SELECT 'complaints',           COUNT(*) FROM complaints
UNION ALL SELECT 'complaint_comments',   COUNT(*) FROM complaint_comments
UNION ALL SELECT 'complaint_escalations',COUNT(*) FROM complaint_escalations
UNION ALL SELECT 'replacements',         COUNT(*) FROM replacements
UNION ALL SELECT 'payroll',              COUNT(*) FROM payroll
UNION ALL SELECT 'uniforms',             COUNT(*) FROM uniforms
UNION ALL SELECT 'candidates',           COUNT(*) FROM candidates
UNION ALL SELECT 'inspections',          COUNT(*) FROM inspections
UNION ALL SELECT 'notifications',        COUNT(*) FROM notifications
ORDER BY tbl;
