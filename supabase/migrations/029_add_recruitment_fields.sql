-- ============================================================
-- Migration 029: Add Recruitment Fields (gender, date_of_birth, police_verification, height, weight, education)
-- ============================================================

-- Add gender and date_of_birth to legacy guards table
ALTER TABLE guards ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE guards ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add gender, date_of_birth, police_verification, height, weight, and education to workforce_personnel table
ALTER TABLE workforce_personnel ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE workforce_personnel ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE workforce_personnel ADD COLUMN IF NOT EXISTS police_verification BOOLEAN DEFAULT false;
ALTER TABLE workforce_personnel ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
ALTER TABLE workforce_personnel ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);
ALTER TABLE workforce_personnel ADD COLUMN IF NOT EXISTS education VARCHAR(100);

-- Recreate compatibility view to include the new fields
CREATE OR REPLACE VIEW guards_compat_view AS
  SELECT
    wp.id,
    wp.user_id,
    wp.aadhaar_number,
    wp.pan_number,
    wp.address,
    wp.photo_url,
    wp.height,
    wp.weight,
    wp.education,
    wp.police_verification,
    wp.base_salary,
    wp.joining_date,
    wp.shift_type,
    wp.emergency_contact_name,
    wp.emergency_contact_phone,
    wp.bank_account_number,
    wp.bank_ifsc,
    wp.bank_name,
    wp.employment_status,
    wp.created_at,
    wp.gender,
    wp.date_of_birth
  FROM workforce_personnel wp
  JOIN workforce_categories wc ON wp.category_id = wc.id
  WHERE wc.prefix_code = 'PIS';
