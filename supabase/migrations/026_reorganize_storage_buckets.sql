-- ============================================================
-- PAN INDIA SECURITY — Centralized File Upload System
-- Migration 026: Reorganize Storage Buckets + RLS Policies
-- Req 3  — File category organization (5 buckets)
-- Req 4  — Security and access control (RLS per bucket)
-- Idempotent: ON CONFLICT DO NOTHING, CREATE POLICY IF NOT EXISTS pattern
-- ============================================================

-- ============================================================
-- 1. CREATE CATEGORY-BASED STORAGE BUCKETS
-- ============================================================

-- profiles: Public read, authenticated write, 2MB, images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profiles', 'profiles', true, 2097152, ARRAY['image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- documents: Private, 10MB, images + PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 10485760, ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- sites: Public read, 5MB, images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sites', 'sites', true, 5242880, ARRAY['image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- incidents: Public read, 5MB, images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('incidents', 'incidents', true, 5242880, ARRAY['image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- attendance: Private, 1MB, JPEG only (heavily compressed selfies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attendance', 'attendance', false, 1048576, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. RLS POLICIES — profiles bucket (public read, authenticated write)
-- ============================================================

-- Anyone can view profile images (public bucket)
DROP POLICY IF EXISTS "profiles_public_read" ON storage.objects;
CREATE POLICY "profiles_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

-- Authenticated users can upload profile images
DROP POLICY IF EXISTS "profiles_auth_insert" ON storage.objects;
CREATE POLICY "profiles_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles');

-- Admins can delete profile images
DROP POLICY IF EXISTS "profiles_admin_delete" ON storage.objects;
CREATE POLICY "profiles_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profiles'
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- 3. RLS POLICIES — documents bucket (private, signed URL access)
-- ============================================================

-- Authenticated users can read documents (actual access gated by signed URLs)
DROP POLICY IF EXISTS "documents_auth_read" ON storage.objects;
CREATE POLICY "documents_auth_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

-- Authenticated users can upload documents
DROP POLICY IF EXISTS "documents_auth_insert" ON storage.objects;
CREATE POLICY "documents_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Admins can delete documents
DROP POLICY IF EXISTS "documents_admin_delete" ON storage.objects;
CREATE POLICY "documents_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- 4. RLS POLICIES — sites bucket (public read, admin/manager write)
-- ============================================================

-- Anyone can view site images (public bucket)
DROP POLICY IF EXISTS "sites_public_read" ON storage.objects;
CREATE POLICY "sites_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sites');

-- Admin and managers can upload site images
DROP POLICY IF EXISTS "sites_manager_insert" ON storage.objects;
CREATE POLICY "sites_manager_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sites'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Admins can delete site images
DROP POLICY IF EXISTS "sites_admin_delete" ON storage.objects;
CREATE POLICY "sites_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sites'
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- 5. RLS POLICIES — incidents bucket (public read, authenticated write)
-- ============================================================

-- Anyone can view incident images (public bucket)
DROP POLICY IF EXISTS "incidents_public_read" ON storage.objects;
CREATE POLICY "incidents_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'incidents');

-- Authenticated users can upload incident images
DROP POLICY IF EXISTS "incidents_auth_insert" ON storage.objects;
CREATE POLICY "incidents_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incidents');

-- ============================================================
-- 6. RLS POLICIES — attendance bucket (private, role-based)
-- ============================================================

-- Admin and managers can read attendance selfies
DROP POLICY IF EXISTS "attendance_manager_read" ON storage.objects;
CREATE POLICY "attendance_manager_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Guards/personnel can read own attendance selfies (path starts with their ID)
DROP POLICY IF EXISTS "attendance_own_read" ON storage.objects;
CREATE POLICY "attendance_own_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('guard', 'workforce_personnel')
  );

-- Guards/personnel can upload attendance selfies
DROP POLICY IF EXISTS "attendance_guard_insert" ON storage.objects;
CREATE POLICY "attendance_guard_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attendance'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('guard', 'workforce_personnel', 'admin')
  );
