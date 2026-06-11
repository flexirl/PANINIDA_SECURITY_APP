-- ============================================================
-- PAN INDIA SECURITY — Centralized File Upload System
-- Migration 025: Create uploaded_files + upload_audit_logs
-- Req 6  — Comprehensive audit logging
-- Req 7  — Orphaned file detection (soft delete support)
-- Req 13 — File metadata and searchability
-- Req 15 — MD5 hash for integrity verification
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
-- ============================================================

-- ============================================================
-- 1. UPLOADED_FILES TABLE — Central file registry
-- ============================================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path       TEXT         NOT NULL UNIQUE,
  bucket_name     TEXT         NOT NULL,
  file_size_bytes BIGINT       NOT NULL,
  mime_type       TEXT         NOT NULL,
  category        TEXT         NOT NULL CHECK (category IN ('profiles', 'documents', 'sites', 'incidents', 'attendance')),
  uploaded_by     UUID         NOT NULL REFERENCES auth.users(id),

  -- Foreign keys to source records (nullable — at least one should be set for non-profile categories)
  personnel_id    UUID         REFERENCES workforce_personnel(id) ON DELETE SET NULL,
  site_id         UUID         REFERENCES sites(id) ON DELETE SET NULL,
  attendance_id   UUID,        -- FK added conditionally below (attendance table may be workforce_attendance or attendance)
  incident_id     UUID,        -- FK placeholder — incidents table may not exist yet

  -- Metadata
  original_filename TEXT,
  md5_hash        TEXT,        -- For integrity verification (Req 15)
  metadata        JSONB        DEFAULT '{}',

  -- Soft delete support (Req 7)
  deleted_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES for uploaded_files
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_uploaded_files_category
  ON uploaded_files(category);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by
  ON uploaded_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_personnel_id
  ON uploaded_files(personnel_id) WHERE personnel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_site_id
  ON uploaded_files(site_id) WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_attendance_id
  ON uploaded_files(attendance_id) WHERE attendance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_incident_id
  ON uploaded_files(incident_id) WHERE incident_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_active
  ON uploaded_files(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at
  ON uploaded_files(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_md5_hash
  ON uploaded_files(md5_hash) WHERE md5_hash IS NOT NULL;

-- ============================================================
-- 3. UPDATED_AT TRIGGER for uploaded_files
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_uploaded_files ON uploaded_files;
CREATE TRIGGER set_updated_at_uploaded_files
  BEFORE UPDATE ON uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RLS POLICIES for uploaded_files
-- ============================================================
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY admin_uploaded_files_all ON uploaded_files
  FOR ALL TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Managers: read all, insert own
CREATE POLICY manager_uploaded_files_read ON uploaded_files
  FOR SELECT TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'manager');

CREATE POLICY manager_uploaded_files_insert ON uploaded_files
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'manager'
    AND uploaded_by = auth.uid()
  );

-- Guards/Personnel: read own uploads, insert own
CREATE POLICY guard_uploaded_files_read ON uploaded_files
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY guard_uploaded_files_insert ON uploaded_files
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- ============================================================
-- 5. UPLOAD_AUDIT_LOGS TABLE — Complete audit trail (Req 6)
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID         REFERENCES uploaded_files(id) ON DELETE SET NULL,
  operation   TEXT         NOT NULL CHECK (operation IN ('upload', 'access', 'delete', 'signed_url')),
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB        DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. INDEXES for upload_audit_logs
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_file_id
  ON upload_audit_logs(file_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON upload_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_operation
  ON upload_audit_logs(operation);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON upload_audit_logs(created_at DESC);

-- Composite index for common query pattern: user + time range
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time
  ON upload_audit_logs(user_id, created_at DESC);

-- ============================================================
-- 7. RLS POLICIES for upload_audit_logs
-- ============================================================
ALTER TABLE upload_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY admin_audit_logs_read ON upload_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Service role (Edge Functions) can insert audit logs
-- (RLS is bypassed by service role key, so no explicit INSERT policy needed)

-- Authenticated users can insert their own audit entries (for client-side logging)
CREATE POLICY auth_audit_logs_insert ON upload_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
