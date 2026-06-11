# Design Document — Workforce & Facility Management System

## 1. Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                  React Native (Expo) App                     │
│  Admin Stack │ Supervisor Stack │ Client Stack │ Ops Stack   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Supabase JS Client v2
┌──────────────────────────▼──────────────────────────────────┐
│                    Supabase Platform                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  PostgreSQL  │  │ Edge Functions│  │  Supabase Storage │  │
│  │  + RLS       │  │  (API layer) │  │  (documents/photos│  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  pg_cron     │  │     FCM      │                         │
│  │  (escalation)│  │ (push notifs)│                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Backward Compatibility Strategy

- All existing tables (`guards`, `attendance`, `payroll`, `guard_site_assignments`, `guard_documents`, `uniforms`) are **never dropped or altered destructively**.
- New `workforce_personnel` table is additive. Existing guards are migrated into it via INSERT (not moved).
- Compatibility views (`guards_compat_view`) keep legacy Edge Functions (`/functions/v1/guards`, `/functions/v1/attendance`, `/functions/v1/assignments`) returning correct data.
- New Guard records write to both `workforce_personnel` AND `guards` (best-effort dual-write).
- The `users.role` column is extended with new role values via ALTER TABLE CHECK constraint update.

---

## 2. Database Schema

### 2.1 Extend `users` table

```sql
-- Req 11.1: Add new roles to users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'super_admin','admin','operations_manager','supervisor',
    'client_user','workforce_personnel',
    -- legacy roles preserved:
    'manager','recruiter','guard'
  ));
```

### 2.2 `workforce_categories`

```sql
-- Req 1.8, Req 7.1
CREATE TABLE IF NOT EXISTS workforce_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  prefix_code     VARCHAR(5)   NOT NULL,
  attendance_required BOOLEAN  NOT NULL DEFAULT true,
  is_system_defined   BOOLEAN  NOT NULL DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_category_name    UNIQUE (name),
  CONSTRAINT uq_category_prefix  UNIQUE (prefix_code),
  CONSTRAINT chk_prefix_format   CHECK (prefix_code ~ '^[A-Z]{2,5}$')
);

CREATE INDEX IF NOT EXISTS idx_workforce_categories_name
  ON workforce_categories (LOWER(name));

CREATE TRIGGER set_updated_at_workforce_categories
  BEFORE UPDATE ON workforce_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.3 `workforce_personnel`

```sql
-- Req 1.7
CREATE TABLE IF NOT EXISTS workforce_personnel (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id),
  category_id             UUID NOT NULL REFERENCES workforce_categories(id),
  employee_id             VARCHAR(20) NOT NULL,
  name                    VARCHAR(255) NOT NULL,
  phone                   VARCHAR(15),
  photo_url               TEXT,
  base_salary             DECIMAL(10,2) NOT NULL DEFAULT 0,
  joining_date            DATE,
  shift_type              VARCHAR(20) CHECK (shift_type IN ('day','night','rotational')),
  employment_status       VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (employment_status IN ('active','inactive','terminated')),
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(15),
  bank_account_number     VARCHAR(20),
  bank_ifsc               VARCHAR(11),
  bank_name               VARCHAR(100),
  aadhaar_number          VARCHAR(12),
  pan_number              VARCHAR(10),
  address                 TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_employee_id UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_workforce_personnel_category
  ON workforce_personnel (category_id);
CREATE INDEX IF NOT EXISTS idx_workforce_personnel_status
  ON workforce_personnel (employment_status);
CREATE INDEX IF NOT EXISTS idx_workforce_personnel_employee_id
  ON workforce_personnel (employee_id);

-- Req 14.4: Prevent employee_id update after insert
CREATE OR REPLACE FUNCTION prevent_employee_id_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.employee_id IS DISTINCT FROM NEW.employee_id THEN
    RAISE EXCEPTION 'employee_id cannot be modified after assignment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_employee_id
  BEFORE UPDATE ON workforce_personnel
  FOR EACH ROW EXECUTE FUNCTION prevent_employee_id_update();

CREATE TRIGGER set_updated_at_workforce_personnel
  BEFORE UPDATE ON workforce_personnel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.4 Employee ID Generator Function

```sql
-- Req 1.6, Req 1.9, Req 7.2
CREATE OR REPLACE FUNCTION generate_employee_id(p_category_id UUID)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE
  v_prefix      VARCHAR(5);
  v_next_seq    INT;
  v_employee_id VARCHAR(20);
  v_lock_key    BIGINT;
BEGIN
  SELECT prefix_code INTO v_prefix
    FROM workforce_categories WHERE id = p_category_id;
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Category not found: %', p_category_id;
  END IF;

  -- Advisory lock scoped to this category to prevent concurrent duplicates
  v_lock_key := hashtext(p_category_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(employee_id, '-', 2) AS INT)
  ), 0) + 1
  INTO v_next_seq
  FROM workforce_personnel
  WHERE category_id = p_category_id;

  -- Req 7.2: 4-digit zero-padded, expands beyond 9999 without truncation
  IF v_next_seq <= 9999 THEN
    v_employee_id := v_prefix || '-' || LPAD(v_next_seq::TEXT, 4, '0');
  ELSE
    v_employee_id := v_prefix || '-' || v_next_seq::TEXT;
  END IF;

  RETURN v_employee_id;
END;
$$;
```

### 2.5 Extend `sites` table

```sql
-- Req 2.1
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS site_type               VARCHAR(50),
  ADD COLUMN IF NOT EXISTS society_president_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS society_president_phone VARCHAR(15),
  ADD COLUMN IF NOT EXISTS society_secretary_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS society_secretary_phone VARCHAR(15),
  ADD COLUMN IF NOT EXISTS site_manager_id         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_supervisor_id  UUID REFERENCES workforce_personnel(id),
  ADD COLUMN IF NOT EXISTS workforce_strength      INT;
```

### 2.6 `site_assignments`

```sql
-- Req 2.5
CREATE TABLE IF NOT EXISTS site_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID NOT NULL REFERENCES sites(id),
  personnel_id UUID NOT NULL REFERENCES workforce_personnel(id),
  shift_type   VARCHAR(20) CHECK (shift_type IN ('day','night','rotational')),
  start_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date     DATE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_assignments_site
  ON site_assignments (site_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_site_assignments_personnel
  ON site_assignments (personnel_id) WHERE is_active = true;

-- Req 2.6: Deactivate previous assignment on new assignment
CREATE OR REPLACE FUNCTION deactivate_previous_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE site_assignments
      SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
    WHERE personnel_id = NEW.personnel_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deactivate_prev_site_assignment
  AFTER INSERT ON site_assignments
  FOR EACH ROW EXECUTE FUNCTION deactivate_previous_assignment();

CREATE TRIGGER set_updated_at_site_assignments
  BEFORE UPDATE ON site_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.7 `client_users`

```sql
-- Req 3.9
CREATE TABLE IF NOT EXISTS client_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) UNIQUE,
  site_id     UUID NOT NULL REFERENCES sites(id),
  client_role VARCHAR(30) NOT NULL
                CHECK (client_role IN ('society_president','society_secretary','facility_manager')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_users_site ON client_users (site_id);

CREATE TRIGGER set_updated_at_client_users
  BEFORE UPDATE ON client_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.8 `complaints`

```sql
-- Req 4.1
CREATE TABLE IF NOT EXISTS complaints (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               UUID NOT NULL REFERENCES sites(id),
  raised_by             UUID NOT NULL REFERENCES client_users(id),
  assigned_to           UUID REFERENCES users(id),
  category              VARCHAR(100) NOT NULL,
  description           TEXT NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','in_progress','escalated_l2','escalated_l3','resolved','closed')),
  current_level         INT NOT NULL DEFAULT 1 CHECK (current_level IN (1,2,3)),
  severity              VARCHAR(10) CHECK (severity IN ('low','medium','high','critical')),
  incident_reported     BOOLEAN NOT NULL DEFAULT false,
  sla_deadline          TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  time_to_resolve_seconds BIGINT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_site    ON complaints (site_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status  ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_sla     ON complaints (sla_deadline) WHERE status NOT IN ('resolved','closed');

CREATE TRIGGER set_updated_at_complaints
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.9 `complaint_comments` (immutable)

```sql
-- Req 4.5, Req 14.2
CREATE TABLE IF NOT EXISTS complaint_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  author_id    UUID NOT NULL REFERENCES users(id),
  comment_text TEXT NOT NULL,
  action_taken VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: this table is append-only
);

CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint
  ON complaint_comments (complaint_id, created_at ASC);
```

### 2.10 `complaint_escalations` (immutable)

```sql
-- Req 4.6, Req 14.3
CREATE TABLE IF NOT EXISTS complaint_escalations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  from_level   INT NOT NULL,
  to_level     INT NOT NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  escalated_by TEXT NOT NULL DEFAULT 'system', -- 'system' or user_id
  reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_complaint_escalations_complaint
  ON complaint_escalations (complaint_id);
```

### 2.11 `workforce_attendance`

```sql
-- Req 5.6: Extends existing attendance concept for workforce_personnel
CREATE TABLE IF NOT EXISTS workforce_attendance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id        UUID NOT NULL REFERENCES workforce_personnel(id),
  site_id             UUID NOT NULL REFERENCES sites(id),
  attendance_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type          VARCHAR(20) CHECK (shift_type IN ('day','night','rotational')),
  check_in_time       TIMESTAMPTZ,
  check_out_time      TIMESTAMPTZ,
  check_in_selfie     TEXT,
  check_out_selfie    TEXT,
  check_in_latitude   DECIMAL(10,8),
  check_in_longitude  DECIMAL(11,8),
  hours_worked        DECIMAL(4,2),
  status              VARCHAR(20) NOT NULL DEFAULT 'absent'
                        CHECK (status IN ('present','late','half_day','absent','corrected')),
  is_manual_entry     BOOLEAN NOT NULL DEFAULT false,
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workforce_attendance_daily
    UNIQUE (personnel_id, attendance_date, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_workforce_attendance_personnel
  ON workforce_attendance (personnel_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_workforce_attendance_site_date
  ON workforce_attendance (site_id, attendance_date);

CREATE TRIGGER set_updated_at_workforce_attendance
  BEFORE UPDATE ON workforce_attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.12 `workforce_documents`

```sql
-- Req 6.5
CREATE TABLE IF NOT EXISTS workforce_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id  UUID NOT NULL REFERENCES workforce_personnel(id),
  document_type VARCHAR(100) NOT NULL,
  file_url      TEXT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  verified      BOOLEAN NOT NULL DEFAULT false,
  verified_by   UUID REFERENCES users(id),
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_personnel_document_type UNIQUE (personnel_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_workforce_documents_personnel
  ON workforce_documents (personnel_id);

CREATE TRIGGER set_updated_at_workforce_documents
  BEFORE UPDATE ON workforce_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.13 `replacements`

```sql
-- Req 9.1
CREATE TABLE IF NOT EXISTS replacements (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  absent_personnel_id      UUID NOT NULL REFERENCES workforce_personnel(id),
  replacement_personnel_id UUID REFERENCES workforce_personnel(id),
  site_id                  UUID NOT NULL REFERENCES sites(id),
  shift_date               DATE NOT NULL,
  status                   VARCHAR(20) NOT NULL DEFAULT 'requested'
                             CHECK (status IN ('requested','assigned','completed','cancelled')),
  requested_by             UUID NOT NULL REFERENCES users(id),
  assigned_by              UUID REFERENCES users(id),
  client_notified          BOOLEAN NOT NULL DEFAULT false,
  vacancy_start            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vacancy_end              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_replacement_per_shift
    UNIQUE (absent_personnel_id, site_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_replacements_site_date
  ON replacements (site_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_replacements_status
  ON replacements (status) WHERE status IN ('requested','assigned');

CREATE TRIGGER set_updated_at_replacements
  BEFORE UPDATE ON replacements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2.14 `workforce_ratings`

```sql
CREATE TABLE IF NOT EXISTS workforce_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id  UUID NOT NULL REFERENCES workforce_personnel(id),
  site_id       UUID NOT NULL REFERENCES sites(id),
  rated_by      UUID NOT NULL REFERENCES users(id),
  rating        DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text   TEXT,
  appreciation  BOOLEAN NOT NULL DEFAULT false,
  review_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workforce_ratings_personnel
  ON workforce_ratings (personnel_id);
```

### 2.15 `notifications` (extended)

```sql
-- Existing notifications table extended with new types
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'shift_reminder','attendance_alert','salary_generated',
    'inspection_reminder','recruitment_update','general',
    -- New types:
    'complaint_raised','complaint_escalated_l2','complaint_escalated_l3',
    'replacement_assigned','vacancy_escalated'
  ));
```

### 2.16 Compatibility Views (Req 12.4)

```sql
-- Keeps /functions/v1/guards working after migration
CREATE OR REPLACE VIEW guards_compat_view AS
  SELECT
    wp.id,
    wp.user_id,
    wp.aadhaar_number,
    wp.pan_number,
    wp.address,
    wp.photo_url,
    wp.base_salary,
    wp.joining_date,
    wp.shift_type,
    wp.emergency_contact_name,
    wp.emergency_contact_phone,
    wp.bank_account_number,
    wp.bank_ifsc,
    wp.bank_name,
    wp.employment_status,
    wp.created_at
  FROM workforce_personnel wp
  JOIN workforce_categories wc ON wp.category_id = wc.id
  WHERE wc.prefix_code = 'PIS';

-- Keeps /functions/v1/assignments working
CREATE OR REPLACE VIEW guard_assignments_compat_view AS
  SELECT
    sa.id,
    sa.personnel_id AS guard_id,
    sa.site_id,
    sa.shift_type,
    sa.start_date AS assigned_date,
    sa.is_active
  FROM site_assignments sa
  JOIN workforce_personnel wp ON sa.personnel_id = wp.id
  JOIN workforce_categories wc ON wp.category_id = wc.id
  WHERE wc.prefix_code = 'PIS';
```

### 2.17 System Category Seed Data (Req 1.2, Req 7.1)

```sql
INSERT INTO workforce_categories (name, prefix_code, attendance_required, is_system_defined)
VALUES
  ('Guard',              'PIS', true,  true),
  ('Gunman',             'GM',  false, true),
  ('Rifleman',           'RM',  false, true),
  ('PSO',                'PSO', false, true),
  ('Bouncer',            'BNC', false, true),
  ('Supervisor',         'SUP', true,  true),
  ('Security Officer',   'SO',  true,  true),
  ('Housekeeping',       'HK',  true,  true),
  ('Sweeper',            'SWP', true,  true),
  ('Gardener',           'GRD', true,  true),
  ('Electrician',        'ELE', true,  true),
  ('Plumber',            'PLM', true,  true),
  ('Carpenter',          'CRP', true,  true),
  ('Lift Operator',      'LFT', true,  true),
  ('Pump Operator',      'PMP', true,  true),
  ('Technician',         'TCH', true,  true),
  ('Receptionist',       'REC', true,  true),
  ('Office Assistant',   'OA',  true,  true),
  ('Data Entry Operator','DEO', true,  true)
ON CONFLICT (name) DO NOTHING;
```

---

## 3. Row-Level Security (RLS) Policies

All new tables have RLS enabled. Role is read from `users.role` via a helper function:

```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION current_user_site_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT site_id FROM client_users WHERE user_id = auth.uid() AND is_active = true LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_supervisor_site_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE AS $$
  SELECT DISTINCT sa.site_id FROM site_assignments sa
  JOIN workforce_personnel wp ON sa.personnel_id = wp.id
  JOIN workforce_categories wc ON wp.category_id = wc.id
  WHERE wp.user_id = auth.uid() AND wc.prefix_code = 'SUP' AND sa.is_active = true
$$;
```

### 3.1 `workforce_categories`

```sql
ALTER TABLE workforce_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY wc_read_all ON workforce_categories FOR SELECT
  USING (current_user_role() IN ('super_admin','admin','operations_manager','supervisor','client_user','workforce_personnel'));

CREATE POLICY wc_write_admin ON workforce_categories FOR INSERT
  WITH CHECK (current_user_role() IN ('super_admin','admin'));

CREATE POLICY wc_update_admin ON workforce_categories FOR UPDATE
  USING (current_user_role() IN ('super_admin','admin'));
```

### 3.2 `workforce_personnel`

```sql
ALTER TABLE workforce_personnel ENABLE ROW LEVEL SECURITY;

-- Super_Admin / Admin: full access
CREATE POLICY wp_admin_all ON workforce_personnel FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

-- Operations_Manager: read all
CREATE POLICY wp_ops_read ON workforce_personnel FOR SELECT
  USING (current_user_role() = 'operations_manager');

-- Supervisor: read personnel at their sites
CREATE POLICY wp_supervisor_read ON workforce_personnel FOR SELECT
  USING (
    current_user_role() = 'supervisor' AND
    id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id IN (SELECT current_supervisor_site_ids()) AND sa.is_active = true
    )
  );

-- Client_User: read personnel at their site
CREATE POLICY wp_client_read ON workforce_personnel FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id = current_user_site_id() AND sa.is_active = true
    )
  );

-- Workforce_Personnel: read own record
CREATE POLICY wp_self_read ON workforce_personnel FOR SELECT
  USING (current_user_role() = 'workforce_personnel' AND user_id = auth.uid());
```

### 3.3 `complaints` & `complaint_comments`

```sql
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_escalations ENABLE ROW LEVEL SECURITY;

-- complaints: admin/ops full read; supervisor/client scoped to their site
CREATE POLICY comp_admin_all ON complaints FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

CREATE POLICY comp_ops_read ON complaints FOR SELECT
  USING (current_user_role() = 'operations_manager');

CREATE POLICY comp_ops_write_l2l3 ON complaints FOR UPDATE
  USING (current_user_role() = 'operations_manager' AND current_level IN (2,3));

CREATE POLICY comp_supervisor_site ON complaints FOR ALL
  USING (current_user_role() = 'supervisor' AND site_id IN (SELECT current_supervisor_site_ids()));

CREATE POLICY comp_client_site ON complaints FOR SELECT
  USING (current_user_role() = 'client_user' AND site_id = current_user_site_id());

CREATE POLICY comp_client_insert ON complaints FOR INSERT
  WITH CHECK (current_user_role() = 'client_user' AND site_id = current_user_site_id());

-- complaint_comments: append-only (no UPDATE/DELETE for anyone)
CREATE POLICY cc_read ON complaint_comments FOR SELECT USING (true);
CREATE POLICY cc_insert ON complaint_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- No UPDATE or DELETE policies → effectively immutable (Req 14.2)

-- complaint_escalations: append-only
CREATE POLICY ce_read ON complaint_escalations FOR SELECT USING (true);
CREATE POLICY ce_insert ON complaint_escalations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### 3.4 `workforce_documents`

```sql
ALTER TABLE workforce_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY wd_admin_all ON workforce_documents FOR ALL
  USING (current_user_role() IN ('super_admin','admin'));

CREATE POLICY wd_ops_read ON workforce_documents FOR SELECT
  USING (current_user_role() = 'operations_manager');

CREATE POLICY wd_supervisor_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'supervisor' AND
    personnel_id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id IN (SELECT current_supervisor_site_ids()) AND sa.is_active = true
    )
  );

-- Client: only permitted document types (Req 3.5, Req 6.9)
CREATE POLICY wd_client_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'client_user' AND
    document_type IN ('aadhaar','pan','police_verification','security_training_certificate','weapon_training_certificate','gun_license','ex_servicemen_proof') AND
    personnel_id IN (
      SELECT sa.personnel_id FROM site_assignments sa
      WHERE sa.site_id = current_user_site_id() AND sa.is_active = true
    )
  );

CREATE POLICY wd_self_read ON workforce_documents FOR SELECT
  USING (
    current_user_role() = 'workforce_personnel' AND
    personnel_id IN (SELECT id FROM workforce_personnel WHERE user_id = auth.uid())
  );
```

---

## 4. TypeScript Interfaces

```typescript
// src/types/workforce.ts

export type EmploymentStatus = 'active' | 'inactive' | 'terminated';
export type ShiftType = 'day' | 'night' | 'rotational';
export type UserRole =
  | 'super_admin' | 'admin' | 'operations_manager'
  | 'supervisor' | 'client_user' | 'workforce_personnel'
  | 'manager' | 'recruiter' | 'guard'; // legacy

export interface WorkforceCategory {
  id: string;
  name: string;
  prefix_code: string;
  attendance_required: boolean;
  is_system_defined: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkforcePersonnel {
  id: string;
  user_id?: string;
  category_id: string;
  employee_id: string;
  name: string;
  phone?: string;
  photo_url?: string;
  base_salary: number;
  joining_date?: string;
  shift_type?: ShiftType;
  employment_status: EmploymentStatus;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  aadhaar_number?: string;
  pan_number?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: WorkforceCategory;
  today_attendance?: WorkforceAttendance | null;
  rating_summary?: RatingSummary;
}

export interface SiteAssignment {
  id: string;
  site_id: string;
  personnel_id: string;
  shift_type?: ShiftType;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  // Joined
  personnel?: WorkforcePersonnel;
  site?: Site;
}

export interface Site {
  id: string;
  site_name: string;
  client_name?: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  is_active: boolean;
  // New columns (Req 2.1)
  site_type?: string;
  society_president_name?: string;
  society_president_phone?: string;
  society_secretary_name?: string;
  society_secretary_phone?: string;
  site_manager_id?: string;
  assigned_supervisor_id?: string;
  workforce_strength?: number | null;
}

export interface SiteDashboardMetrics {
  total_workforce: number;
  security_count: number;
  housekeeping_count: number;
  supervisor_count: number;
  present_today: number;
  absent_today: number;
  vacant_positions: number | 'not_configured';
}

export type ComplaintStatus =
  | 'open' | 'in_progress' | 'escalated_l2' | 'escalated_l3' | 'resolved' | 'closed';

export interface Complaint {
  id: string;
  site_id: string;
  raised_by: string;
  assigned_to?: string | null;
  category: string;
  description: string;
  status: ComplaintStatus;
  current_level: 1 | 2 | 3;
  severity?: 'low' | 'medium' | 'high' | 'critical' | null;
  incident_reported: boolean;
  sla_deadline?: string | null;
  resolved_at?: string | null;
  time_to_resolve_seconds?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintComment {
  id: string;
  complaint_id: string;
  author_id: string;
  comment_text: string;
  action_taken?: string;
  created_at: string;
  // Joined
  author?: { name: string; role: UserRole };
}

export interface ComplaintEscalation {
  id: string;
  complaint_id: string;
  from_level: number;
  to_level: number;
  escalated_at: string;
  escalated_by: string;
  reason?: string;
}

export interface ClientUser {
  id: string;
  user_id: string;
  site_id: string;
  client_role: 'society_president' | 'society_secretary' | 'facility_manager';
  is_active: boolean;
  created_at: string;
}

export type ReplacementStatus = 'requested' | 'assigned' | 'completed' | 'cancelled';

export interface Replacement {
  id: string;
  absent_personnel_id: string;
  replacement_personnel_id?: string | null;
  site_id: string;
  shift_date: string;
  status: ReplacementStatus;
  requested_by: string;
  assigned_by?: string | null;
  client_notified: boolean;
  vacancy_start: string;
  vacancy_end?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkforceAttendance {
  id: string;
  personnel_id: string;
  site_id: string;
  attendance_date: string;
  shift_type?: ShiftType;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_selfie?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  hours_worked?: number | null;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'corrected';
  is_manual_entry: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface WorkforceDocument {
  id: string;
  personnel_id: string;
  document_type: string;
  file_url: string;
  uploaded_by: string;
  verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface WorkforceRating {
  id: string;
  personnel_id: string;
  site_id: string;
  rated_by: string;
  rating: number;
  review_text?: string;
  appreciation: boolean;
  review_date: string;
}

export interface RatingSummary {
  average_rating: number;
  open_complaint_count: number;
  appreciation_count: number;
  last_review_date?: string | null;
}

export type NotificationType =
  | 'complaint_raised' | 'complaint_escalated_l2' | 'complaint_escalated_l3'
  | 'replacement_assigned' | 'vacancy_escalated'
  | 'shift_reminder' | 'attendance_alert' | 'salary_generated' | 'general';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
```

---

## 5. API Service Layer

All services follow the existing pattern in `guardService.ts`: call `supabase.functions.invoke()` for Edge Functions, or use `supabase.from()` for direct table access where RLS is sufficient.

### 5.1 `workforceCategoryService.ts`

```typescript
getCategories(): Promise<WorkforceCategory[]>
getCategoryById(id: string): Promise<WorkforceCategory>
createCategory(data: { name: string; prefix_code: string; attendance_required: boolean }): Promise<WorkforceCategory>
updateCategory(id: string, updates: Partial<WorkforceCategory>): Promise<WorkforceCategory>
// Note: deletion blocked by RLS + FK constraints
```

### 5.2 `workforcePersonnelService.ts`

```typescript
getPersonnel(filters?: { category_id?: string; site_id?: string; status?: EmploymentStatus; search?: string }): Promise<WorkforcePersonnel[]>
getPersonnelById(id: string): Promise<WorkforcePersonnel>
createPersonnel(data: Omit<WorkforcePersonnel, 'id' | 'employee_id' | 'created_at' | 'updated_at'>): Promise<WorkforcePersonnel>
updatePersonnel(id: string, updates: Partial<WorkforcePersonnel>): Promise<WorkforcePersonnel>
terminatePersonnel(id: string): Promise<void>  // sets employment_status = 'terminated'
```

### 5.3 `siteAssignmentService.ts`

```typescript
getAssignmentsForSite(siteId: string): Promise<SiteAssignment[]>
getAssignmentsForPersonnel(personnelId: string): Promise<SiteAssignment[]>
assignPersonnelToSite(data: { site_id: string; personnel_id: string; shift_type: ShiftType; start_date: string }): Promise<SiteAssignment>
deactivateAssignment(id: string): Promise<void>
getSiteDashboardMetrics(siteId: string): Promise<SiteDashboardMetrics>
getWorkforceRoster(siteId: string): Promise<Record<string, WorkforcePersonnel[]>>  // grouped by category
```

### 5.4 `workforceDocumentService.ts`

```typescript
getDocumentsForPersonnel(personnelId: string): Promise<WorkforceDocument[]>
getDocumentChecklist(personnelId: string): Promise<DocumentChecklistItem[]>
uploadDocument(personnelId: string, documentType: string, fileUri: string): Promise<WorkforceDocument>
verifyDocument(documentId: string): Promise<WorkforceDocument>
// DocumentChecklistItem: { document_type, status: 'verified' | 'pending' | 'missing' }
```

### 5.5 `workforceAttendanceService.ts`

```typescript
checkIn(data: { personnel_id: string; site_id: string; latitude: number; longitude: number; selfie_url: string }): Promise<WorkforceAttendance>
checkOut(attendanceId: string, data: { latitude: number; longitude: number }): Promise<WorkforceAttendance>
manualEntry(data: { personnel_id: string; site_id: string; date: string; status: string }): Promise<WorkforceAttendance>
getAttendanceForSite(siteId: string, date: string): Promise<WorkforceAttendance[]>
getAttendanceForPersonnel(personnelId: string, from: string, to: string): Promise<WorkforceAttendance[]>
approveCorrection(attendanceId: string): Promise<WorkforceAttendance>
```

### 5.6 `complaintService.ts`

```typescript
raiseComplaint(data: { site_id: string; category: string; description: string; severity?: string }): Promise<Complaint>
getComplaintsForSite(siteId: string): Promise<Complaint[]>
getComplaintById(id: string): Promise<Complaint & { comments: ComplaintComment[]; escalations: ComplaintEscalation[] }>
addComment(complaintId: string, text: string, actionTaken?: string): Promise<ComplaintComment>
resolveComplaint(complaintId: string, resolutionNote: string): Promise<Complaint>
// Escalation is handled server-side by the Escalation Engine
```

### 5.7 `clientPortalService.ts`

```typescript
getClientSiteInfo(): Promise<Site>
getClientWorkforceRoster(): Promise<Record<string, WorkforcePersonnel[]>>
getClientAttendance(granularity: 'daily' | 'weekly' | 'monthly', date: string): Promise<AttendanceSummary>
getClientDocuments(personnelId: string): Promise<WorkforceDocument[]>
getClientPerformanceOverview(): Promise<Array<WorkforcePersonnel & { rating_summary: RatingSummary }>>
```

### 5.8 `replacementService.ts`

```typescript
getReplacementsForSite(siteId: string, date?: string): Promise<Replacement[]>
assignReplacement(replacementId: string, replacementPersonnelId: string): Promise<Replacement>
cancelReplacement(replacementId: string): Promise<void>
completeReplacement(replacementId: string): Promise<Replacement>
```

### 5.9 `analyticsService.ts`

```typescript
getWorkforceDistribution(filters: AnalyticsFilters): Promise<CategoryDistribution[]>
getAttendanceTrend(filters: AnalyticsFilters): Promise<AttendanceTrendPoint[]>
getSiteDeployment(filters: AnalyticsFilters): Promise<SiteDeploymentPoint[]>
getComplaintTrends(filters: AnalyticsFilters): Promise<ComplaintTrendPoint[]>
getStaffTurnoverRate(filters: AnalyticsFilters): Promise<TurnoverRate>
getVacancyRate(filters: AnalyticsFilters): Promise<VacancyRatePoint[]>
exportAnalyticsCSV(filters: AnalyticsFilters): Promise<string>  // returns file URI

// AnalyticsFilters: { site_ids?: string[]; category_ids?: string[]; from_date: string; to_date: string; region?: string }
```

### 5.10 `supervisorService.ts`

```typescript
getSupervisorDashboard(): Promise<SupervisorDashboard>
getAssignedSites(): Promise<Site[]>
getPendingAttendanceCorrections(): Promise<WorkforceAttendance[]>
approveAttendanceCorrection(attendanceId: string): Promise<void>
submitIncidentReport(data: { site_id: string; description: string; severity: string }): Promise<Complaint>
```

---

## 6. React Native Screens

### 6.1 Admin Screens

| Screen | Purpose | Key Data |
|--------|---------|----------|
| `WorkforceCategoryListScreen` | List all 19+ categories, toggle attendance_required | `workforceCategoryService.getCategories()` |
| `AddWorkforceCategoryScreen` | Form: name, prefix_code, attendance_required | `createCategory()` |
| `WorkforcePersonnelListScreen` | Searchable list with category filter chips | `getPersonnel()` |
| `AddWorkforcePersonnelScreen` | Multi-step form: personal info → bank → documents | `createPersonnel()` |
| `WorkforcePersonnelDetailScreen` | Profile, documents checklist, attendance history, assignments | `getPersonnelById()` |
| `SiteDashboardScreen` | 7 metric cards + Workforce Roster tab | `getSiteDashboardMetrics()`, `getWorkforceRoster()` |
| `WorkforceRosterScreen` | Personnel grouped by category, each card shows photo/ID/status | `getWorkforceRoster()` |
| `DocumentChecklistScreen` | Per-personnel checklist with upload/verify actions | `getDocumentChecklist()`, `uploadDocument()` |
| `AnalyticsDashboardScreen` | 7 charts + filter bar + CSV export | `analyticsService.*` |
| `AssignPersonnelScreen` | Assign personnel to site with shift selection | `assignPersonnelToSite()` |

### 6.2 Supervisor Screens

| Screen | Purpose | Key Data |
|--------|---------|----------|
| `SupervisorDashboardScreen` | Site cards with metrics, open complaints count, vacancy count | `getSupervisorDashboard()` |
| `AttendanceCorrectionScreen` | List pending corrections, approve/reject | `getPendingAttendanceCorrections()` |
| `VacancyManagementScreen` | List open replacements for supervisor's sites | `getReplacementsForSite()` |
| `AssignReplacementScreen` | Pick available replacement personnel | `assignReplacement()` |
| `IncidentReportScreen` | Form: site, description, severity | `submitIncidentReport()` |
| `SupervisorComplaintListScreen` | Complaints for assigned sites | `getComplaintsForSite()` |
| `ComplaintDetailScreen` | Timeline view + resolve action | `getComplaintById()`, `resolveComplaint()` |

### 6.3 Client Portal Screens

| Screen | Purpose | Key Data |
|--------|---------|----------|
| `ClientPortalHomeScreen` | Site overview: workforce count, attendance %, open complaints | `getClientSiteInfo()` |
| `ClientWorkforceRosterScreen` | Read-only roster grouped by category | `getClientWorkforceRoster()` |
| `ClientAttendanceScreen` | Daily/weekly/monthly tabs with attendance % | `getClientAttendance()` |
| `ClientDocumentViewScreen` | View permitted documents (PDF/image viewer) | `getClientDocuments()` |
| `ClientPerformanceScreen` | Per-personnel rating, complaints, appreciation | `getClientPerformanceOverview()` |
| `RaiseComplaintScreen` | Form: category picker, description, severity | `raiseComplaint()` |
| `ClientComplaintListScreen` | List complaints raised by this client | `getComplaintsForSite()` |
| `ComplaintTimelineScreen` | Immutable audit trail view | `getComplaintById()` |

### 6.4 Operations Manager Screens

| Screen | Purpose | Key Data |
|--------|---------|----------|
| `OperationsDashboardScreen` | Multi-site overview, escalated complaints, open vacancies | `getSiteDashboardMetrics()` per site |
| `EscalatedComplaintsScreen` | L2/L3 complaints across all sites | `getComplaintsForSite()` filtered |

### 6.5 Shared Components

```
WorkforcePersonnelCard     — photo, name, employee_id, category badge, attendance dot
SiteSummaryCard            — site name, workforce count, present/absent, open complaints
ComplaintTimelineItem      — timestamp, author, action_taken, comment_text
DocumentChecklistItem      — document_type, status badge (verified/pending/missing), upload button
AttendanceStatusBadge      — color-coded: green=present, red=absent, yellow=late, grey=N/A
CategoryBadge              — colored chip with category name
VacancyWorkflowStepper     — 4-step progress: Absent → Requested → Assigned → Notified
```

---

## 7. Navigation Structure

The existing `App.tsx` uses a single flat `Stack.Navigator`. We extend it with role-based routing on login.

### 7.1 Extended `RootStackParamList`

```typescript
// New routes added to existing RootStackParamList:

// Admin — Workforce
WorkforceCategoryList: undefined;
AddWorkforceCategory: undefined;
WorkforcePersonnelList: { categoryId?: string };
AddWorkforcePersonnel: undefined;
WorkforcePersonnelDetail: { personnelId: string };
SiteDashboard: { siteId: string };
WorkforceRoster: { siteId: string };
DocumentChecklist: { personnelId: string };
AssignPersonnel: { siteId: string };
AnalyticsDashboard: undefined;

// Supervisor
SupervisorDashboard: undefined;
AttendanceCorrection: undefined;
VacancyManagement: { siteId?: string };
AssignReplacement: { replacementId: string };
IncidentReport: { siteId: string };
SupervisorComplaintList: { siteId?: string };

// Client Portal
ClientPortalHome: undefined;
ClientWorkforceRoster: undefined;
ClientAttendance: undefined;
ClientDocumentView: { personnelId: string; documentType: string };
ClientPerformance: undefined;
RaiseComplaint: undefined;
ClientComplaintList: undefined;

// Shared
ComplaintDetail: { complaintId: string };
ComplaintTimeline: { complaintId: string };

// Operations Manager
OperationsDashboard: undefined;
EscalatedComplaints: undefined;
```

### 7.2 Role-Based Routing on Login

In `SplashScreen` / `OtpScreen` after successful auth, navigate based on `user.role`:

```typescript
switch (user.role) {
  case 'super_admin':
  case 'admin':
    navigation.replace('AdminDashboard');
    break;
  case 'operations_manager':
    navigation.replace('OperationsDashboard');
    break;
  case 'supervisor':
    navigation.replace('SupervisorDashboard');
    break;
  case 'client_user':
    navigation.replace('ClientPortalHome');
    break;
  case 'workforce_personnel':
    navigation.replace('GuardHome');  // reuse existing personnel home
    break;
  // legacy
  case 'guard':
    navigation.replace('GuardHome');
    break;
  default:
    navigation.replace('AdminDashboard');
}
```

---

## 8. Escalation Engine (Req 4.10)

### 8.1 Supabase Edge Function: `escalation-engine`

**Schedule:** pg_cron every 5 minutes
```sql
SELECT cron.schedule('escalation-engine', '*/5 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/escalation-engine',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  )$$
);
```

### 8.2 Algorithm

```typescript
// supabase/functions/escalation-engine/index.ts
export default async function handler(req: Request) {
  const now = new Date().toISOString();

  // 1. Find all complaints with expired SLA that are not resolved/closed
  const { data: expired } = await supabase
    .from('complaints')
    .select('id, current_level, site_id')
    .lt('sla_deadline', now)
    .not('status', 'in', '("resolved","closed")')
    .order('sla_deadline', { ascending: true });

  for (const complaint of expired ?? []) {
    if (complaint.current_level === 1) {
      await escalateToLevel2(complaint);
    } else if (complaint.current_level === 2) {
      await escalateToLevel3(complaint);
    }
    // Level 3 expired: already critical, no further escalation
  }

  // 2. Find vacancies open > 2 hours with no replacement assigned (Req 9.7)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: staleVacancies } = await supabase
    .from('replacements')
    .select('id, site_id, absent_personnel_id')
    .eq('status', 'requested')
    .lt('vacancy_start', twoHoursAgo);

  for (const vacancy of staleVacancies ?? []) {
    await notifyOperationsManager(vacancy);
  }
}

async function escalateToLevel2(complaint: { id: string; site_id: string }) {
  const newDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await supabase.from('complaints').update({
    current_level: 2,
    status: 'escalated_l2',
    sla_deadline: newDeadline,
  }).eq('id', complaint.id);

  await supabase.from('complaint_escalations').insert({
    complaint_id: complaint.id, from_level: 1, to_level: 2,
    escalated_by: 'system', reason: 'SLA expired at Level 1',
  });

  await supabase.from('complaint_comments').insert({
    complaint_id: complaint.id, author_id: SYSTEM_USER_ID,
    comment_text: 'Complaint auto-escalated to Level 2 — SLA expired.',
    action_taken: 'escalated_l2',
  });

  await sendFCMToSiteManagerAndOpsManager(complaint.site_id, complaint.id);
}

async function escalateToLevel3(complaint: { id: string; site_id: string }) {
  const newDeadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await supabase.from('complaints').update({
    current_level: 3,
    status: 'escalated_l3',
    sla_deadline: newDeadline,
  }).eq('id', complaint.id);
  // Insert escalation record + comment + FCM to admin/super_admin
}
```

**Idempotency:** The query filters `sla_deadline < now AND status NOT IN (resolved, closed)`. Once escalated, `current_level` changes so the same complaint won't be re-escalated in the next poll.

---

## 9. Notification System (Req 13)

### 9.1 FCM Payload Structure

```typescript
interface FCMPayload {
  token: string;           // from users.fcm_token
  notification: {
    title: string;
    body: string;
  };
  data: {
    type: NotificationType;
    entity_id: string;     // complaint_id, replacement_id, etc.
    site_id: string;
  };
}
```

### 9.2 Dispatch Function

```typescript
// supabase/functions/_shared/notifications.ts
async function sendNotification(userId: string, payload: {
  type: NotificationType;
  title: string;
  body: string;
  entity_id: string;
  site_id: string;
}) {
  // 1. Get FCM token
  const { data: user } = await supabase
    .from('users').select('fcm_token').eq('id', userId).single();

  // 2. Insert notification record (Req 13.7)
  await supabase.from('notifications').insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
  });

  // 3. Send FCM (Req 13.6)
  if (user?.fcm_token) {
    try {
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.fcm_token,
          notification: { title: payload.title, body: payload.body },
          data: { type: payload.type, entity_id: payload.entity_id, site_id: payload.site_id },
        }),
      });
    } catch (err) {
      // Req 13.8: Log failure, do not throw
      console.error(`FCM delivery failed for user ${userId}:`, err);
    }
  }
}
```

### 9.3 Notification Trigger Map

| Event | Recipients | Type |
|-------|-----------|------|
| Level 1 complaint created | Site Supervisor | `complaint_raised` |
| Complaint escalated to L2 | Site Manager + Operations Manager | `complaint_escalated_l2` |
| Complaint escalated to L3 | Admin + Super_Admin | `complaint_escalated_l3` |
| Replacement assigned | Client_User of site | `replacement_assigned` |
| Vacancy open > 2 hours | Operations Manager | `vacancy_escalated` |

---

## 10. Migration Strategy (Req 12)

Migrations are applied in order. Each is idempotent (uses `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`).

### Migration Order

```
001_extend_users_roles.sql
002_create_workforce_categories.sql
003_create_workforce_personnel.sql
004_extend_sites.sql
005_create_site_assignments.sql
006_create_client_users.sql
007_create_complaints.sql
008_create_complaint_comments.sql
009_create_complaint_escalations.sql
010_create_workforce_attendance.sql
011_create_workforce_documents.sql
012_create_replacements.sql
013_create_workforce_ratings.sql
014_extend_notifications.sql
015_seed_workforce_categories.sql
016_create_compatibility_views.sql
017_migrate_guards_to_workforce_personnel.sql
018_apply_rls_policies.sql
019_schedule_escalation_engine.sql
```

### Migration 017: Guard Migration (Req 12.1)

```sql
-- Idempotent: only inserts guards not already in workforce_personnel
INSERT INTO workforce_personnel (
  user_id, category_id, employee_id, name, phone, photo_url,
  base_salary, joining_date, shift_type, employment_status,
  emergency_contact_name, emergency_contact_phone,
  bank_account_number, bank_ifsc, bank_name,
  aadhaar_number, pan_number, address
)
SELECT
  g.user_id,
  (SELECT id FROM workforce_categories WHERE prefix_code = 'PIS'),
  'PIS-' || LPAD(ROW_NUMBER() OVER (ORDER BY g.id)::TEXT, 4, '0'),
  u.name,
  u.phone,
  g.photo_url,
  g.base_salary,
  g.joining_date,
  g.shift_type,
  g.employment_status,
  g.emergency_contact_name,
  g.emergency_contact_phone,
  g.bank_account_number,
  g.bank_ifsc,
  g.bank_name,
  g.aadhaar_number,
  g.pan_number,
  g.address
FROM guards g
JOIN users u ON g.user_id = u.id
WHERE g.user_id NOT IN (
  SELECT user_id FROM workforce_personnel WHERE user_id IS NOT NULL
);
```

---

## 11. Document Requirements Matrix (Req 6)

| Document Type | All | Security | Armed (GM/RM/PSO) | Housekeeping |
|--------------|-----|----------|-------------------|--------------|
| Aadhaar Card | ✓ | ✓ | ✓ | ✓ |
| PAN Card | ✓ | ✓ | ✓ | ✓ |
| Address Proof | ✓ | ✓ | ✓ | ✓ |
| Bank Passbook | ✓ | ✓ | ✓ | ✓ |
| Photograph | ✓ | ✓ | ✓ | ✓ |
| Police Verification | — | ✓ | ✓ | — |
| Security Training Cert | — | ✓ | ✓ | — |
| Gun License | — | — | ✓ | — |
| Ex-Servicemen Proof | — | — | ✓ | — |
| Weapon Training Cert | — | — | ✓ | — |
| Medical Fitness Cert | — | — | — | ✓ |

Security categories: Guard, Gunman, Rifleman, PSO, Bouncer, Supervisor, Security Officer

---

## 12. Analytics Computations (Req 10)

### Attendance Percentage
```
(COUNT of workforce_attendance WHERE status IN ('present','late') AND personnel is Attendance Required)
/ (COUNT of expected attendance days × COUNT of Attendance Required personnel)
× 100
```
Zero-denominator guard: display `0%` when expected days = 0.

### Staff Turnover Rate
```
(COUNT of workforce_personnel WHERE employment_status = 'terminated' AND updated_at BETWEEN from AND to)
/ AVG(COUNT of active personnel per day in period)
× 100
```
Zero-denominator guard: display `"N/A"` when avg headcount = 0.

### Vacancy Rate
```
(SUM of (vacancy_end - vacancy_start) in days per site)
/ (workforce_strength × days_in_period)
× 100
```

### Default Filter State (on screen load)
- Sites: all
- Categories: all
- Date range: last 30 days (today − 30 days to today)
- Region: all
