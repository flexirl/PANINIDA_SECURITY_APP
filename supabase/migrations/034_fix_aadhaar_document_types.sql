-- =============================================================================
-- Migration 034: Fix Aadhaar Document Types for Client Module
-- =============================================================================
-- Problem: Aadhaar front/back images uploaded by admin/guard module are not
-- visible in the client module because:
-- 1. guard_documents CHECK constraint only allows 'aadhaar' (not front/back)
-- 2. workforce_documents RLS policy for client_user doesn't include
--    'aadhaar_front' and 'aadhaar_back' document types
-- 3. The guard backend function validates only 'aadhaar' as document_type
--
-- Fix:
-- a) Alter guard_documents CHECK to accept 'aadhaar_front', 'aadhaar_back'
-- b) Update workforce_documents RLS to permit client_user reading aadhaar_front/back
-- c) Migrate existing guard_documents rows: split 'aadhaar' into front/back
-- =============================================================================

-- ─── Step 1: Update guard_documents CHECK constraint ───
-- Drop old constraint and add new one that includes aadhaar_front, aadhaar_back
ALTER TABLE guard_documents DROP CONSTRAINT IF EXISTS guard_documents_document_type_check;
ALTER TABLE guard_documents ADD CONSTRAINT guard_documents_document_type_check
  CHECK (document_type IN (
    'aadhaar', 'aadhaar_front', 'aadhaar_back',
    'pan', 'photo', 'police_verification', 'address_proof', 'other'
  ));

-- ─── Step 2: Update workforce_documents RLS policy for client_user ───
-- Drop the old policy and recreate with aadhaar_front and aadhaar_back included
DROP POLICY IF EXISTS wd_client_read ON workforce_documents;
CREATE POLICY wd_client_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    document_type IN (
      'aadhaar', 'aadhaar_front', 'aadhaar_back',
      'pan', 'address_proof',
      'police_verification',
      'security_training', 'security_training_certificate',
      'weapon_training', 'weapon_training_certificate',
      'gun_license', 'ex_servicemen_proof'
    ) AND
    personnel_id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id = current_user_site_id() AND sa.is_active = true
    )
  );

-- ─── Step 3: Migrate existing guard_documents 'aadhaar' rows to front/back ───
-- For guards that have exactly 2 'aadhaar' documents, map them to front/back
-- based on document_name or upload order
DO $$
DECLARE
  guard_rec RECORD;
  doc_rec RECORD;
  doc_count INT;
  idx INT;
BEGIN
  -- Find all guards with 'aadhaar' documents
  FOR guard_rec IN
    SELECT DISTINCT guard_id FROM guard_documents WHERE document_type = 'aadhaar'
  LOOP
    idx := 0;
    doc_count := (SELECT COUNT(*) FROM guard_documents WHERE guard_id = guard_rec.guard_id AND document_type = 'aadhaar');
    
    FOR doc_rec IN
      SELECT id, document_name, document_url
      FROM guard_documents
      WHERE guard_id = guard_rec.guard_id AND document_type = 'aadhaar'
      ORDER BY uploaded_at ASC
    LOOP
      IF doc_count = 1 THEN
        -- Single aadhaar doc: check name for hints, default to front
        IF LOWER(COALESCE(doc_rec.document_name, '')) LIKE '%back%' THEN
          UPDATE guard_documents SET document_type = 'aadhaar_back' WHERE id = doc_rec.id;
        ELSE
          UPDATE guard_documents SET document_type = 'aadhaar_front' WHERE id = doc_rec.id;
        END IF;
      ELSIF doc_count = 2 THEN
        -- Two aadhaar docs: check names, or default first=front, second=back
        IF LOWER(COALESCE(doc_rec.document_name, '')) LIKE '%back%' THEN
          UPDATE guard_documents SET document_type = 'aadhaar_back' WHERE id = doc_rec.id;
        ELSIF LOWER(COALESCE(doc_rec.document_name, '')) LIKE '%front%' THEN
          UPDATE guard_documents SET document_type = 'aadhaar_front' WHERE id = doc_rec.id;
        ELSE
          -- Use order: first uploaded = front, second = back
          IF idx = 0 THEN
            UPDATE guard_documents SET document_type = 'aadhaar_front' WHERE id = doc_rec.id;
          ELSE
            UPDATE guard_documents SET document_type = 'aadhaar_back' WHERE id = doc_rec.id;
          END IF;
        END IF;
      ELSE
        -- More than 2: just use order (front, back, then leave rest)
        IF idx = 0 THEN
          UPDATE guard_documents SET document_type = 'aadhaar_front' WHERE id = doc_rec.id;
        ELSIF idx = 1 THEN
          UPDATE guard_documents SET document_type = 'aadhaar_back' WHERE id = doc_rec.id;
        END IF;
        -- Leave remaining as 'aadhaar'
      END IF;
      
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- ─── Step 4: Add guard_documents RLS policy for client_user ───
-- Client users need to read guard_documents for personnel assigned to their site.
-- Without this policy, the clientPortalService query to guard_documents returns empty.
DROP POLICY IF EXISTS client_guard_docs_read ON guard_documents;
CREATE POLICY client_guard_docs_read ON guard_documents FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'client_user' AND
    document_type IN (
      'aadhaar', 'aadhaar_front', 'aadhaar_back',
      'pan', 'address_proof', 'police_verification'
    ) AND
    guard_id IN (
      SELECT gsa.guard_id FROM guard_site_assignments gsa
      WHERE gsa.site_id = current_user_site_id() AND gsa.is_active = true
    )
  );

-- Also allow workforce_personnel role to read guard_documents (backward compat)
DROP POLICY IF EXISTS workforce_guard_docs_read ON guard_documents;
CREATE POLICY workforce_guard_docs_read ON guard_documents FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'workforce_personnel' AND
    guard_id = public.get_guard_id()
  );
