-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 004: Extend sites table with new columns
-- Req 2.1 — Add 8 new columns for facility management
-- Idempotent: ADD COLUMN IF NOT EXISTS for each column
-- ============================================================

-- Society / client contact details
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS site_type               VARCHAR(50);

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS society_president_name  VARCHAR(255);

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS society_president_phone VARCHAR(15);

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS society_secretary_name  VARCHAR(255);

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS society_secretary_phone VARCHAR(15);

-- Internal management references
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS site_manager_id         UUID REFERENCES users(id);

-- Assigned supervisor from workforce_personnel (Req 2.1)
-- NOTE: workforce_personnel table must exist before this runs (migration 003)
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS assigned_supervisor_id  UUID REFERENCES workforce_personnel(id);

-- Configured headcount for vacancy calculation (Req 2.3, 2.7)
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS workforce_strength      INT;
