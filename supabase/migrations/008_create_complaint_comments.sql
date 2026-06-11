-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 008: Create complaint_comments table
-- Req 4.5  — Immutable complaint timeline
-- Req 14.2 — No UPDATE or DELETE permitted on this table
--
-- IMPORTANT: This table is APPEND-ONLY (immutable).
-- No updated_at column is present by design.
-- No UPDATE or DELETE RLS policies will ever be created for
-- this table. Once a comment row is inserted it is permanent,
-- preserving the full audit trail of complaint activity.
-- ============================================================

-- ============================================================
-- 1. COMPLAINT_COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID        NOT NULL REFERENCES complaints(id),
  author_id    UUID        NOT NULL REFERENCES users(id),
  comment_text TEXT        NOT NULL,
  action_taken VARCHAR(100),
  -- No updated_at column: this table is append-only (immutable per Req 14.2)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Composite index on (complaint_id, created_at ASC) supports
-- ordered timeline retrieval (Req 4.8) efficiently
CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint
  ON complaint_comments (complaint_id, created_at ASC);
