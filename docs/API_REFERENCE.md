# Pan India Security — API Reference

**Base URL:** `https://fuztfltbokbnfcvotrrp.supabase.co`

## Authentication

All requests require these headers:

```
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <access_token or service_role_key>
Content-Type: application/json
```

---

## 1. Auth — Verify OTP

| Method | Endpoint |
|--------|----------|
| POST | `/functions/v1/auth-verify-otp` |

**Body:**
```json
{
  "phone": "9999999999",
  "firebase_token": "test_token_dev"
}
```

**Response (200):**
```json
{
  "success": true,
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600,
  "user": { "id": "uuid", "name": "Rajesh", "role": "admin" }
}
```

---

## 2. Auth — Refresh Token

| Method | Endpoint |
|--------|----------|
| POST | `/functions/v1/auth-refresh` |

**Body:**
```json
{ "refresh_token": "eyJ..." }
```

---

## 3. Guards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/functions/v1/guards` | List all guards |
| GET | `/functions/v1/guards?id=UUID` | Get guard detail |
| GET | `/functions/v1/guards?search=Ravi` | Search by name/phone |
| GET | `/functions/v1/guards?status=active` | Filter by employment status |
| POST | `/functions/v1/guards` | Create guard |
| PUT | `/functions/v1/guards?id=UUID` | Update guard |

**Create Body:**
```json
{
  "name": "Guard Name",
  "phone": "9876543210",
  "base_salary": 15000,
  "shift_type": "day",
  "address": "Patna, Bihar",
  "height": 170,
  "weight": 65,
  "education": "10th Pass"
}
```

**Roles:** Admin (all), Manager (read assigned), Guard (read own)

---

## 4. Sites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/functions/v1/sites` | List all sites |
| GET | `/functions/v1/sites?id=UUID` | Get site detail |
| POST | `/functions/v1/sites` | Create site |
| PUT | `/functions/v1/sites?id=UUID` | Update site |

**Create Body:**
```json
{
  "site_name": "Office Name",
  "client_name": "Client Corp",
  "address": "Fraser Road, Patna",
  "latitude": 25.6120,
  "longitude": 85.1580,
  "geofence_radius": 100,
  "contact_person": "Amit Jha",
  "contact_phone": "9876543210"
}
```

**Roles:** Admin (all), Manager/Guard (read only)

---

## 5. Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/functions/v1/assignments` | List assignments |
| GET | `/functions/v1/assignments?guard_id=UUID` | Filter by guard |
| GET | `/functions/v1/assignments?site_id=UUID` | Filter by site |
| POST | `/functions/v1/assignments` | Assign guard to site |
| DELETE | `/functions/v1/assignments?id=UUID` | Unassign (deactivate) |

**Assign Body:**
```json
{
  "guard_id": "e0000000-...",
  "site_id": "f0000000-...",
  "shift_type": "day"
}
```

**Note:** Assigning a guard auto-deactivates previous assignments.

**Roles:** Admin only

---

## 6. Attendance (Geofence-Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/functions/v1/attendance` | Check-in (validates geofence) |
| PUT | `/functions/v1/attendance?id=UUID` | Check-out |
| GET | `/functions/v1/attendance` | List attendance |
| GET | `/functions/v1/attendance?date=2026-05-20` | Filter by date |
| GET | `/functions/v1/attendance?guard_id=UUID` | Filter by guard |
| GET | `/functions/v1/attendance?site_id=UUID` | Filter by site |

**Check-in Body:**
```json
{
  "guard_id": "e0000000-...",
  "latitude": 25.6121,
  "longitude": 85.1581,
  "selfie_url": "https://..."
}
```

**Check-out Body:**
```json
{
  "guard_id": "e0000000-...",
  "latitude": 25.6121,
  "longitude": 85.1581
}
```

**Geofence Logic:**
- Calculates distance using Haversine formula
- Rejects check-in if distance > site's `geofence_radius`
- Returns distance in meters

**Shift Timing Logic:**
- Auto-detects shift from assignment (day/night)
- Marks "late" if beyond 30-minute grace period

**Duplicate Prevention:**
- Only one check-in per guard per day per shift type

**Roles:** Admin, Guard (own only)

---

## 7. Payroll

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/functions/v1/payroll` | Generate monthly payroll |
| GET | `/functions/v1/payroll` | List payroll records |
| GET | `/functions/v1/payroll?id=UUID` | Salary slip detail |
| GET | `/functions/v1/payroll?month=2026-05` | Filter by month |
| GET | `/functions/v1/payroll?status=generated` | Filter by status |
| PUT | `/functions/v1/payroll?id=UUID&action=approve` | Approve payroll |
| PUT | `/functions/v1/payroll?id=UUID&action=paid` | Mark as paid |
| PUT | `/functions/v1/payroll?id=UUID` | Edit adjustments |

**Generate Body:**
```json
{ "month": "2026-05" }
```

**Edit Adjustments Body:**
```json
{
  "advance_deduction": 2000,
  "other_deduction": 500,
  "other_deduction_reason": "Penalty for misconduct"
}
```

**Salary Formula:**
```
Final = Pro-rated Salary + Overtime (1.5x) - Late Penalty (₹200/day) - Uniform Dues - Advances - Other
```

**Status Flow:** `generated → approved → paid`

**Roles:** Admin (all), Guard (read own approved/paid only)

---

## 8. Candidates (Recruitment)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/functions/v1/candidates` | Add candidate |
| GET | `/functions/v1/candidates` | List candidates |
| GET | `/functions/v1/candidates?status=new` | Filter by status |
| GET | `/functions/v1/candidates?search=Rakesh` | Search |
| PUT | `/functions/v1/candidates?id=UUID` | Update candidate |
| POST | `/functions/v1/candidates?id=UUID&action=convert` | Convert to guard |

**Add Body:**
```json
{
  "name": "Rakesh Kumar",
  "phone": "9200000001",
  "height": 172,
  "weight": 68,
  "education": "10th Pass",
  "experience_years": 2,
  "preferred_location": "Patna",
  "salary_expectation": 13000
}
```

**Convert Body:**
```json
{
  "base_salary": 13000,
  "shift_type": "day"
}
```

**Pipeline Statuses:** `new → contacted → interested → interview_scheduled → selected → hired`  
Also: `rejected`

**Roles:** Admin (all), Recruiter (own candidates)

---

## 9. Uniforms

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/functions/v1/uniforms` | Issue uniform item |
| GET | `/functions/v1/uniforms` | List all uniforms |
| GET | `/functions/v1/uniforms?guard_id=UUID` | Filter by guard |
| GET | `/functions/v1/uniforms?status=pending` | Filter by payment |
| PUT | `/functions/v1/uniforms?id=UUID` | Update payment |

**Issue Body:**
```json
{
  "guard_id": "e0000000-...",
  "item_name": "uniform_set",
  "item_cost": 2500,
  "remarks": "New uniform issued"
}
```

**Valid Items:** `uniform_set, shoes, belt, cap, id_card, torch, baton, whistle, other`

**Payment Statuses:** `pending, partial, paid, deducted`

**Roles:** Admin (all), Guard (read own)

---

## 10. Inspections

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/functions/v1/inspections` | Submit inspection |
| GET | `/functions/v1/inspections` | List inspections |
| GET | `/functions/v1/inspections?id=UUID` | Detail |
| GET | `/functions/v1/inspections?site_id=UUID` | Filter by site |
| GET | `/functions/v1/inspections?incidents=true` | Incidents only |

**Submit Body:**
```json
{
  "site_id": "f0000000-...",
  "remarks": "All guards present, area secure",
  "guards_present": ["e0000000-...001", "e0000000-...002"],
  "guards_absent": [],
  "photos": ["https://...photo1.jpg"],
  "latitude": 25.6121,
  "longitude": 85.1581,
  "incident_reported": false
}
```

**With Incident:**
```json
{
  "site_id": "f0000000-...",
  "remarks": "Incident at gate 2",
  "incident_reported": true,
  "incident_severity": "high",
  "incident_description": "Unauthorized entry attempt at gate 2"
}
```

**Incident Severity:** `low, medium, high, critical`

**Roles:** Admin (read all), Manager (own inspections)

---

## 11. Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/functions/v1/notifications` | Create notification |
| GET | `/functions/v1/notifications` | List notifications |
| GET | `/functions/v1/notifications?unread=true` | Unread only |
| PUT | `/functions/v1/notifications?id=UUID` | Mark as read |
| PUT | `/functions/v1/notifications?action=read-all` | Mark all read |

**Create Body (Admin only):**
```json
{
  "user_id": "d0000000-...",
  "title": "Shift Reminder",
  "body": "Your shift starts in 30 minutes",
  "type": "shift_reminder"
}
```

**Types:** `shift_reminder, attendance_alert, salary_generated, inspection_reminder, recruitment_update, general`

---

## 12. Dashboard / Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/functions/v1/dashboard?view=overview` | Dashboard stats |
| GET | `/functions/v1/dashboard?view=attendance&date=2026-05-20` | Daily attendance |
| GET | `/functions/v1/dashboard?view=monthly&month=2026-05` | Monthly report |

**Overview Response:**
```json
{
  "dashboard": {
    "guards": { "total": 10, "active": 8, "assigned": 7 },
    "sites": { "total": 5, "active": 5 },
    "today": { "present": 5, "late": 1, "absent": 1 },
    "payroll": { "pending": 2 },
    "recruitment": { "active_candidates": 5 },
    "incidents": { "last_7_days": 0 }
  }
}
```

**Roles:** Admin, Manager

---

## Error Responses

All errors follow this format:

```json
{
  "error": true,
  "message": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (wrong role or outside geofence) |
| 404 | Not found |
| 405 | Method not allowed |
| 409 | Conflict (duplicate entry) |
| 500 | Internal server error |

---

## GPS Test Coordinates (Patna)

| Location | Lat | Lng | Use For |
|----------|-----|-----|---------|
| Site 1 (Fraser Road) | 25.6120 | 85.1580 | Exact match |
| Inside fence (~14m) | 25.6121 | 85.1581 | ✅ Should pass |
| Edge (~95m) | 25.6128 | 85.1585 | ⚠️ Borderline |
| Outside (~150m) | 25.6133 | 85.1590 | ❌ Should fail |
| Delhi (far away) | 28.6139 | 77.2090 | ❌ Should fail |
