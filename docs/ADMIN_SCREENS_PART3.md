# Pan India Security — Admin Flow: Screen-by-Screen Design Specification
## PART 3: More Menu, Recruitment, Uniforms, Notifications, Settings, Reports

---

## SCREEN 11: MORE MENU

**Screen ID:** `ADM-011`
**Route:** `/admin/more`
**Purpose:** Entry point for secondary admin features not in the main tabs.

### Header
- Background: `#002752`
- Title: "More" — 20px, SemiBold, White

### Admin Profile Card (Top)
- White bg, 12px radius, margin 16px, padding 16px
- Avatar (56px) + Name (18px, SemiBold) + Role badge "Admin" (bg `#002752`, text white, pill)
- Phone: 14px, `#43474f`

### Menu Items List
- Each item is a row:
  - Left: Icon circle (36px, bg `#E8EEF6`, icon 18px `#1a3d6d`)
  - Center: Label (16px, Regular, `#1a1c1f`) + Subtitle (12px, `#747780`)
  - Right: `ChevronRight` (18px, `#c3c6d0`)
  - Row height: 64px
  - Divider: 1px `#eeedf2` between rows
  - Press: bg `#F0F2F5`

| Icon | Label | Subtitle | Badge | Navigate To |
|------|-------|----------|-------|-------------|
| `Receipt` | Payroll | Manage salaries | "3 pending" amber pill | Payroll List |
| `Users` | Recruitment | Candidate pipeline | "5 new" blue pill | Candidate List |
| `Shirt` | Uniforms | Track issued items | — | Uniform List |
| `ClipboardCheck` | Inspections | Site inspection reports | — | Inspection List |
| `FileText` | Reports | Export data | — | Reports Screen |
| `Bell` | Notifications | Alerts & reminders | "4" red badge | Notification Center |
| `Settings` | Settings | App preferences | — | Settings Screen |

### Bottom Section
- App version: "v1.0.0" — 12px, `#c3c6d0`, center
- "Logout" button: text `#E74C3C`, icon `LogOut`, no background, center

---

## SCREEN 12: CANDIDATE LIST (RECRUITMENT)

**Screen ID:** `ADM-012`
**Route:** `/admin/recruitment`
**API Endpoint:** `GET /functions/v1/candidates`
**Purpose:** View and manage the recruitment pipeline.

### Header
- Background: `#002752`
- Left: `ArrowLeft` back
- Title: "Recruitment" — 20px, SemiBold, White

### Pipeline Stats Row (Horizontal scroll)
- 4 mini stat cards, scrollable horizontally, 8px gap
- Each: bg white, radius 8px, padding 12px, width 90px
  - Number: 24px, Bold
  - Label: 10px, `#747780`

| Stat | Color | Sample |
|------|-------|--------|
| New | `#2980B9` | 5 |
| In Progress | `#F39C12` | 8 |
| Selected | `#27AE60` | 2 |
| Hired (month) | `#002752` | 3 |

### Filter Tabs
- Full-width scrollable tabs
- Tabs: `All`, `New`, `Contacted`, `Interested`, `Interview`, `Selected`, `Hired`, `Rejected`
- Active tab: text `#002752`, bottom border 2px `#b02d21`
- Inactive: text `#747780`

### Search Bar
- Placeholder: "Search candidates..."

### Candidate Cards
```
┌──────────────────────────────────────┐
│ [Avatar]  Rakesh Kumar      [New 🔵]│
│           📞 9200000001             │
│           🎓 10th Pass · 2 yrs exp  │
│           📍 Patna                   │
│           💰 Expected: ₹13,000      │
│─────────────────────────────────────│
│  Added by: Priya Singh · 3 days ago │
└──────────────────────────────────────┘
```

- **Status pill colors:**
  - New: bg `#E3F2FD`, text `#2980B9`
  - Contacted: bg `#E8F5E9`, text `#27AE60`
  - Interested: bg `#FFF3E0`, text `#F39C12`
  - Interview Scheduled: bg `#F3E5F5`, text `#8E24AA`
  - Selected: bg `#E8F8EF`, text `#27AE60`
  - Hired: bg `#002752`, text white
  - Rejected: bg `#FFEBEE`, text `#E74C3C`

- **Tap:** navigate to Candidate Detail

### FAB
- "+" → Add Candidate form

---

## SCREEN 13: CANDIDATE DETAIL

**Screen ID:** `ADM-013`
**Route:** `/admin/recruitment/:id`
**API Endpoint:** `GET /functions/v1/candidates?id=UUID`

### Header
- Back + Title: Candidate name
- Right: `MoreVertical`

### Profile Card
- Avatar (64px) + Name + Phone + Status badge
- "📞 Call" and "📝 Edit" quick action circles

### Pipeline Status Stepper
- Horizontal stepper showing all stages
- Width: full screen, horizontally scrollable if needed
- Each step: circle (28px) + label below

```
[●]───[●]───[●]───[○]───[○]───[○]
New  Contact Interest Interview Select Hired
```

- Completed: filled circle `#27AE60`, line `#27AE60`
- Current: filled circle `#002752`, pulsing animation
- Future: hollow circle `#c3c6d0`, line `#c3c6d0`
- Rejected: `X` in circle, `#E74C3C`

### Details Card
| Field | Value |
|-------|-------|
| Phone | 9200000001 |
| Education | 10th Pass |
| Experience | 2 years |
| Height | 172 cm |
| Weight | 68 kg |
| Preferred Location | Patna |
| Salary Expectation | ₹13,000 |
| Availability | Immediately |

### Recruiter Notes
- Card with notes text, multiline
- "Add Note" button to append
- Shows recruiter name + timestamp per note

### Action Buttons

**If status is NOT "selected" or "hired":**
- "Update Status" — dropdown button
  - Opens bottom sheet with next possible status options
  - Each option is a row with icon + label + description

**If status = "selected":**
- "Convert to Guard" — primary button bg `#27AE60`, text white, full width
  - On tap: opens pre-filled guard form
  - Pre-fills: name, phone from candidate
  - Admin enters: base_salary, shift_type
  - On confirm: guard record created, candidate status → "hired"

**If status = "hired":**
- "✅ Hired" — disabled green badge
- "View Guard Profile →" link

**If status = "rejected":**
- "Rejected" — red badge
- "Reopen Candidate" link

---

## SCREEN 14: ADD CANDIDATE FORM

**Screen ID:** `ADM-014`
**Route:** `/admin/recruitment/new`
**API Endpoint:** `POST /functions/v1/candidates`

### Header
- `X` close + "Add Candidate"

### Form Fields

| Field | Type | Placeholder | Required |
|-------|------|-------------|----------|
| Full Name | TextInput | "Candidate full name" | ✅ |
| Phone | TextInput, numeric | "10-digit phone" | ✅ |
| Height (cm) | TextInput, numeric | "Height in cm" | Optional |
| Weight (kg) | TextInput, numeric | "Weight in kg" | Optional |
| Education | Dropdown | "Select education" | Optional |
| Experience (years) | TextInput, numeric | "Years of experience" | Optional |
| Preferred Location | TextInput | "Preferred work location" | Optional |
| Salary Expectation | TextInput, numeric | "Expected salary (₹)" | Optional |
| Availability Date | Date Picker | "When available to join" | Optional |
| Notes | MultilineTextInput | "Additional notes..." | Optional |

### Submit: "Add Candidate" — bg `#b02d21`

---

## SCREEN 15: UNIFORM MANAGEMENT

**Screen ID:** `ADM-015`
**Route:** `/admin/uniforms`
**API Endpoint:** `GET /functions/v1/uniforms`

### Header
- Back + "Uniforms"

### Filter Chips
- `All`, `Pending`, `Partial`, `Paid`, `Deducted`

### Summary Stats Row
- Total Issued: count
- Pending Amount: ₹XX,XXX (in red)
- Collected: ₹XX,XXX (in green)

### Uniform Records List
- Grouped by guard name (section headers)

**Each record:**
```
┌──────────────────────────────────────┐
│ 👕 Uniform Set         ₹2,500      │
│    Issued: 15 Jan 2025              │
│    Status: [Pending ⏳]             │
│    Paid: ₹0 / ₹2,500               │
│                      [Record Payment]│
└──────────────────────────────────────┘
```

- **Item icon by type:**
  - Uniform Set: `Shirt`
  - Shoes: `Footprints`
  - Belt: `Minus` (horizontal)
  - Cap: `HardHat`
  - ID Card: `CreditCard`
  - Torch: `Flashlight`
  - Baton/Whistle: `Shield`

- **Status badges:** Same color coding (Pending=amber, Partial=blue, Paid=green, Deducted=gray)
- **"Record Payment"** button: opens bottom sheet
  - Amount input (numeric)
  - "Full Payment" toggle (auto-fills remaining)
  - "Save" button

### FAB: "Issue Uniform" → Bottom sheet form

### Issue Uniform Form (Bottom Sheet)
| Field | Type |
|-------|------|
| Select Guard | Searchable dropdown (guard list) |
| Item | Dropdown: Uniform Set, Shoes, Belt, Cap, ID Card, Torch, Baton, Whistle, Other |
| Cost (₹) | Numeric input, pre-fills based on item |
| Remarks | Text input |

---

## SCREEN 16: NOTIFICATION CENTER

**Screen ID:** `ADM-016`
**Route:** `/admin/notifications`
**API Endpoint:** `GET /functions/v1/notifications`

### Header
- Back + "Notifications"
- Right: "Mark All Read" — 14px, `#2980B9`

### Notification List
- Each notification item:

```
┌──────────────────────────────────────┐
│ 🔵 [Icon]  Shift Reminder           │
│            Your shift starts in...   │
│            2 hours ago               │
└──────────────────────────────────────┘
```

- **Unread indicator:** 8px blue dot (`#2980B9`) on left edge
- **Read items:** no dot, slightly muted bg
- **Icon by type (in 36px circle):**
  - `shift_reminder`: `Clock` in `#E8EEF6`
  - `attendance_alert`: `UserCheck` in `#FFEBEE`
  - `salary_generated`: `Wallet` in `#E8F8EF`
  - `inspection_reminder`: `ClipboardCheck` in `#FFF3E0`
  - `recruitment_update`: `Users` in `#E3F2FD`
  - `general`: `Bell` in `#F0F2F5`
- **Title:** 14px, SemiBold (Bold if unread), `#1a1c1f`
- **Body:** 13px, Regular, `#43474f`, max 2 lines
- **Timestamp:** 11px, `#747780`
- **Tap:** mark as read + navigate to relevant screen
- **Swipe left:** "Delete" button (red)

### Empty State
- Icon: `BellOff` — 64px, `#c3c6d0`
- "You're all caught up! 🎉"
- "No new notifications"

---

## SCREEN 17: ADMIN SETTINGS

**Screen ID:** `ADM-017`
**Route:** `/admin/settings`

### Header
- Back + "Settings"

### Profile Section
- Avatar (48px) + Name + Phone + "Admin" badge
- "Edit Profile" link

### Settings Groups

**App Settings**
| Setting | Type | Default |
|---------|------|---------|
| Language | Dropdown: English / Hindi | English |
| Push Notifications | Toggle | ON |
| Dark Mode | Toggle | OFF |

**Data & Reports**
| Action | Icon | Type |
|--------|------|------|
| Export Attendance Report | `Download` | Button → date range picker → generates PDF |
| Export Payroll Report | `Download` | Button → month picker → generates PDF |
| Export Guard List | `Download` | Button → generates CSV |

**App Configuration (Admin-only)**
| Setting | Type | Default |
|---------|------|---------|
| Default Geofence Radius | Slider (50–500m) | 100m |
| Late Penalty Amount | Numeric input (₹) | ₹200 |
| Overtime Rate Multiplier | Dropdown: 1x, 1.5x, 2x | 1.5x |
| Attendance Grace Period | Dropdown: 15/30/45/60 min | 30 min |

**About**
- App Version: "1.0.0"
- Terms & Conditions → webview
- Privacy Policy → webview
- Contact Support → email/phone

### Logout Button
- Full width, margin 24px top
- bg `#FFFFFF`, border 1px `#E74C3C`
- Text: "Logout" — 16px, SemiBold, `#E74C3C`
- Icon: `LogOut` left of text
- On tap: confirmation dialog → clear session → navigate to Login

---

## SCREEN 18: INSPECTION LIST (Admin View)

**Screen ID:** `ADM-018`
**Route:** `/admin/inspections`
**API Endpoint:** `GET /functions/v1/inspections`

### Header: Back + "Inspections"

### Filters
- Date range picker (From → To)
- Site filter dropdown
- Chips: `All`, `With Incidents`, `No Incidents`

### Inspection Cards
```
┌──────────────────────────────────────┐
│ 🏢 Patna Main Office               │
│ 📅 20 May 2026, 2:30 PM            │
│ 👤 Inspector: Sunil Verma          │
│ ✅ 3 Present  ❌ 1 Absent           │
│ [🔴 Incident: High]                │
└──────────────────────────────────────┘
```

- Incident badge: severity color-coded (Low=blue, Medium=amber, High=red, Critical=dark red pulsing)
- Tap → Inspection Detail

---

## SCREEN 19: INSPECTION DETAIL (Admin View)

**Screen ID:** `ADM-019`
**Route:** `/admin/inspections/:id`

### Content Sections

**Site & Inspector Info**
- Site name, address
- Inspector name, date/time
- GPS coordinates: "Submitted from: 25.612, 85.158"

**Guard Verification**
- Two lists:
  - ✅ Present: guard names with green checkmarks
  - ❌ Absent: guard names with red X marks

**Photos**
- Horizontal scrollable gallery
- Tap photo → full screen viewer with pinch-to-zoom
- Photo count indicator: "1/5"

**Remarks**
- Full text of inspector's remarks

**Incident Details (if reported)**
- Red card bg `#FFF5F5`, left border 3px `#E74C3C`
- Severity badge: color-coded pill
- Description text
- Photos related to incident

---

## SCREEN 20: REPORTS SCREEN

**Screen ID:** `ADM-020`
**Route:** `/admin/reports`

### Header: Back + "Reports"

### Report Type Cards
- Grid of report type cards (2 columns)
- Each card: icon + title + description + "Generate" button

| Report | Icon | Description |
|--------|------|-------------|
| Daily Attendance | `CalendarCheck` | Today's attendance summary |
| Monthly Attendance | `Calendar` | Full month per guard/site |
| Payroll Summary | `Receipt` | Monthly salary breakdown |
| Recruitment Pipeline | `Users` | Candidate funnel status |
| Inspection History | `ClipboardCheck` | All inspections with filters |
| Guard Directory | `Shield` | All guards with details |

### Report Generation Flow
1. Tap card → Bottom sheet with date/month/filter options
2. "Generate Report" button
3. Loading: "Generating report..."
4. Preview: scrollable report view
5. Actions: "Download PDF" + "Share"

---

## COMMON COMPONENTS REFERENCE

### Bottom Sheet
- Backdrop: `rgba(0,0,0,0.5)`
- Sheet bg: white, top radius 16px
- Handle: 32px × 4px, bg `#c3c6d0`, centered, margin-top 8px
- Max height: 90% screen, scrollable content
- Swipe down to dismiss

### Confirmation Dialog
- Centered modal, bg white, radius 16px, padding 24px
- Backdrop: `rgba(0,0,0,0.5)`
- Title: 18px, Bold, centered
- Body: 14px, Regular, `#43474f`, centered
- Buttons row: "Cancel" (outlined) + "Confirm" (filled)
- Destructive variant: confirm button is `#E74C3C`

### Toast Notifications
- Position: top of screen, below status bar
- Height: 56px, border-radius 12px, margin 16px horizontal
- Shadow: `0 4px 12px rgba(0,0,0,0.15)`
- Variants:
  - Success: bg `#E8F8EF`, left strip `#27AE60`, icon `CheckCircle`
  - Error: bg `#FFEBEE`, left strip `#E74C3C`, icon `XCircle`
  - Warning: bg `#FFF3E0`, left strip `#F39C12`, icon `AlertTriangle`
  - Info: bg `#E3F2FD`, left strip `#2980B9`, icon `Info`
- Auto-dismiss: 3 seconds
- Swipe up to dismiss

### Loading Skeleton
- Shimmer animation: linear gradient sweep left-to-right
- Colors: `#eeedf2` → `#faf9fd` → `#eeedf2`
- Duration: 1.5s, infinite
- Apply to: cards, text blocks, avatars (matching their shapes)

### Pull-to-Refresh
- Custom indicator: shield icon (`Shield`) rotating 360° continuously
- Trigger distance: 60px
- Colors: `#002752`

---

## ADMIN SCREEN INVENTORY (TOTAL: 20 SCREENS)

| # | Screen ID | Screen Name | Priority |
|---|-----------|-------------|----------|
| 1 | ADM-001 | Admin Dashboard | P0 |
| 2 | ADM-002 | Guard List | P0 |
| 3 | ADM-003 | Guard Detail (4 tabs) | P0 |
| 4 | ADM-004 | Add/Edit Guard Form | P0 |
| 5 | ADM-005 | Site List | P0 |
| 6 | ADM-006 | Site Detail | P0 |
| 7 | ADM-007 | Add/Edit Site Form | P0 |
| 8 | ADM-008 | Assign Guard to Site | P0 |
| 9 | ADM-009 | Payroll List | P0 |
| 10 | ADM-010 | Salary Slip Detail | P0 |
| 11 | ADM-011 | More Menu | P0 |
| 12 | ADM-012 | Candidate List | P1 |
| 13 | ADM-013 | Candidate Detail | P1 |
| 14 | ADM-014 | Add Candidate Form | P1 |
| 15 | ADM-015 | Uniform Management | P1 |
| 16 | ADM-016 | Notification Center | P1 |
| 17 | ADM-017 | Admin Settings | P1 |
| 18 | ADM-018 | Inspection List | P1 |
| 19 | ADM-019 | Inspection Detail | P1 |
| 20 | ADM-020 | Reports Screen | P2 |

---

## SUGGESTED STITCH GENERATION ORDER

1. **Start with shared components:** Tab bar, Search bar, Filter chips, Stat cards, Status badges, FAB
2. **Dashboard** (ADM-001) — validates design system
3. **Guard List** (ADM-002) → **Guard Detail** (ADM-003) → **Add Guard Form** (ADM-004)
4. **Site List** (ADM-005) → **Site Detail** (ADM-006) → **Add Site Form** (ADM-007)
5. **Assign Guard** (ADM-008)
6. **More Menu** (ADM-011)
7. **Payroll List** (ADM-009) → **Salary Slip** (ADM-010)
8. **Candidate List** (ADM-012) → **Candidate Detail** (ADM-013) → **Add Candidate** (ADM-014)
9. **Uniforms** (ADM-015)
10. **Notifications** (ADM-016) → **Settings** (ADM-017)
11. **Inspections** (ADM-018, ADM-019) → **Reports** (ADM-020)
