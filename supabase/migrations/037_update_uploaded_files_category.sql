-- ============================================================
-- PAN INDIA SECURITY
-- Migration 037: Update uploaded_files category constraint
-- Allows 'inspections' as a valid file category
-- ============================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Drop all existing check constraints on uploaded_files table
    FOR rec IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'uploaded_files'::regclass AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE uploaded_files DROP CONSTRAINT ' || quote_ident(rec.conname);
    END LOOP;
END $$;

-- Add new constraint with 'inspections' included
ALTER TABLE uploaded_files 
  ADD CONSTRAINT uploaded_files_category_check 
  CHECK (category IN ('profiles', 'documents', 'sites', 'incidents', 'attendance', 'inspections'));
