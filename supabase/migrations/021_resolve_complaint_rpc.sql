-- =============================================================================
-- Migration 021: Resolve Complaint Atomic RPC
-- =============================================================================
-- Guarantees atomic resolution of complaints, computing time_to_resolve_seconds
-- and inserting the resolution comment in a single transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION resolve_complaint(
  p_complaint_id UUID,
  p_resolution_note TEXT,
  p_author_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
  v_diff BIGINT;
BEGIN
  -- Get complaint created_at
  SELECT created_at INTO v_created_at 
    FROM complaints 
   WHERE id = p_complaint_id;
   
  IF v_created_at IS NULL THEN
    RAISE EXCEPTION 'Complaint with ID % not found', p_complaint_id;
  END IF;

  -- Compute diff in seconds
  v_diff := EXTRACT(EPOCH FROM (NOW() - v_created_at))::BIGINT;

  -- Update complaint status and resolution details
  UPDATE complaints
     SET status = 'resolved',
         resolved_at = NOW(),
         time_to_resolve_seconds = v_diff,
         updated_at = NOW()
   WHERE id = p_complaint_id;

  -- Insert atomic resolution comment
  INSERT INTO complaint_comments (complaint_id, author_id, comment_text, action_taken)
  VALUES (p_complaint_id, p_author_id, p_resolution_note, 'Complaint Resolved');
END;
$$;
