-- ============================================================
-- PAN INDIA SECURITY — Workforce Management System
-- Migration 001: Create All Core Tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE (all roles: admin, manager, recruiter, guard)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'recruiter', 'guard')),
    is_active BOOLEAN DEFAULT true,
    fcm_token TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. GUARDS TABLE (extends users with guard-specific fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS guards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aadhaar_number VARCHAR(12),
    pan_number VARCHAR(10),
    address TEXT,
    photo_url TEXT,
    height DECIMAL(5,2),          -- in cm
    weight DECIMAL(5,2),          -- in kg
    education VARCHAR(100),
    police_verification BOOLEAN DEFAULT false,
    police_verification_doc TEXT,  -- document URL
    base_salary DECIMAL(10,2) NOT NULL,
    joining_date DATE,
    shift_type VARCHAR(20) DEFAULT 'day' CHECK (shift_type IN ('day', 'night', 'rotational')),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(15),
    bank_account_number VARCHAR(20),
    bank_ifsc VARCHAR(11),
    bank_name VARCHAR(100),
    employment_status VARCHAR(20) DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_guard_user UNIQUE (user_id)
);

-- ============================================================
-- 3. GUARD DOCUMENTS TABLE (multiple documents per guard)
-- ============================================================
CREATE TABLE IF NOT EXISTS guard_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'photo', 'police_verification', 'address_proof', 'other')),
    document_url TEXT NOT NULL,
    document_name VARCHAR(255),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. SITES TABLE (client locations)
-- ============================================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    geofence_radius INT DEFAULT 100,  -- in meters
    day_shift_start TIME DEFAULT '08:00',
    day_shift_end TIME DEFAULT '20:00',
    night_shift_start TIME DEFAULT '20:00',
    night_shift_end TIME DEFAULT '08:00',
    contact_person VARCHAR(255),
    contact_phone VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. GUARD-SITE ASSIGNMENTS (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS guard_site_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('day', 'night')),
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('day', 'night')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    check_in_selfie TEXT,         -- storage URL
    check_out_selfie TEXT,        -- storage URL
    check_in_latitude DECIMAL(10,8),
    check_in_longitude DECIMAL(11,8),
    check_out_latitude DECIMAL(10,8),
    check_out_longitude DECIMAL(11,8),
    check_in_distance INT,        -- distance from site in meters at check-in
    check_out_distance INT,       -- distance from site in meters at check-out
    hours_worked DECIMAL(4,2),    -- calculated on check-out
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late', 'half_day', 'absent')),
    is_manual_entry BOOLEAN DEFAULT false,
    manual_entry_by UUID REFERENCES users(id),
    remarks TEXT,
    attendance_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. PAYROLL TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,           -- format: '2026-05'
    total_working_days INT NOT NULL,
    days_present INT DEFAULT 0,
    days_late INT DEFAULT 0,
    days_absent INT DEFAULT 0,
    base_salary DECIMAL(10,2) NOT NULL,
    pro_rated_salary DECIMAL(10,2),      -- (base / total_days) * present
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    uniform_deduction DECIMAL(10,2) DEFAULT 0,
    advance_deduction DECIMAL(10,2) DEFAULT 0,
    other_deduction DECIMAL(10,2) DEFAULT 0,
    other_deduction_reason TEXT,
    final_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'paid')),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_guard_month UNIQUE (guard_id, month)
);

-- ============================================================
-- 8. UNIFORMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS uniforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    item_name VARCHAR(50) NOT NULL CHECK (item_name IN ('uniform_set', 'shoes', 'belt', 'cap', 'id_card', 'torch', 'baton', 'whistle', 'other')),
    item_cost DECIMAL(10,2) NOT NULL,
    issued_date DATE DEFAULT CURRENT_DATE,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'deducted')),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    deducted_in_month VARCHAR(7),         -- which payroll month it was deducted
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. CANDIDATES TABLE (recruitment pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    education VARCHAR(100),
    experience_years INT DEFAULT 0,
    preferred_location VARCHAR(255),
    salary_expectation DECIMAL(10,2),
    availability_date DATE,
    status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'interview_scheduled', 'selected', 'hired', 'rejected')),
    recruiter_id UUID REFERENCES users(id),
    notes TEXT,
    converted_guard_id UUID REFERENCES guards(id),  -- set when hired and converted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. INSPECTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id),
    inspection_date TIMESTAMPTZ DEFAULT NOW(),
    guards_present UUID[] DEFAULT '{}',      -- array of guard IDs
    guards_absent UUID[] DEFAULT '{}',       -- array of guard IDs
    total_guards_expected INT DEFAULT 0,
    photos TEXT[] DEFAULT '{}',              -- array of photo URLs
    remarks TEXT,
    incident_reported BOOLEAN DEFAULT false,
    incident_severity VARCHAR(20) CHECK (incident_severity IN ('low', 'medium', 'high', 'critical')),
    incident_description TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(30) CHECK (type IN ('shift_reminder', 'attendance_alert', 'salary_generated', 'inspection_reminder', 'recruitment_update', 'general')),
    data JSONB,                    -- extra payload (e.g., { guard_id, site_id })
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_guards BEFORE UPDATE ON guards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_sites BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_assignments BEFORE UPDATE ON guard_site_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_attendance BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_payroll BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_uniforms BEFORE UPDATE ON uniforms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_candidates BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
