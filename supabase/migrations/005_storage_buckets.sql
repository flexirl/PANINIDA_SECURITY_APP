-- ============================================================
-- PAN INDIA SECURITY — Storage Buckets & Policies
-- Migration 005
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('guard-documents', 'guard-documents', false, 5242880, ARRAY['image/jpeg','image/png','application/pdf']),
    ('attendance-selfies', 'attendance-selfies', false, 2097152, ARRAY['image/jpeg','image/png']),
    ('inspection-photos', 'inspection-photos', false, 5242880, ARRAY['image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- Admin: full access to guard-documents
CREATE POLICY admin_guard_docs ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'guard-documents' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
    WITH CHECK (bucket_id = 'guard-documents' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Admin: read attendance-selfies
CREATE POLICY admin_selfies ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'attendance-selfies' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Guard: upload selfies
CREATE POLICY guard_selfies_up ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'attendance-selfies' AND (SELECT role FROM users WHERE id = auth.uid()) = 'guard');

-- Guard: read own selfies
CREATE POLICY guard_selfies_read ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'attendance-selfies' AND (SELECT role FROM users WHERE id = auth.uid()) = 'guard');

-- Admin: read inspection-photos
CREATE POLICY admin_insp_photos ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-photos' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Manager: full access to inspection-photos
CREATE POLICY manager_insp_photos ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'inspection-photos' AND (SELECT role FROM users WHERE id = auth.uid()) = 'manager')
    WITH CHECK (bucket_id = 'inspection-photos' AND (SELECT role FROM users WHERE id = auth.uid()) = 'manager');
