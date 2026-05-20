# Deployment & Testing Guide
# Pan India Security — Backend

---

## PART 1: Setup Supabase Project

### Step 1: Create Supabase Cloud Project

1. Go to **https://supabase.com** → Sign up / Login
2. Click **"New Project"**
3. Fill in:
   - **Name:** `pan-india-security`
   - **Database Password:** (save this somewhere safe!)
   - **Region:** `South Asia (Mumbai)` ap-south-1
4. Wait ~2 minutes for project to provision

### Step 2: Get Your API Keys

1. In Supabase Dashboard → **Settings** → **API**
2. Copy these 3 values:

```
SUPABASE_URL        = https://xxxxx.supabase.co
SUPABASE_ANON_KEY   = eyJhbGciOiJIUzI1NiI... (public key)
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiI... (secret key — NEVER expose)
```

3. Also go to **Settings** → **API** → **JWT Settings** and copy:
```
SUPABASE_JWT_SECRET = your-jwt-secret
```

### Step 3: Create .env File

In your project folder, copy `.env.example` to `.env` and fill in the values:

```bash
# In PowerShell:
Copy-Item .env.example .env
```

Then edit `.env` with your actual keys.

---

## PART 2: Run Migrations (Create Database)

### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Link your local project to the cloud project
npx supabase link --project-ref YOUR_PROJECT_REF

# YOUR_PROJECT_REF is found in: Dashboard → Settings → General → Reference ID
# It looks like: abcdefghijklmnop

# 2. Push all migrations to create tables
npx supabase db push

# 3. Seed test data
# Go to Dashboard → SQL Editor → paste seed.sql contents → Run
```

### Option B: Using SQL Editor (Manual — Easiest for beginners)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Run each migration file IN ORDER:
   - Copy-paste `001_create_tables.sql` → Click **"Run"** ✅
   - Copy-paste `002_create_indexes.sql` → Click **"Run"** ✅
   - Copy-paste `003_rls_policies.sql` → Click **"Run"** ✅
   - Copy-paste `004_functions.sql` → Click **"Run"** ✅
   - Copy-paste `005_storage_buckets.sql` → Click **"Run"** ✅
   - Copy-paste `seed.sql` → Click **"Run"** ✅

4. **Verify:** Go to **Table Editor** → you should see all 11 tables with test data

---

## PART 3: Deploy Edge Functions

### Step 1: Login to Supabase CLI

```bash
npx supabase login
# This opens a browser → login → copy the token → paste in terminal
```

### Step 2: Link Project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Deploy Functions (One by One)

```bash
# Deploy all 13 edge functions
npx supabase functions deploy auth-verify-otp --no-verify-jwt
npx supabase functions deploy auth-refresh --no-verify-jwt
npx supabase functions deploy manage-users --no-verify-jwt
npx supabase functions deploy guards --no-verify-jwt
npx supabase functions deploy sites --no-verify-jwt
npx supabase functions deploy assignments --no-verify-jwt
npx supabase functions deploy attendance --no-verify-jwt
npx supabase functions deploy payroll --no-verify-jwt
npx supabase functions deploy candidates --no-verify-jwt
npx supabase functions deploy uniforms --no-verify-jwt
npx supabase functions deploy inspections --no-verify-jwt
npx supabase functions deploy notifications --no-verify-jwt
npx supabase functions deploy dashboard --no-verify-jwt
```

> **Note:** `--no-verify-jwt` is used because we handle JWT verification ourselves
> inside the edge functions (in `auth-middleware.ts`).

### Step 4: Set Environment Variables (Secrets)

```bash
# Set secrets for edge functions
npx supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=your-anon-key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npx supabase secrets set SUPABASE_JWT_SECRET=your-jwt-secret
npx supabase secrets set ENVIRONMENT=development
npx supabase secrets set FIREBASE_PROJECT_ID=your-firebase-id
npx supabase secrets set FIREBASE_WEB_API_KEY=your-firebase-web-key
```

### Step 5: Verify Deployment

After deploying, your edge functions are available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-verify-otp
https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-refresh
https://YOUR_PROJECT_REF.supabase.co/functions/v1/manage-users
https://YOUR_PROJECT_REF.supabase.co/functions/v1/guards
https://YOUR_PROJECT_REF.supabase.co/functions/v1/sites
https://YOUR_PROJECT_REF.supabase.co/functions/v1/assignments
https://YOUR_PROJECT_REF.supabase.co/functions/v1/attendance
https://YOUR_PROJECT_REF.supabase.co/functions/v1/payroll
https://YOUR_PROJECT_REF.supabase.co/functions/v1/candidates
https://YOUR_PROJECT_REF.supabase.co/functions/v1/uniforms
https://YOUR_PROJECT_REF.supabase.co/functions/v1/inspections
https://YOUR_PROJECT_REF.supabase.co/functions/v1/notifications
https://YOUR_PROJECT_REF.supabase.co/functions/v1/dashboard
```

---

## PART 4: Testing

### Method 1: Using cURL (PowerShell)

#### Test 1: Check if functions are alive

```powershell
# Simple health check (should return 405 Method Not Allowed for GET on POST-only endpoints)
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/manage-users" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer YOUR_ANON_KEY"
    "Content-Type" = "application/json"
  }
```

#### Test 2: Create a user (using service role key directly in SQL first)

Since auth requires pre-created users, first test by calling the database directly:

```powershell
# List users via Supabase REST API (tests if tables + seed data exist)
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/rest/v1/users?select=*" `
  -Method GET `
  -Headers @{
    "apikey" = "YOUR_ANON_KEY"
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
  }
```

You should see the seeded admin user, manager, recruiter, and 3 guards.

#### Test 3: Test Sites API

```powershell
# List all sites
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/rest/v1/sites?select=*" `
  -Method GET `
  -Headers @{
    "apikey" = "YOUR_ANON_KEY"
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
  }
```

#### Test 4: Test Guards API

```powershell
# List all guards with user info
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/rest/v1/guards?select=*,users(name,phone)" `
  -Method GET `
  -Headers @{
    "apikey" = "YOUR_ANON_KEY"
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
  }
```

#### Test 5: Test Geo-fence Function

```powershell
# Test the Haversine distance function directly in SQL Editor:
# Paste this in SQL Editor → Run:
SELECT * FROM is_within_geofence(
  25.6120,   -- guard latitude (same as site = should be within fence)
  85.1580,   -- guard longitude
  'f0000000-0000-0000-0000-000000000001'  -- Patna Main Office site ID
);
-- Expected: within_fence = true, distance_meters ≈ 0

SELECT * FROM is_within_geofence(
  25.6200,   -- guard latitude (different = should be outside)
  85.1700,   -- guard longitude
  'f0000000-0000-0000-0000-000000000001'
);
-- Expected: within_fence = false, distance_meters > 100
```

#### Test 6: Test Daily Summary Function

```sql
-- Run in SQL Editor:
SELECT * FROM get_daily_attendance_summary(CURRENT_DATE);
-- Expected: Lists all active sites with 0 attendance (no check-ins yet)
```

---

### Method 2: Using Postman (Recommended for Full Testing)

#### Setup Postman:

1. Download **Postman** from https://www.postman.com/downloads/
2. Create a new **Collection** called "Pan India Security"
3. Set **Collection Variables:**

| Variable | Value |
|----------|-------|
| `base_url` | `https://YOUR_PROJECT_REF.supabase.co` |
| `anon_key` | Your Supabase anon key |
| `service_key` | Your Supabase service role key |
| `token` | (leave empty — filled after auth) |

4. Set **Collection Headers** (applied to all requests):
```
apikey: {{anon_key}}
Content-Type: application/json
```

#### Postman Test Requests:

##### Request 1: List Users (Direct DB)
```
GET {{base_url}}/rest/v1/users?select=*
Headers:
  Authorization: Bearer {{service_key}}
```

##### Request 2: List Guards (Direct DB)
```
GET {{base_url}}/rest/v1/guards?select=*,users(name,phone)
Headers:
  Authorization: Bearer {{service_key}}
```

##### Request 3: List Sites (Direct DB)
```
GET {{base_url}}/rest/v1/sites?select=*
Headers:
  Authorization: Bearer {{service_key}}
```

##### Request 4: List Assignments (Direct DB)
```
GET {{base_url}}/rest/v1/guard_site_assignments?select=*,guards(users(name)),sites(site_name)&is_active=eq.true
Headers:
  Authorization: Bearer {{service_key}}
```

##### Request 5: Create a New Guard (Edge Function)
```
POST {{base_url}}/functions/v1/guards
Headers:
  Authorization: Bearer {{service_key}}
Body (JSON):
{
  "name": "Test Guard New",
  "phone": "9555555551",
  "base_salary": 15000,
  "shift_type": "day",
  "address": "Test Address, Patna",
  "education": "10th Pass",
  "height": 175,
  "weight": 70
}
```

##### Request 6: Create a New Site (Edge Function)
```
POST {{base_url}}/functions/v1/sites
Headers:
  Authorization: Bearer {{service_key}}
Body (JSON):
{
  "site_name": "Test Site New",
  "client_name": "Test Client",
  "address": "Test Address, Bihar",
  "latitude": 25.6100,
  "longitude": 85.1400,
  "geofence_radius": 150
}
```

##### Request 7: Assign Guard to Site (Edge Function)
```
POST {{base_url}}/functions/v1/assignments
Headers:
  Authorization: Bearer {{service_key}}
Body (JSON):
{
  "guard_id": "GUARD_ID_FROM_RESPONSE",
  "site_id": "SITE_ID_FROM_RESPONSE",
  "shift_type": "day"
}
```

---

### Method 3: Using Supabase Dashboard (Quickest Visual Check)

1. **Table Editor** → Click each table → verify data exists
2. **SQL Editor** → Run test queries:

```sql
-- Check all tables have data
SELECT 'users' as tbl, COUNT(*) FROM users
UNION ALL SELECT 'guards', COUNT(*) FROM guards
UNION ALL SELECT 'sites', COUNT(*) FROM sites
UNION ALL SELECT 'assignments', COUNT(*) FROM guard_site_assignments
UNION ALL SELECT 'candidates', COUNT(*) FROM candidates;

-- Test Haversine distance (Patna Main Office to Boring Road)
SELECT calculate_distance(25.6120, 85.1580, 25.6070, 85.1230) as distance_meters;
-- Expected: ~3700 meters (3.7 km)

-- Test geo-fence check
SELECT * FROM is_within_geofence(25.6121, 85.1581, 'f0000000-0000-0000-0000-000000000001');
-- Expected: within_fence = true (very close to site)

-- Test attendance validation trigger
INSERT INTO attendance (guard_id, site_id, shift_type, check_in_time, attendance_date, check_in_latitude, check_in_longitude)
VALUES ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day', NOW(), CURRENT_DATE, 25.6120, 85.1580);
-- Should succeed ✅

-- Try duplicate check-in (same guard, same day, same shift)
INSERT INTO attendance (guard_id, site_id, shift_type, check_in_time, attendance_date, check_in_latitude, check_in_longitude)
VALUES ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'day', NOW(), CURRENT_DATE, 25.6120, 85.1580);
-- Should FAIL ❌ with: "Guard has already checked in for this shift today"

-- Test daily summary
SELECT * FROM get_daily_attendance_summary(CURRENT_DATE);

-- Test auto-deactivation: assign guard to new site
INSERT INTO guard_site_assignments (guard_id, site_id, shift_type, is_active)
VALUES ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'day', true);

-- Check old assignment auto-deactivated
SELECT * FROM guard_site_assignments WHERE guard_id = 'e0000000-0000-0000-0000-000000000001';
-- Only the NEW assignment should be is_active = true
```

3. **Edge Functions** → **Logs** → Check function execution logs for errors

---

## PART 5: Troubleshooting

| Problem | Solution |
|---------|----------|
| Migration fails | Run migrations ONE AT A TIME in order. Check for typos. |
| RLS blocks everything | Make sure you're using `service_role_key` (not `anon_key`) for admin operations |
| Edge function 500 error | Check **Dashboard → Edge Functions → Logs** for error details |
| "Function not found" | Make sure you deployed: `npx supabase functions deploy FUNCTION_NAME` |
| Storage upload fails | Check bucket exists in **Dashboard → Storage** |
| JWT errors | Verify `SUPABASE_JWT_SECRET` is set correctly in secrets |

---

## PART 6: Quick Reference — All API Endpoints

### Direct Database (Supabase REST API)
```
GET  /rest/v1/users?select=*
GET  /rest/v1/guards?select=*,users(name,phone)
GET  /rest/v1/sites?select=*
GET  /rest/v1/guard_site_assignments?select=*
GET  /rest/v1/attendance?select=*
GET  /rest/v1/payroll?select=*
GET  /rest/v1/candidates?select=*
GET  /rest/v1/uniforms?select=*
GET  /rest/v1/inspections?select=*
GET  /rest/v1/notifications?select=*
```

### Edge Functions (13 Total)
```
POST /functions/v1/auth-verify-otp    — Login with OTP
POST /functions/v1/auth-refresh       — Refresh token

GET/POST/PUT/DELETE /functions/v1/manage-users    — User CRUD
GET/POST/PUT        /functions/v1/guards          — Guard management
GET/POST/PUT        /functions/v1/sites           — Site management
GET/POST/DELETE     /functions/v1/assignments     — Guard-Site assignments
GET/POST/PUT        /functions/v1/attendance      — GPS check-in/out (geofenced)
GET/POST/PUT        /functions/v1/payroll         — Salary generation & approval
GET/POST/PUT        /functions/v1/candidates      — Recruitment pipeline
GET/POST/PUT        /functions/v1/uniforms        — Uniform tracking & payment
GET/POST            /functions/v1/inspections     — Site inspections & incidents
GET/POST/PUT        /functions/v1/notifications   — In-app notifications
GET                 /functions/v1/dashboard       — Overview, reports, summaries
```

All endpoints prefixed with: `https://YOUR_PROJECT_REF.supabase.co`

See `docs/API_REFERENCE.md` for complete request/response documentation.
