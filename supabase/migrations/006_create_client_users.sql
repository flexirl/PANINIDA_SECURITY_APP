-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 006: Create client_users table
-- Req 3.9 — Client portal user accounts linked to a single site
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--             DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================

-- ============================================================
-- 1. CLIENT_USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS client_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) UNIQUE,
  site_id     UUID        NOT NULL REFERENCES sites(id),
  client_role VARCHAR(30) NOT NULL
                CHECK (client_role IN (
                  'society_president',
                  'society_secretary',
                  'facility_manager'
                )),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of all client users for a given site
CREATE INDEX IF NOT EXISTS idx_client_users_site
  ON client_users (site_id);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_client_users ON client_users;
CREATE TRIGGER set_updated_at_client_users
  BEFORE UPDATE ON client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
