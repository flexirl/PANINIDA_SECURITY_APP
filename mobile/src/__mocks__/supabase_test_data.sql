-- ============================================================================
-- SUPABASE TEST DATA FOR PERSONNEL CATEGORY FILTERING
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to populate test data
-- This creates 60 personnel across all categories with attendance records
-- ============================================================================

-- Step 1: Insert Workforce Categories (if not already present)
-- ============================================================================
-- Let Supabase generate UUIDs automatically

INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined, created_at, updated_at)
VALUES 
  ('Guard', 'PIS', true, true, NOW(), NOW()),
  ('Gunman', 'GM', true, true, NOW(), NOW()),
  ('Rifleman', 'RM', true, true, NOW(), NOW()),
  ('PSO', 'PSO', true, true, NOW(), NOW()),
  ('Bouncer', 'BNC', true, true, NOW(), NOW()),
  ('Housekeeping', 'HK', false, true, NOW(), NOW()),
  ('Sweeper', 'SWP', false, true, NOW(), NOW()),
  ('Gardener', 'GRD', false, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get Category IDs (we'll need these for personnel creation)
-- ============================================================================

DO $$
DECLARE
  cat_guard_id UUID;
  cat_gunman_id UUID;
  cat_rifleman_id UUID;
  cat_pso_id UUID;
  cat_bouncer_id UUID;
  cat_housekeeping_id UUID;
  cat_sweeper_id UUID;
  cat_gardener_id UUID;
  i INTEGER;
  user_id_var UUID;
  personnel_id_var UUID;
  employee_id_var TEXT;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_guard_id FROM workforce_categories WHERE name = 'Guard';
  SELECT id INTO cat_gunman_id FROM workforce_categories WHERE name = 'Gunman';
  SELECT id INTO cat_rifleman_id FROM workforce_categories WHERE name = 'Rifleman';
  SELECT id INTO cat_pso_id FROM workforce_categories WHERE name = 'PSO';
  SELECT id INTO cat_bouncer_id FROM workforce_categories WHERE name = 'Bouncer';
  SELECT id INTO cat_housekeeping_id FROM workforce_categories WHERE name = 'Housekeeping';
  SELECT id INTO cat_sweeper_id FROM workforce_categories WHERE name = 'Sweeper';
  SELECT id INTO cat_gardener_id FROM workforce_categories WHERE name = 'Gardener';

  -- Create 20 Guards
  FOR i IN 1..20 LOOP
    -- Create user
    INSERT INTO users (name, phone, role, is_active, created_at, updated_at)
    VALUES (
      'Guard ' || i,
      '+9198765432' || LPAD(i::text, 2, '0'),
      'workforce_personnel',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO user_id_var;

    -- Generate employee ID
    employee_id_var := 'PIS-' || LPAD(i::text, 3, '0');

    -- Create personnel
    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone, photo_url,
      base_salary, joining_date, shift_type, employment_status,
      emergency_contact_name, emergency_contact_phone,
      bank_account_number, bank_ifsc, bank_name,
      aadhaar_number, pan_number, address,
      created_at, updated_at
    )
    VALUES (
      user_id_var,
      cat_guard_id,
      employee_id_var,
      'Guard ' || i,
      '+9198765432' || LPAD(i::text, 2, '0'),
      'https://i.pravatar.cc/150?img=' || i,
      17000 + (i * 500),
      '2023-' || LPAD((i % 12 + 1)::text, 2, '0') || '-15',
      CASE WHEN i % 2 = 0 THEN 'day' ELSE 'night' END,
      'active',
      'Emergency Contact ' || i,
      '+9198765432' || LPAD((i + 1)::text, 2, '0'),
      i || '234567890',
      'SBIN0001234',
      'State Bank of India',
      i || '234-5678-9012',
      'ABCDE' || i || '234F',
      'Address ' || i || ', Delhi NCR',
      NOW(),
      NOW()
    )
    RETURNING id INTO personnel_id_var;

    -- Create attendance record
    INSERT INTO workforce_attendance (
      personnel_id, attendance_date, status,
      check_in_time, check_in_location, check_in_selfie,
      shift_type, is_manual_entry, created_at, updated_at
    )
    VALUES (
      personnel_id_var,
      CURRENT_DATE,
      CASE 
        WHEN i % 5 = 0 THEN 'absent'
        WHEN i % 5 = 4 THEN 'late'
        ELSE 'present'
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE CURRENT_DATE + INTERVAL '9 hours' + (i || ' minutes')::INTERVAL
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(77.2090 + (i * 0.001), 28.6139 + (i * 0.001)), 4326)
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE 'https://i.pravatar.cc/150?img=' || i
      END,
      CASE WHEN i % 2 = 0 THEN 'day' ELSE 'night' END,
      false,
      NOW(),
      NOW()
    );
  END LOOP;

  -- Create 15 Gunman Personnel (5 Gunman, 5 Rifleman, 5 PSO)
  FOR i IN 1..15 LOOP
    -- Create user
    INSERT INTO users (name, phone, role, is_active, created_at, updated_at)
    VALUES (
      CASE 
        WHEN i <= 5 THEN 'Gunman ' || i
        WHEN i <= 10 THEN 'Rifleman ' || (i - 5)
        ELSE 'PSO ' || (i - 10)
      END,
      '+9198765442' || LPAD(i::text, 2, '0'),
      'workforce_personnel',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO user_id_var;

    -- Generate employee ID and get category
    IF i <= 5 THEN
      employee_id_var := 'GM-' || LPAD(i::text, 3, '0');
      personnel_id_var := cat_gunman_id;
    ELSIF i <= 10 THEN
      employee_id_var := 'RM-' || LPAD((i - 5)::text, 3, '0');
      personnel_id_var := cat_rifleman_id;
    ELSE
      employee_id_var := 'PSO-' || LPAD((i - 10)::text, 3, '0');
      personnel_id_var := cat_pso_id;
    END IF;

    -- Create personnel
    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone, photo_url,
      base_salary, joining_date, shift_type, employment_status,
      emergency_contact_name, emergency_contact_phone,
      bank_account_number, bank_ifsc, bank_name,
      aadhaar_number, pan_number, address,
      created_at, updated_at
    )
    VALUES (
      user_id_var,
      personnel_id_var,
      employee_id_var,
      CASE 
        WHEN i <= 5 THEN 'Gunman ' || i
        WHEN i <= 10 THEN 'Rifleman ' || (i - 5)
        ELSE 'PSO ' || (i - 10)
      END,
      '+9198765442' || LPAD(i::text, 2, '0'),
      'https://i.pravatar.cc/150?img=' || (i + 20),
      25000 + (i * 1000),
      '2023-' || LPAD((i % 12 + 1)::text, 2, '0') || '-20',
      'day',
      'active',
      'Emergency Contact ' || (i + 20),
      '+9198765442' || LPAD((i + 1)::text, 2, '0'),
      (i + 4) || '567890123',
      'SBIN0002345',
      'State Bank of India',
      (i + 4) || '567-8901-2345',
      'DEFGH' || (i + 4) || '567I',
      'Address ' || (i + 20) || ', Delhi NCR',
      NOW(),
      NOW()
    )
    RETURNING id INTO personnel_id_var;

    -- Create attendance record
    INSERT INTO workforce_attendance (
      personnel_id, attendance_date, status,
      check_in_time, check_in_location, check_in_selfie,
      shift_type, is_manual_entry, created_at, updated_at
    )
    VALUES (
      personnel_id_var,
      CURRENT_DATE,
      CASE 
        WHEN i % 5 = 0 THEN 'absent'
        WHEN i % 5 = 4 THEN 'late'
        ELSE 'present'
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE CURRENT_DATE + INTERVAL '9 hours' + (i || ' minutes')::INTERVAL
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(77.2090 + (i * 0.001), 28.6139 + (i * 0.001)), 4326)
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE 'https://i.pravatar.cc/150?img=' || (i + 20)
      END,
      'day',
      false,
      NOW(),
      NOW()
    );
  END LOOP;

  -- Create 10 Bouncers
  FOR i IN 1..10 LOOP
    -- Create user
    INSERT INTO users (name, phone, role, is_active, created_at, updated_at)
    VALUES (
      'Bouncer ' || i,
      '+9198765453' || LPAD(i::text, 2, '0'),
      'workforce_personnel',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO user_id_var;

    -- Create personnel
    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone, photo_url,
      base_salary, joining_date, shift_type, employment_status,
      emergency_contact_name, emergency_contact_phone,
      bank_account_number, bank_ifsc, bank_name,
      aadhaar_number, pan_number, address,
      created_at, updated_at
    )
    VALUES (
      user_id_var,
      cat_bouncer_id,
      'BNC-' || LPAD(i::text, 3, '0'),
      'Bouncer ' || i,
      '+9198765453' || LPAD(i::text, 2, '0'),
      'https://i.pravatar.cc/150?img=' || (i + 40),
      22000 + (i * 800),
      '2023-' || LPAD((i % 12 + 1)::text, 2, '0') || '-25',
      CASE WHEN i % 2 = 0 THEN 'day' ELSE 'night' END,
      'active',
      'Emergency Contact ' || (i + 40),
      '+9198765453' || LPAD((i + 1)::text, 2, '0'),
      (i + 8) || '890123456',
      'HDFC0003456',
      'HDFC Bank',
      (i + 8) || '890-1234-5678',
      'HIJKL' || (i + 8) || '901M',
      'Address ' || (i + 40) || ', Delhi NCR',
      NOW(),
      NOW()
    )
    RETURNING id INTO personnel_id_var;

    -- Create attendance record
    INSERT INTO workforce_attendance (
      personnel_id, attendance_date, status,
      check_in_time, check_in_location, check_in_selfie,
      shift_type, is_manual_entry, created_at, updated_at
    )
    VALUES (
      personnel_id_var,
      CURRENT_DATE,
      CASE 
        WHEN i % 5 = 0 THEN 'absent'
        WHEN i % 5 = 4 THEN 'late'
        ELSE 'present'
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE CURRENT_DATE + INTERVAL '9 hours' + (i || ' minutes')::INTERVAL
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(77.2090 + (i * 0.001), 28.6139 + (i * 0.001)), 4326)
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE 'https://i.pravatar.cc/150?img=' || (i + 40)
      END,
      CASE WHEN i % 2 = 0 THEN 'day' ELSE 'night' END,
      false,
      NOW(),
      NOW()
    );
  END LOOP;

  -- Create 15 Helpers (8 Housekeeping, 4 Sweeper, 3 Gardener)
  FOR i IN 1..15 LOOP
    -- Create user
    INSERT INTO users (name, phone, role, is_active, created_at, updated_at)
    VALUES (
      CASE 
        WHEN i <= 8 THEN 'Housekeeping Staff ' || i
        WHEN i <= 12 THEN 'Sweeper ' || (i - 8)
        ELSE 'Gardener ' || (i - 12)
      END,
      '+9198765464' || LPAD(i::text, 2, '0'),
      'workforce_personnel',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO user_id_var;

    -- Generate employee ID and get category
    IF i <= 8 THEN
      employee_id_var := 'HK-' || LPAD(i::text, 3, '0');
      personnel_id_var := cat_housekeeping_id;
    ELSIF i <= 12 THEN
      employee_id_var := 'SWP-' || LPAD((i - 8)::text, 3, '0');
      personnel_id_var := cat_sweeper_id;
    ELSE
      employee_id_var := 'GRD-' || LPAD((i - 12)::text, 3, '0');
      personnel_id_var := cat_gardener_id;
    END IF;

    -- Create personnel
    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone, photo_url,
      base_salary, joining_date, shift_type, employment_status,
      emergency_contact_name, emergency_contact_phone,
      bank_account_number, bank_ifsc, bank_name,
      aadhaar_number, pan_number, address,
      created_at, updated_at
    )
    VALUES (
      user_id_var,
      personnel_id_var,
      employee_id_var,
      CASE 
        WHEN i <= 8 THEN 'Housekeeping Staff ' || i
        WHEN i <= 12 THEN 'Sweeper ' || (i - 8)
        ELSE 'Gardener ' || (i - 12)
      END,
      '+9198765464' || LPAD(i::text, 2, '0'),
      'https://i.pravatar.cc/150?img=' || (i + 50),
      14000 + (i * 500),
      '2023-' || LPAD((i % 12 + 1)::text, 2, '0') || '-28',
      'day',
      'active',
      'Emergency Contact ' || (i + 50),
      '+9198765464' || LPAD((i + 1)::text, 2, '0'),
      (i + 9) || '901234567',
      'ICIC0003456',
      'ICICI Bank',
      (i + 9) || '901-2345-6789',
      'IJKLM' || (i + 9) || '012N',
      'Address ' || (i + 50) || ', Delhi NCR',
      NOW(),
      NOW()
    )
    RETURNING id INTO personnel_id_var;

    -- Create attendance record
    INSERT INTO workforce_attendance (
      personnel_id, attendance_date, status,
      check_in_time, check_in_location, check_in_selfie,
      shift_type, is_manual_entry, created_at, updated_at
    )
    VALUES (
      personnel_id_var,
      CURRENT_DATE,
      CASE 
        WHEN i % 5 = 0 THEN 'absent'
        WHEN i % 5 = 4 THEN 'late'
        ELSE 'present'
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE CURRENT_DATE + INTERVAL '9 hours' + (i || ' minutes')::INTERVAL
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(77.2090 + (i * 0.001), 28.6139 + (i * 0.001)), 4326)
      END,
      CASE 
        WHEN i % 5 = 0 THEN NULL
        ELSE 'https://i.pravatar.cc/150?img=' || (i + 50)
      END,
      'day',
      false,
      NOW(),
      NOW()
    );
  END LOOP;

  RAISE NOTICE 'Successfully created 60 personnel with attendance records!';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check category counts
SELECT 
  c.name as category,
  COUNT(p.id) as personnel_count
FROM workforce_categories c
LEFT JOIN workforce_personnel p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Check attendance summary for today
SELECT 
  status,
  COUNT(*) as count
FROM workforce_attendance
WHERE attendance_date = CURRENT_DATE
GROUP BY status
ORDER BY status;

-- Check total personnel by category group
SELECT 
  CASE 
    WHEN c.name = 'Guard' THEN 'Guards'
    WHEN c.name IN ('Gunman', 'Rifleman', 'PSO') THEN 'Gunman Personnel'
    WHEN c.name = 'Bouncer' THEN 'Bouncers'
    WHEN c.name IN ('Housekeeping', 'Sweeper', 'Gardener') THEN 'Helpers/Housekeeping'
  END as category_group,
  COUNT(p.id) as personnel_count
FROM workforce_categories c
LEFT JOIN workforce_personnel p ON p.category_id = c.id
GROUP BY category_group
ORDER BY category_group;

-- ============================================================================
-- CLEANUP (Run this if you want to remove test data)
-- ============================================================================

/*
-- Uncomment to delete all test data

DELETE FROM workforce_attendance 
WHERE personnel_id IN (
  SELECT id FROM workforce_personnel 
  WHERE employee_id LIKE 'PIS-%' 
  OR employee_id LIKE 'GM-%' 
  OR employee_id LIKE 'RM-%' 
  OR employee_id LIKE 'PSO-%' 
  OR employee_id LIKE 'BNC-%' 
  OR employee_id LIKE 'HK-%' 
  OR employee_id LIKE 'SWP-%' 
  OR employee_id LIKE 'GRD-%'
);

DELETE FROM workforce_personnel 
WHERE employee_id LIKE 'PIS-%' 
OR employee_id LIKE 'GM-%' 
OR employee_id LIKE 'RM-%' 
OR employee_id LIKE 'PSO-%' 
OR employee_id LIKE 'BNC-%' 
OR employee_id LIKE 'HK-%' 
OR employee_id LIKE 'SWP-%' 
OR employee_id LIKE 'GRD-%';

DELETE FROM users 
WHERE phone LIKE '+919876543%' 
OR phone LIKE '+919876544%' 
OR phone LIKE '+919876545%' 
OR phone LIKE '+919876546%';
*/


-- Step 2: Create Users for Personnel
-- ============================================================================

-- Guards (20 users)
INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at)
SELECT 
  'user-guard-' || LPAD(generate_series::text, 3, '0'),
  'Guard ' || generate_series,
  '+9198765432' || LPAD(generate_series::text, 2, '0'),
  'workforce_personnel',
  true,
  NOW(),
  NOW()
FROM generate_series(1, 20)
ON CONFLICT (id) DO NOTHING;

-- Gunman Personnel (15 users - 5 Gunman, 5 Rifleman, 5 PSO)
INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at)
SELECT 
  'user-gunman-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 5 THEN 'Gunman ' || generate_series
    WHEN generate_series <= 10 THEN 'Rifleman ' || (generate_series - 5)
    ELSE 'PSO ' || (generate_series - 10)
  END,
  '+9198765442' || LPAD(generate_series::text, 2, '0'),
  'workforce_personnel',
  true,
  NOW(),
  NOW()
FROM generate_series(1, 15)
ON CONFLICT (id) DO NOTHING;

-- Bouncers (10 users)
INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at)
SELECT 
  'user-bouncer-' || LPAD(generate_series::text, 3, '0'),
  'Bouncer ' || generate_series,
  '+9198765453' || LPAD(generate_series::text, 2, '0'),
  'workforce_personnel',
  true,
  NOW(),
  NOW()
FROM generate_series(1, 10)
ON CONFLICT (id) DO NOTHING;

-- Helpers (15 users - 8 Housekeeping, 4 Sweeper, 3 Gardener)
INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at)
SELECT 
  'user-helper-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 8 THEN 'Housekeeping Staff ' || generate_series
    WHEN generate_series <= 12 THEN 'Sweeper ' || (generate_series - 8)
    ELSE 'Gardener ' || (generate_series - 12)
  END,
  '+9198765464' || LPAD(generate_series::text, 2, '0'),
  'workforce_personnel',
  true,
  NOW(),
  NOW()
FROM generate_series(1, 15)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create Workforce Personnel Records
-- ============================================================================

-- Guards (20 personnel)
INSERT INTO workforce_personnel (
  id, user_id, category_id, employee_id, name, phone, photo_url,
  base_salary, joining_date, shift_type, employment_status,
  emergency_contact_name, emergency_contact_phone,
  bank_account_number, bank_ifsc, bank_name,
  aadhaar_number, pan_number, address,
  created_at, updated_at
)
SELECT 
  'guard-' || LPAD(generate_series::text, 3, '0'),
  'user-guard-' || LPAD(generate_series::text, 3, '0'),
  'cat-guard-001',
  'PIS-' || LPAD(generate_series::text, 3, '0'),
  'Guard ' || generate_series,
  '+9198765432' || LPAD(generate_series::text, 2, '0'),
  'https://i.pravatar.cc/150?img=' || generate_series,
  17000 + (generate_series * 500),
  '2023-' || LPAD((generate_series % 12 + 1)::text, 2, '0') || '-15',
  CASE WHEN generate_series % 2 = 0 THEN 'day' ELSE 'night' END,
  'active',
  'Emergency Contact ' || generate_series,
  '+9198765432' || LPAD((generate_series + 1)::text, 2, '0'),
  generate_series || '234567890',
  'SBIN0001234',
  'State Bank of India',
  generate_series || '234-5678-9012',
  'ABCDE' || generate_series || '234F',
  'Address ' || generate_series || ', Delhi NCR',
  NOW(),
  NOW()
FROM generate_series(1, 20)
ON CONFLICT (id) DO NOTHING;

-- Gunman Personnel (15 personnel)
INSERT INTO workforce_personnel (
  id, user_id, category_id, employee_id, name, phone, photo_url,
  base_salary, joining_date, shift_type, employment_status,
  emergency_contact_name, emergency_contact_phone,
  bank_account_number, bank_ifsc, bank_name,
  aadhaar_number, pan_number, address,
  created_at, updated_at
)
SELECT 
  'gunman-' || LPAD(generate_series::text, 3, '0'),
  'user-gunman-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 5 THEN 'cat-gunman-001'
    WHEN generate_series <= 10 THEN 'cat-rifleman-001'
    ELSE 'cat-pso-001'
  END,
  CASE 
    WHEN generate_series <= 5 THEN 'GM-' || LPAD(generate_series::text, 3, '0')
    WHEN generate_series <= 10 THEN 'RM-' || LPAD((generate_series - 5)::text, 3, '0')
    ELSE 'PSO-' || LPAD((generate_series - 10)::text, 3, '0')
  END,
  CASE 
    WHEN generate_series <= 5 THEN 'Gunman ' || generate_series
    WHEN generate_series <= 10 THEN 'Rifleman ' || (generate_series - 5)
    ELSE 'PSO ' || (generate_series - 10)
  END,
  '+9198765442' || LPAD(generate_series::text, 2, '0'),
  'https://i.pravatar.cc/150?img=' || (generate_series + 20),
  25000 + (generate_series * 1000),
  '2023-' || LPAD((generate_series % 12 + 1)::text, 2, '0') || '-20',
  'day',
  'active',
  'Emergency Contact ' || (generate_series + 20),
  '+9198765442' || LPAD((generate_series + 1)::text, 2, '0'),
  (generate_series + 4) || '567890123',
  'SBIN0002345',
  'State Bank of India',
  (generate_series + 4) || '567-8901-2345',
  'DEFGH' || (generate_series + 4) || '567I',
  'Address ' || (generate_series + 20) || ', Delhi NCR',
  NOW(),
  NOW()
FROM generate_series(1, 15)
ON CONFLICT (id) DO NOTHING;

-- Bouncers (10 personnel)
INSERT INTO workforce_personnel (
  id, user_id, category_id, employee_id, name, phone, photo_url,
  base_salary, joining_date, shift_type, employment_status,
  emergency_contact_name, emergency_contact_phone,
  bank_account_number, bank_ifsc, bank_name,
  aadhaar_number, pan_number, address,
  created_at, updated_at
)
SELECT 
  'bouncer-' || LPAD(generate_series::text, 3, '0'),
  'user-bouncer-' || LPAD(generate_series::text, 3, '0'),
  'cat-bouncer-001',
  'BNC-' || LPAD(generate_series::text, 3, '0'),
  'Bouncer ' || generate_series,
  '+9198765453' || LPAD(generate_series::text, 2, '0'),
  'https://i.pravatar.cc/150?img=' || (generate_series + 40),
  22000 + (generate_series * 800),
  '2023-' || LPAD((generate_series % 12 + 1)::text, 2, '0') || '-25',
  CASE WHEN generate_series % 2 = 0 THEN 'day' ELSE 'night' END,
  'active',
  'Emergency Contact ' || (generate_series + 40),
  '+9198765453' || LPAD((generate_series + 1)::text, 2, '0'),
  (generate_series + 8) || '890123456',
  'HDFC0003456',
  'HDFC Bank',
  (generate_series + 8) || '890-1234-5678',
  'HIJKL' || (generate_series + 8) || '901M',
  'Address ' || (generate_series + 40) || ', Delhi NCR',
  NOW(),
  NOW()
FROM generate_series(1, 10)
ON CONFLICT (id) DO NOTHING;

-- Helpers (15 personnel)
INSERT INTO workforce_personnel (
  id, user_id, category_id, employee_id, name, phone, photo_url,
  base_salary, joining_date, shift_type, employment_status,
  emergency_contact_name, emergency_contact_phone,
  bank_account_number, bank_ifsc, bank_name,
  aadhaar_number, pan_number, address,
  created_at, updated_at
)
SELECT 
  'helper-' || LPAD(generate_series::text, 3, '0'),
  'user-helper-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 8 THEN 'cat-housekeeping-001'
    WHEN generate_series <= 12 THEN 'cat-sweeper-001'
    ELSE 'cat-gardener-001'
  END,
  CASE 
    WHEN generate_series <= 8 THEN 'HK-' || LPAD(generate_series::text, 3, '0')
    WHEN generate_series <= 12 THEN 'SWP-' || LPAD((generate_series - 8)::text, 3, '0')
    ELSE 'GRD-' || LPAD((generate_series - 12)::text, 3, '0')
  END,
  CASE 
    WHEN generate_series <= 8 THEN 'Housekeeping Staff ' || generate_series
    WHEN generate_series <= 12 THEN 'Sweeper ' || (generate_series - 8)
    ELSE 'Gardener ' || (generate_series - 12)
  END,
  '+9198765464' || LPAD(generate_series::text, 2, '0'),
  'https://i.pravatar.cc/150?img=' || (generate_series + 50),
  14000 + (generate_series * 500),
  '2023-' || LPAD((generate_series % 12 + 1)::text, 2, '0') || '-28',
  'day',
  'active',
  'Emergency Contact ' || (generate_series + 50),
  '+9198765464' || LPAD((generate_series + 1)::text, 2, '0'),
  (generate_series + 9) || '901234567',
  'ICIC0003456',
  'ICICI Bank',
  (generate_series + 9) || '901-2345-6789',
  'IJKLM' || (generate_series + 9) || '012N',
  'Address ' || (generate_series + 50) || ', Delhi NCR',
  NOW(),
  NOW()
FROM generate_series(1, 15)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create Today's Attendance Records
-- ============================================================================
-- 60% present, 20% late, 20% absent

-- Guards Attendance
INSERT INTO workforce_attendance (
  id, personnel_id, attendance_date, status,
  check_in_time, check_in_location, check_in_selfie,
  shift_type, is_manual_entry, created_at, updated_at
)
SELECT 
  'attendance-guard-' || LPAD(generate_series::text, 3, '0'),
  'guard-' || LPAD(generate_series::text, 3, '0'),
  CURRENT_DATE,
  CASE 
    WHEN generate_series % 5 = 0 THEN 'absent'
    WHEN generate_series % 5 = 4 THEN 'late'
    ELSE 'present'
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE CURRENT_DATE + INTERVAL '9 hours' + (generate_series || ' minutes')::INTERVAL
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(77.2090 + (generate_series * 0.001), 28.6139 + (generate_series * 0.001)), 4326)
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE 'https://i.pravatar.cc/150?img=' || generate_series
  END,
  CASE WHEN generate_series % 2 = 0 THEN 'day' ELSE 'night' END,
  false,
  NOW(),
  NOW()
FROM generate_series(1, 20)
ON CONFLICT (id) DO NOTHING;

-- Gunman Personnel Attendance
INSERT INTO workforce_attendance (
  id, personnel_id, attendance_date, status,
  check_in_time, check_in_location, check_in_selfie,
  shift_type, is_manual_entry, created_at, updated_at
)
SELECT 
  'attendance-gunman-' || LPAD(generate_series::text, 3, '0'),
  'gunman-' || LPAD(generate_series::text, 3, '0'),
  CURRENT_DATE,
  CASE 
    WHEN generate_series % 5 = 0 THEN 'absent'
    WHEN generate_series % 5 = 4 THEN 'late'
    ELSE 'present'
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE CURRENT_DATE + INTERVAL '9 hours' + (generate_series || ' minutes')::INTERVAL
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(77.2090 + (generate_series * 0.001), 28.6139 + (generate_series * 0.001)), 4326)
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE 'https://i.pravatar.cc/150?img=' || (generate_series + 20)
  END,
  'day',
  false,
  NOW(),
  NOW()
FROM generate_series(1, 15)
ON CONFLICT (id) DO NOTHING;

-- Bouncers Attendance
INSERT INTO workforce_attendance (
  id, personnel_id, attendance_date, status,
  check_in_time, check_in_location, check_in_selfie,
  shift_type, is_manual_entry, created_at, updated_at
)
SELECT 
  'attendance-bouncer-' || LPAD(generate_series::text, 3, '0'),
  'bouncer-' || LPAD(generate_series::text, 3, '0'),
  CURRENT_DATE,
  CASE 
    WHEN generate_series % 5 = 0 THEN 'absent'
    WHEN generate_series % 5 = 4 THEN 'late'
    ELSE 'present'
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE CURRENT_DATE + INTERVAL '9 hours' + (generate_series || ' minutes')::INTERVAL
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(77.2090 + (generate_series * 0.001), 28.6139 + (generate_series * 0.001)), 4326)
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE 'https://i.pravatar.cc/150?img=' || (generate_series + 40)
  END,
  CASE WHEN generate_series % 2 = 0 THEN 'day' ELSE 'night' END,
  false,
  NOW(),
  NOW()
FROM generate_series(1, 10)
ON CONFLICT (id) DO NOTHING;

-- Helpers Attendance (only for those with attendance_required = true)
-- Note: Housekeeping, Sweeper, Gardener have attendance_required = false in the spec
-- But we'll add some records for testing purposes
INSERT INTO workforce_attendance (
  id, personnel_id, attendance_date, status,
  check_in_time, check_in_location, check_in_selfie,
  shift_type, is_manual_entry, created_at, updated_at
)
SELECT 
  'attendance-helper-' || LPAD(generate_series::text, 3, '0'),
  'helper-' || LPAD(generate_series::text, 3, '0'),
  CURRENT_DATE,
  CASE 
    WHEN generate_series % 5 = 0 THEN 'absent'
    WHEN generate_series % 5 = 4 THEN 'late'
    ELSE 'present'
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE CURRENT_DATE + INTERVAL '9 hours' + (generate_series || ' minutes')::INTERVAL
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(77.2090 + (generate_series * 0.001), 28.6139 + (generate_series * 0.001)), 4326)
  END,
  CASE 
    WHEN generate_series % 5 = 0 THEN NULL
    ELSE 'https://i.pravatar.cc/150?img=' || (generate_series + 50)
  END,
  'day',
  false,
  NOW(),
  NOW()
FROM generate_series(1, 15)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check category counts
SELECT 
  c.name as category,
  COUNT(p.id) as personnel_count
FROM workforce_categories c
LEFT JOIN workforce_personnel p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Check attendance summary for today
SELECT 
  status,
  COUNT(*) as count
FROM workforce_attendance
WHERE attendance_date = CURRENT_DATE
GROUP BY status
ORDER BY status;

-- Check total personnel by category group
SELECT 
  CASE 
    WHEN c.name = 'Guard' THEN 'Guards'
    WHEN c.name IN ('Gunman', 'Rifleman', 'PSO') THEN 'Gunman Personnel'
    WHEN c.name = 'Bouncer' THEN 'Bouncers'
    WHEN c.name IN ('Housekeeping', 'Sweeper', 'Gardener') THEN 'Helpers/Housekeeping'
  END as category_group,
  COUNT(p.id) as personnel_count
FROM workforce_categories c
LEFT JOIN workforce_personnel p ON p.category_id = c.id
GROUP BY category_group
ORDER BY category_group;

-- ============================================================================
-- CLEANUP (Run this if you want to remove test data)
-- ============================================================================

/*
-- Uncomment to delete all test data

DELETE FROM workforce_attendance WHERE id LIKE 'attendance-%';
DELETE FROM workforce_personnel WHERE id LIKE 'guard-%' OR id LIKE 'gunman-%' OR id LIKE 'bouncer-%' OR id LIKE 'helper-%';
DELETE FROM users WHERE id LIKE 'user-guard-%' OR id LIKE 'user-gunman-%' OR id LIKE 'user-bouncer-%' OR id LIKE 'user-helper-%';
DELETE FROM workforce_categories WHERE id LIKE 'cat-%';
*/
