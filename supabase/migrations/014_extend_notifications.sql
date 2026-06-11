-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 014: Extend notifications table with new notification types
-- Req 13.1 — complaint_raised: notify Supervisor on new Level 1 complaint
-- Req 13.2 — complaint_escalated_l2: notify Site Manager & Ops Manager
-- Req 13.3 — complaint_escalated_l3: notify Admin & Super_Admin (Critical)
-- Req 13.4 — replacement_assigned: notify Client_User when replacement set
-- Req 13.5 — vacancy_escalated: notify Ops Manager when vacancy > 2 hours
-- Idempotent: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING TYPE CHECK CONSTRAINT
-- ============================================================
-- Remove the old constraint so we can replace it with the extended version.
-- IF NOT EXISTS is not supported for DROP CONSTRAINT, so we use IF EXISTS.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- ============================================================
-- 2. ADD EXTENDED TYPE CHECK CONSTRAINT
-- ============================================================
-- Original types (preserved for backward compatibility):
--   shift_reminder, attendance_alert, salary_generated,
--   inspection_reminder, recruitment_update, general
--
-- New types added in this migration (Req 13.1–13.5):
--   complaint_raised         — new Level 1 complaint raised at a site
--   complaint_escalated_l2   — complaint escalated to Level 2
--   complaint_escalated_l3   — complaint escalated to Level 3 (Critical Issue)
--   replacement_assigned     — replacement personnel assigned for a vacancy
--   vacancy_escalated        — vacancy unfilled for > 2 hours, Ops Manager notified
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    -- Original types
    'shift_reminder',
    'attendance_alert',
    'salary_generated',
    'inspection_reminder',
    'recruitment_update',
    'general',
    -- New types added for Workforce & Facility Management (Migration 014)
    'complaint_raised',
    'complaint_escalated_l2',
    'complaint_escalated_l3',
    'replacement_assigned',
    'vacancy_escalated'
  ));
