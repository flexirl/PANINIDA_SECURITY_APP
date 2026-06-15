-- Drop the old foreign key referencing the guards table
ALTER TABLE payroll DROP CONSTRAINT IF EXISTS payroll_guard_id_fkey;

-- Add the new foreign key referencing the workforce_personnel table
ALTER TABLE payroll ADD CONSTRAINT payroll_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES workforce_personnel(id) ON DELETE CASCADE;
