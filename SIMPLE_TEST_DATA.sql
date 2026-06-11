-- ============================================================================
-- SIMPLE TEST DATA - Works with Supabase UUID constraints
-- ============================================================================
-- This creates a smaller test dataset that's easier to manage
-- Run this after QUICK_START_CATEGORIES.sql
-- ============================================================================

-- First, make sure categories exist
INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined)
VALUES 
  ('Guard', 'PIS', true, true),
  ('Gunman', 'GM', true, true),
  ('Bouncer', 'BNC', true, true),
  ('Housekeeping', 'HK', false, true)
ON CONFLICT (name) DO NOTHING;

-- Get category IDs and create test data
DO $$
DECLARE
  cat_guard UUID;
  cat_gunman UUID;
  cat_bouncer UUID;
  cat_housekeeping UUID;
  user_id UUID;
  personnel_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_guard FROM workforce_categories WHERE name = 'Guard';
  SELECT id INTO cat_gunman FROM workforce_categories WHERE name = 'Gunman';
  SELECT id INTO cat_bouncer FROM workforce_categories WHERE name = 'Bouncer';
  SELECT id INTO cat_housekeeping FROM workforce_categories WHERE name = 'Housekeeping';

  -- Create 5 Guards
  FOR i IN 1..5 LOOP
    INSERT INTO users (name, phone, role, is_active)
    VALUES ('Guard ' || i, '+91987654' || LPAD(i::text, 4, '0'), 'workforce_personnel', true)
    RETURNING id INTO user_id;

    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone,
      base_salary, joining_date, shift_type, employment_status
    )
    VALUES (
      user_id, cat_guard, 'PIS-' || LPAD(i::text, 3, '0'), 'Guard ' || i, '+91987654' || LPAD(i::text, 4, '0'),
      18000, '2023-01-15'::DATE, 'day', 'active'
    )
    RETURNING id INTO personnel_id;

    -- Add attendance
    INSERT INTO workforce_attendance (personnel_id, attendance_date, status, shift_type, is_manual_entry)
    VALUES (personnel_id, CURRENT_DATE, CASE WHEN i % 3 = 0 THEN 'absent' ELSE 'present' END, 'day', false);
  END LOOP;

  -- Create 3 Gunmen
  FOR i IN 1..3 LOOP
    INSERT INTO users (name, phone, role, is_active)
    VALUES ('Gunman ' || i, '+91987655' || LPAD(i::text, 4, '0'), 'workforce_personnel', true)
    RETURNING id INTO user_id;

    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone,
      base_salary, joining_date, shift_type, employment_status
    )
    VALUES (
      user_id, cat_gunman, 'GM-' || LPAD(i::text, 3, '0'), 'Gunman ' || i, '+91987655' || LPAD(i::text, 4, '0'),
      25000, '2023-02-01'::DATE, 'day', 'active'
    )
    RETURNING id INTO personnel_id;

    INSERT INTO workforce_attendance (personnel_id, attendance_date, status, shift_type, is_manual_entry)
    VALUES (personnel_id, CURRENT_DATE, 'present', 'day', false);
  END LOOP;

  -- Create 2 Bouncers
  FOR i IN 1..2 LOOP
    INSERT INTO users (name, phone, role, is_active)
    VALUES ('Bouncer ' || i, '+91987656' || LPAD(i::text, 4, '0'), 'workforce_personnel', true)
    RETURNING id INTO user_id;

    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone,
      base_salary, joining_date, shift_type, employment_status
    )
    VALUES (
      user_id, cat_bouncer, 'BNC-' || LPAD(i::text, 3, '0'), 'Bouncer ' || i, '+91987656' || LPAD(i::text, 4, '0'),
      22000, '2023-03-01'::DATE, 'night', 'active'
    )
    RETURNING id INTO personnel_id;

    INSERT INTO workforce_attendance (personnel_id, attendance_date, status, shift_type, is_manual_entry)
    VALUES (personnel_id, CURRENT_DATE, 'present', 'night', false);
  END LOOP;

  -- Create 2 Housekeeping
  FOR i IN 1..2 LOOP
    INSERT INTO users (name, phone, role, is_active)
    VALUES ('Housekeeping ' || i, '+91987657' || LPAD(i::text, 4, '0'), 'workforce_personnel', true)
    RETURNING id INTO user_id;

    INSERT INTO workforce_personnel (
      user_id, category_id, employee_id, name, phone,
      base_salary, joining_date, shift_type, employment_status
    )
    VALUES (
      user_id, cat_housekeeping, 'HK-' || LPAD(i::text, 3, '0'), 'Housekeeping ' || i, '+91987657' || LPAD(i::text, 4, '0'),
      15000, '2023-04-01'::DATE, 'day', 'active'
    )
    RETURNING id INTO personnel_id;

    INSERT INTO workforce_attendance (personnel_id, attendance_date, status, shift_type, is_manual_entry)
    VALUES (personnel_id, CURRENT_DATE, 'present', 'day', false);
  END LOOP;

  RAISE NOTICE 'Created 12 test personnel (5 Guards, 3 Gunmen, 2 Bouncers, 2 Housekeeping)';
END $$;

-- Verify
SELECT 
  c.name,
  COUNT(p.id) as count
FROM workforce_categories c
LEFT JOIN workforce_personnel p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;
