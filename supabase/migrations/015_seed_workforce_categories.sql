-- ============================================================
-- PAN INDIA SECURITY — Workforce & Facility Management System
-- Migration 015: Seed system workforce categories
-- Req 1.2  — 19 system-defined Personnel_Categories
-- Req 5.1  — Attendance Required: Guard, Supervisor, Housekeeping,
--             Sweeper, Gardener, Electrician, Plumber, Carpenter,
--             Lift Operator, Pump Operator, Technician, Receptionist,
--             Office Assistant, Data Entry Operator, Security Officer
-- Req 5.2  — Attendance Optional: Gunman, Rifleman, PSO, Bouncer
-- Req 7.1  — Category-to-prefix mapping for Employee_ID generation
-- Idempotent: ON CONFLICT (name) DO NOTHING
-- ============================================================

-- ============================================================
-- 1. INSERT SYSTEM CATEGORIES
-- ============================================================
-- Columns: (name, prefix_code, attendance_required, is_system_defined)
--
-- Security personnel (armed / unarmed):
--   Guard        → PIS  (Attendance Required)
--   Gunman       → GM   (Attendance Optional — armed, deployed externally)
--   Rifleman     → RM   (Attendance Optional — armed, deployed externally)
--   PSO          → PSO  (Attendance Optional — Personal Security Officer)
--   Bouncer      → BNC  (Attendance Optional — event-based deployment)
--   Supervisor   → SUP  (Attendance Required)
--   Security Officer → SO (Attendance Required)
--
-- Facility / maintenance staff (all Attendance Required):
--   Housekeeping → HK
--   Sweeper      → SWP
--   Gardener     → GRD
--   Electrician  → ELE
--   Plumber      → PLM
--   Carpenter    → CRP
--   Lift Operator → LFT
--   Pump Operator → PMP
--   Technician   → TCH
--
-- Administrative staff (all Attendance Required):
--   Receptionist        → REC
--   Office Assistant    → OA
--   Data Entry Operator → DEO

INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined)
VALUES
  ('Guard',               'PIS', true,  true),
  ('Gunman',              'GM',  false, true),
  ('Rifleman',            'RM',  false, true),
  ('PSO',                 'PSO', false, true),
  ('Bouncer',             'BNC', false, true),
  ('Supervisor',          'SUP', true,  true),
  ('Security Officer',    'SO',  true,  true),
  ('Housekeeping',        'HK',  true,  true),
  ('Sweeper',             'SWP', true,  true),
  ('Gardener',            'GRD', true,  true),
  ('Electrician',         'ELE', true,  true),
  ('Plumber',             'PLM', true,  true),
  ('Carpenter',           'CRP', true,  true),
  ('Lift Operator',       'LFT', true,  true),
  ('Pump Operator',       'PMP', true,  true),
  ('Technician',          'TCH', true,  true),
  ('Receptionist',        'REC', true,  true),
  ('Office Assistant',    'OA',  true,  true),
  ('Data Entry Operator', 'DEO', true,  true)
ON CONFLICT (name) DO NOTHING;
