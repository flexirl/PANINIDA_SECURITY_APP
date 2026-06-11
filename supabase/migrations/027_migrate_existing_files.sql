-- ============================================================
-- PAN INDIA SECURITY — Centralized File Upload System
-- Migration 027: Migrate existing files to registry
-- Req 12.3 — Backward compatibility and migration of legacy files
-- ============================================================

DO $$
DECLARE
  obj RECORD;
  v_category TEXT;
  v_uploaded_by UUID;
  v_personnel_id UUID;
  v_document_type TEXT;
  v_orig_filename TEXT;
  v_file_record_id UUID;
  v_default_user_id UUID;
BEGIN
  -- Get a default fallback user ID (the first admin or user in auth.users)
  SELECT id INTO v_default_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- Iterate through objects in relevant buckets
  FOR obj IN 
    SELECT 
      id,
      bucket_id,
      name,
      owner,
      created_at,
      updated_at,
      metadata
    FROM storage.objects
    WHERE bucket_id IN (
      'profiles', 
      'documents', 
      'sites', 
      'incidents', 
      'attendance',
      'guard-documents',
      'workforce-documents',
      'attendance-selfies'
    )
  LOOP
    -- 1. Determine category
    CASE obj.bucket_id
      WHEN 'profiles' THEN v_category := 'profiles';
      WHEN 'sites' THEN v_category := 'sites';
      WHEN 'incidents' THEN v_category := 'incidents';
      WHEN 'attendance', 'attendance-selfies' THEN v_category := 'attendance';
      ELSE v_category := 'documents';
    END CASE;

    -- 2. Determine uploaded_by
    v_uploaded_by := COALESCE(obj.owner, v_default_user_id);
    IF v_uploaded_by IS NULL THEN
      -- If auth.users is completely empty, skip or generate a dummy UUID
      -- (Since uploaded_by is NOT NULL, we need a valid UUID)
      v_uploaded_by := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    -- 3. Reset matched fields
    v_personnel_id := NULL;
    v_document_type := NULL;
    v_orig_filename := split_part(obj.name, '/', cardinality(string_to_array(obj.name, '/')));

    -- 4. Try to find matching guard_documents record (legacy guards)
    SELECT guard_id, document_type, document_name 
    INTO v_personnel_id, v_document_type, v_orig_filename
    FROM public.guard_documents 
    WHERE document_url LIKE '%' || obj.name 
    LIMIT 1;

    -- 5. If not found, try to find matching workforce_documents record
    IF v_personnel_id IS NULL THEN
      SELECT personnel_id, document_type 
      INTO v_personnel_id, v_document_type
      FROM public.workforce_documents 
      WHERE file_url LIKE '%' || obj.name 
      LIMIT 1;
    END IF;

    -- 6. If still not found, try to extract personnel_id from path prefix if it is UUID
    IF v_personnel_id IS NULL THEN
      DECLARE
        path_parts TEXT[];
        potential_uuid_str TEXT;
      BEGIN
        path_parts := string_to_array(obj.name, '/');
        -- Case A: {uuid}/{documentType}/{filename} (workforce-documents structure)
        IF cardinality(path_parts) >= 3 THEN
          potential_uuid_str := path_parts[1];
        -- Case B: guards/{uuid}/{filename} (guard-documents structure)
        ELSIF cardinality(path_parts) >= 3 AND path_parts[1] = 'guards' THEN
          potential_uuid_str := path_parts[2];
        END IF;

        IF potential_uuid_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          v_personnel_id := potential_uuid_str::uuid;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          v_personnel_id := NULL;
      END;
    END IF;

    -- 7. Insert into uploaded_files if not already registered
    BEGIN
      INSERT INTO public.uploaded_files (
        file_path,
        bucket_name,
        file_size_bytes,
        mime_type,
        category,
        uploaded_by,
        personnel_id,
        original_filename,
        md5_hash,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        obj.name,
        obj.bucket_id,
        COALESCE((obj.metadata->>'size')::bigint, 0),
        COALESCE(obj.metadata->>'mimetype', 'application/octet-stream'),
        v_category,
        v_uploaded_by,
        v_personnel_id,
        v_orig_filename,
        NULL, -- MD5 hash not easily computed in SQL for old files, leaves as null
        jsonb_build_object(
          'migrated_at', NOW(),
          'legacy_storage_id', obj.id,
          'document_type', v_document_type
        ),
        obj.created_at,
        obj.updated_at
      )
      ON CONFLICT (file_path) DO NOTHING
      RETURNING id INTO v_file_record_id;

      -- 8. Create historical audit entry
      IF v_file_record_id IS NOT NULL THEN
        INSERT INTO public.upload_audit_logs (
          file_id,
          operation,
          user_id,
          ip_address,
          user_agent,
          metadata,
          created_at
        )
        VALUES (
          v_file_record_id,
          'upload',
          v_uploaded_by,
          '127.0.0.1',
          'system-migration',
          jsonb_build_object('action', 'legacy_migration'),
          obj.created_at
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to migrate storage object %: %', obj.name, SQLERRM;
    END;
  END LOOP;
END $$;
