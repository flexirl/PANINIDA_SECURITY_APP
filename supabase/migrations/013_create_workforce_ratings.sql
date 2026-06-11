-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 013: Create workforce_ratings table
-- Req 3.7 — Client Portal shows average rating, appreciation count,
--            open complaint count, and date of last review per personnel
-- Ratings are immutable once submitted — no updated_at column or trigger.
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
-- ============================================================

-- ============================================================
-- 1. WORKFORCE_RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workforce_ratings (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id  UUID           NOT NULL REFERENCES workforce_personnel(id),
  site_id       UUID           NOT NULL REFERENCES sites(id),
  rated_by      UUID           NOT NULL REFERENCES users(id),
  rating        DECIMAL(2,1)   NOT NULL
                  CHECK (rating >= 0 AND rating <= 5),  -- 0.0 – 5.0 star scale
  review_text   TEXT,                                    -- optional written review
  appreciation  BOOLEAN        NOT NULL DEFAULT false,   -- positive recognition flag
  review_date   DATE           NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
  -- No updated_at: ratings are immutable once submitted
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Fast lookup of all ratings for a given personnel member
-- (used by Client Portal performance overview — Req 3.7)
CREATE INDEX IF NOT EXISTS idx_workforce_ratings_personnel
  ON workforce_ratings (personnel_id);
