-- ============================================================
-- PAN INDIA SECURITY
-- Migration 036: Inspections Data Retention (1 Week)
-- ============================================================

-- Function to clean up old inspections and their associated photos
CREATE OR REPLACE FUNCTION clean_old_inspections()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    photo_url TEXT;
    photo_path TEXT;
BEGIN
    -- Iterate over all inspections older than 7 days
    FOR r IN SELECT id, photos FROM inspections WHERE created_at < NOW() - INTERVAL '7 days' LOOP
        -- Delete photos from storage.objects to free storage
        IF r.photos IS NOT NULL AND array_length(r.photos, 1) > 0 THEN
            FOREACH photo_url IN ARRAY r.photos LOOP
                -- Extract the object path from the public URL.
                -- URL format: .../storage/v1/object/public/inspection-photos/path/to/file.jpg
                photo_path := substring(photo_url from 'inspection-photos/(.*)');
                IF photo_path IS NOT NULL THEN
                    DELETE FROM storage.objects 
                    WHERE bucket_id = 'inspection-photos' AND name = photo_path;
                END IF;
            END LOOP;
        END IF;

        -- Delete the inspection record itself
        DELETE FROM inspections WHERE id = r.id;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger to run cleanup after every insert
DROP TRIGGER IF EXISTS trigger_clean_old_inspections ON inspections;
CREATE TRIGGER trigger_clean_old_inspections
AFTER INSERT ON inspections
FOR EACH STATEMENT
EXECUTE FUNCTION clean_old_inspections();
