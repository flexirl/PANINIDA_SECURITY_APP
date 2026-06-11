-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 003: Create workforce_personnel table + functions
-- Req 1.7 — Personnel table with all required columns
-- Req 1.6, 1.9, 7.2 — Employee ID generator with advisory lock
-- Req 14.4 (design) — Immutable employee_id after assignment
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
--             DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================

-- ============================================================
-- 1. WORKFORCE_PERSONNEL TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workforce_personnel (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID         REFERENCES users(id),
  category_id             UUID         NOT NULL REFERENCES workforce_categories(id),
  employee_id             VARCHAR(20)  NOT NULL,
  name                    VARCHAR(255) NOT NULL,
  phone                   VARCHAR(15),
  photo_url               TEXT,
  base_salary             DECIMAL(10,2) NOT NULL DEFAULT 0,
  joining_date            DATE,
  shift_type              VARCHAR(20)  CHECK (shift_type IN ('day', 'night', 'rotational')),
  employment_status       VARCHAR(20)  NOT NULL DEFAULT 'active'
                            CHECK (employment_status IN ('active', 'inactive', 'terminated')),
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(15),
  bank_account_number     VARCHAR(20),
  bank_ifsc               VARCHAR(11),
  bank_name               VARCHAR(100),
  aadhaar_number          VARCHAR(12),
  pan_number              VARCHAR(10),
  address                 TEXT,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Req 7.4: No two personnel share the same employee_id
  CONSTRAINT uq_employee_id UNIQUE (employee_id)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workforce_personnel_category
  ON workforce_personnel (category_id);

CREATE INDEX IF NOT EXISTS idx_workforce_personnel_status
  ON workforce_personnel (employment_status);

CREATE INDEX IF NOT EXISTS idx_workforce_personnel_employee_id
  ON workforce_personnel (employee_id);

-- ============================================================
-- 3. IMMUTABLE EMPLOYEE_ID TRIGGER FUNCTION
-- Req 7.6: Prevent manual editing of employee_id after assignment
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_employee_id_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.employee_id IS DISTINCT FROM NEW.employee_id THEN
    RAISE EXCEPTION 'employee_id cannot be modified after assignment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_employee_id ON workforce_personnel;
CREATE TRIGGER trg_immutable_employee_id
  BEFORE UPDATE ON workforce_personnel
  FOR EACH ROW
  EXECUTE FUNCTION prevent_employee_id_update();

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_workforce_personnel ON workforce_personnel;
CREATE TRIGGER set_updated_at_workforce_personnel
  BEFORE UPDATE ON workforce_personnel
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. EMPLOYEE ID GENERATOR FUNCTION
-- Req 1.6, 1.9, 7.2 — Unique, category-prefixed, zero-padded
-- Uses pg_advisory_xact_lock to prevent concurrent duplicates
-- Expands beyond 9999 without truncation (e.g., PIS-10000)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_employee_id(p_category_id UUID)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE
  v_prefix      VARCHAR(5);
  v_next_seq    INT;
  v_employee_id VARCHAR(20);
  v_lock_key    BIGINT;
BEGIN
  -- Resolve the prefix code for this category
  SELECT prefix_code INTO v_prefix
    FROM workforce_categories
   WHERE id = p_category_id;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Category not found: %', p_category_id;
  END IF;

  -- Acquire a transaction-scoped advisory lock keyed to this category
  -- to prevent concurrent inserts from generating the same sequence number
  v_lock_key := hashtext(p_category_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Find the highest existing sequence number for this category
  -- SPLIT_PART extracts the numeric portion after the '-' separator
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(employee_id, '-', 2) AS INT)),
    0
  ) + 1
  INTO v_next_seq
  FROM workforce_personnel
  WHERE category_id = p_category_id;

  -- Req 7.2: Zero-pad to 4 digits; expand naturally beyond 9999
  IF v_next_seq <= 9999 THEN
    v_employee_id := v_prefix || '-' || LPAD(v_next_seq::TEXT, 4, '0');
  ELSE
    v_employee_id := v_prefix || '-' || v_next_seq::TEXT;
  END IF;

  RETURN v_employee_id;
END;
$$;
