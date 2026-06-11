-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 011: Create workforce_documents table
-- Req 6.5 — Document storage per workforce_personnel
-- Req 6.7 — Verification tracking (verified_by, verified_at)
-- Req 6.10 — RLS enforced on this table (see migration 003 / RLS phase)
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================

-- ============================================================
-- 1. WORKFORCE_DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workforce_documents (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id  UUID         NOT NULL REFERENCES workforce_personnel(id),
  document_type VARCHAR(100) NOT NULL,
  file_url      TEXT         NOT NULL,
  uploaded_by   UUID         NOT NULL REFERENCES users(id),
  verified      BOOLEAN      NOT NULL DEFAULT false,
  verified_by   UUID         REFERENCES users(id),   -- nullable: set when Admin verifies
  verified_at   TIMESTAMPTZ,                          -- nullable: set when Admin verifies
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- One document per type per person (Req 6.5)
  CONSTRAINT uq_personnel_document_type UNIQUE (personnel_id, document_type)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of all documents for a given personnel member
CREATE INDEX IF NOT EXISTS idx_workforce_documents_personnel
  ON workforce_documents (personnel_id);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_workforce_documents ON workforce_documents;
CREATE TRIGGER set_updated_at_workforce_documents
  BEFORE UPDATE ON workforce_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
