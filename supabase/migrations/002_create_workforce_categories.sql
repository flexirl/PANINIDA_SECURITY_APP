-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 002: Create workforce_categories table
-- Req 1.8, Req 7.1 — Category table with prefix codes
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             CREATE OR REPLACE TRIGGER (via DROP IF EXISTS + CREATE)
-- ============================================================

-- Create the workforce_categories table
CREATE TABLE IF NOT EXISTS workforce_categories (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,
  prefix_code         VARCHAR(5)   NOT NULL,
  attendance_required BOOLEAN      NOT NULL DEFAULT true,
  is_system_defined   BOOLEAN      NOT NULL DEFAULT false,
  created_by          UUID         REFERENCES users(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Req 1.4: Case-sensitive unique name (case-insensitive enforced via index below)
  CONSTRAINT uq_category_name   UNIQUE (name),
  -- Req 7.3: Unique prefix code per category
  CONSTRAINT uq_category_prefix UNIQUE (prefix_code),
  -- Req 7.3: Prefix must be 2–5 uppercase letters only
  CONSTRAINT chk_prefix_format  CHECK (prefix_code ~ '^[A-Z]{2,5}$')
);

-- Case-insensitive unique index on name to enforce Req 1.4 (duplicate name rejection)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workforce_categories_name_lower
  ON workforce_categories (LOWER(name));

-- Index for general name lookups
CREATE INDEX IF NOT EXISTS idx_workforce_categories_name
  ON workforce_categories (LOWER(name));

-- updated_at trigger — reuses the existing update_updated_at_column() function
-- Drop first to make this idempotent (CREATE TRIGGER has no IF NOT EXISTS in older PG)
DROP TRIGGER IF EXISTS set_updated_at_workforce_categories ON workforce_categories;
CREATE TRIGGER set_updated_at_workforce_categories
  BEFORE UPDATE ON workforce_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
