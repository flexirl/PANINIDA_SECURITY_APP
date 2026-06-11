# Pan India Security — Admin Flow: Screen-by-Screen Design Specification
## PART 2: Sites Module, Payroll, Assignments

---

## SCREEN 5: SITE LIST

**Screen ID:** `ADM-005`
**Route:** `/admin/sites`
**API Endpoint:** `GET /functions/v1/sites`
**Purpose:** Browse all client sites, view status, guard counts.

### Header
- Background: `#002752`
- Title: "Sites" — 20px, SemiBold, White
- Right: `Bell` icon with badge

### Search Bar
- Same styling as Guard List search bar
- Placeholder: "Search by site or client name..."

### Filter Chips
- Chips: `All` (default active), `Active`, `Inactive`
- Same styling as Guard List filter chips

### Site Cards List
- Gap between cards: 12px
- Padding: 16px horizontal

**Each Site Card:**
```
┌──────────────────────────────────────────────┐
│  [Building icon 36px]                        │
│  Site Name                    [Active badge] │
│  Client Name                                 │
│  📍 Address line (truncated to 1 line)       │
│─────────────────────────────────────────────│
│  👥 3 Day Guards  ·  🌙 2 Night Guards      │
│  📞 Amit Jha · 9876543210                   │
└──────────────────────────────────────────────┘
```

- **Icon area:** 36px circle, bg `#E8EEF6`, icon `Building2` 18px `#1a3d6d`
- **Site name:** 16px, SemiBold, `#1a1c1f`
- **Client name:** 14px, Regular, `#43474f`
- **Address:** 12px, Regular, `#747780`, max 1 line with ellipsis
- **Status badge:** 
  - Active: bg `#E8F8EF`, text `#27AE60`, "Active"
  - Inactive: bg `#FFEBEE`, text `#E74C3C`, "Inactive"
- **Bottom section** (below 1px divider):
  - Guard counts with day/night icons
  - Contact info: person name + phone
  - All in 12px, `#747780`
- **Tap:** navigate to Site Detail

### FAB
- Same as Guard List FAB
- Icon: `Plus`
- Navigate to: Add Site Form

### Empty State
- Icon: `Building2` — 64px, `#c3c6d0`
- Title: "No sites added yet"
- Subtitle: "Add a client site to get started"
- Button: "Add Site"

---

## SCREEN 6: SITE DETAIL

**Screen ID:** `ADM-006`
**Route:** `/admin/sites/:id`
**API Endpoint:** `GET /functions/v1/sites?id=UUID`
**Purpose:** Full site info including map, assigned guards, recent attendance, inspections.

### Header
- Background: `#002752`
- Left: `ArrowLeft` back (24px, white)
- Title: Site name — 18px, SemiBold, White
- Right: `MoreVertical` (options menu)

### Action Menu Bottom Sheet
- "Edit Site" → Edit Site Form
- "Toggle Active/Inactive" → confirmation
- "View on Map" → full screen map
- "Delete Site" → destructive confirmation

### Map Section
- Height: 200px
- Shows site pin (custom marker: red `#b02d21` pin with shield icon)
- Geofence circle: dashed border, fill `rgba(26,61,109,0.1)`, stroke `#1a3d6d`
- Radius label on circle edge: "100m" in a small pill
- Map controls: zoom in/out buttons (bottom-right of map)

### Site Info Card
- Below map, margin -20px top (overlapping map slightly)
- White bg, 12px radius, shadow, padding 16px

| Row | Content |
|-----|---------|
| Site Name | 20px, Bold, `#1a1c1f` |
| Client | `Briefcase` 16px icon + "ABC Corp" — 14px, `#43474f` |
| Address | `MapPin` 16px icon + full address — 14px, `#43474f` |
| Geofence | `Target` 16px icon + "100m radius" — 14px, `#43474f` |
| Contact | `User` 16px icon + "Amit Jha" — 14px, `#43474f` |
| Phone | `Phone` 16px icon + "9876543210" — 14px, `#2980B9` (tappable, opens dialer) |

### Shift Timings Card
- Title: "Shift Timings" — 16px, SemiBold
- Two columns:

| Shift | Timing |
|-------|--------|
| ☀️ Day Shift | 08:00 AM → 08:00 PM |
| 🌙 Night Shift | 08:00 PM → 08:00 AM |

- Each in a mini card: bg `#F0F2F5`, border-radius 8px, padding 12px

### Assigned Guards Section
- Title: "Assigned Guards (5)" — 16px, SemiBold
- "Assign Guard" button — small outlined `#002752`, right of title
- Guard mini-cards (compact list):

**Each guard row:**
- Avatar (32px) + Name (14px, SemiBold) + Shift badge (Day/Night) + Status dot (green/gray)
- Tap → Guard Detail
- Swipe left → "Remove" button (red)

**If no guards assigned:**
- "No guards assigned to this site" — 14px, `#747780`, centered
- "Assign Guard" button — primary `#b02d21`

### Today's Attendance Section
- Title: "Today's Attendance" — 16px, SemiBold
- Mini stat: "3/5 Present" — with colored bar

**Attendance rows for today:**
- Guard name + Check-in time + Status badge
- Green dot for checked-in, gray for not yet, red for absent
- Example:
  - "Ravi Yadav — ✅ 8:05 AM" 
  - "Sanjay Paswan — ⏳ Not checked in"

### Recent Inspections Section
- Title: "Recent Inspections" — 16px, SemiBold
- Last 3 inspections:
  - Date + Inspector name + guards present/absent count
  - Incident badge if any (red pill "Incident Reported")
  - Tap → Inspection Detail

---

## SCREEN 7: ADD / EDIT SITE FORM

**Screen ID:** `ADM-007`
**Route:** `/admin/sites/new` or `/admin/sites/:id/edit`
**API Endpoint:** `POST /functions/v1/sites` or `PUT /functions/v1/sites?id=UUID`

### Header
- Background: `#002752`
- Left: `X` close
- Title: "Add Site" or "Edit Site"

### Map Picker Section
- Height: 200px at top of form
- Map with draggable pin
- Instruction overlay: "Tap to set site location" — semi-transparent black bar at bottom of map
- After pin placed: show coordinates below map
  - "📍 25.6120, 85.1580" — 12px, `#747780`
- Cross-hair icon at center of map when dragging

### Form Fields

**Section 1: Site Information**

| Field | Type | Placeholder | Required | Notes |
|-------|------|-------------|----------|-------|
| Site Name | TextInput | "Enter site name" | ✅ | Min 3 chars |
| Client Name | TextInput | "Client/company name" | ✅ | |
| Address | MultilineTextInput | "Full site address" | ✅ | Auto-fill from map pin reverse geocode |

**Section 2: Geofence Configuration**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Geofence Radius | Slider | 100m | Range: 50m–500m, step: 10m |

- Slider track: `#c3c6d0`, filled portion: `#002752`
- Thumb: 24px circle, white with border `#002752`
- Current value shown above thumb: "100m" in pill
- Below slider: labels "50m" (left) and "500m" (right) in 11px `#747780`
- Map updates live: geofence circle resizes as slider moves

**Section 3: Shift Timings**

| Field | Type | Default |
|-------|------|---------|
| Day Shift Start | Time Picker | 08:00 AM |
| Day Shift End | Time Picker | 08:00 PM |
| Night Shift Start | Time Picker | 08:00 PM |
| Night Shift End | Time Picker | 08:00 AM |

- Time picker: opens native time picker on tap
- Display: pill-shaped, bg `#eeedf2`, showing formatted time

**Section 4: Contact Details**

| Field | Type | Placeholder | Required |
|-------|------|-------------|----------|
| Contact Person | TextInput | "Site contact name" | Optional |
| Contact Phone | TextInput, numeric | "10-digit phone" | Optional |

### Submit Button
- Fixed bottom: "Save Site" — bg `#b02d21`, white text
- Same styling as Guard form submit

---

## SCREEN 8: ASSIGN GUARD TO SITE

**Screen ID:** `ADM-008`
**Route:** `/admin/sites/:id/assign` (or presented as bottom sheet)
**API Endpoint:** `POST /functions/v1/assignments`
**Purpose:** Pick an unassigned guard and assign them to a site with shift type.

### Presentation
- Can be a **full screen** or a **bottom sheet** (70% height)

### Site Info Header
- Card at top showing site name + address (non-editable, for context)
- bg `#E8EEF6`, padding 12px, radius 8px

### Shift Type Selector
- Label: "Select Shift" — 14px, SemiBold
- Two toggle buttons side by side:
  - "☀️ Day Shift" and "🌙 Night Shift"
  - Active: bg `#002752`, text white
  - Inactive: bg `#FFFFFF`, border 1px `#c3c6d0`, text `#43474f`
  - Height: 44px, border-radius 8px, 8px gap

### Search Available Guards
- Search bar: "Search guard by name..."
- Shows only guards that are NOT currently assigned (or all with "already assigned" indicator)

### Guard Selection List
- Each row:
  - Radio button (left) + Avatar (36px) + Name + Phone + Current status
  - Already assigned guards: shown grayed out with "Assigned to [Site]" label, radio disabled
  - Unassigned guards: full opacity, selectable

### Confirmation
- On "Assign" button tap → Confirmation dialog:
  - Title: "Confirm Assignment"
  - Body: "Assign **Ravi Yadav** to **Patna Main Office** (Day shift)?"
  - Buttons: "Cancel" (outlined) + "Confirm" (primary red `#b02d21`)

### Success State
- Toast notification: "✅ Ravi assigned to Patna Main Office"
- Auto-navigate back to Site Detail

---

## SCREEN 9: PAYROLL LIST

**Screen ID:** `ADM-009`
**Route:** `/admin/payroll`
**API Endpoint:** `GET /functions/v1/payroll?month=2026-05`
**Purpose:** Monthly payroll overview, generate, approve, and manage salary slips.

### Header
- Background: `#002752`
- Title: "Payroll" — 20px, SemiBold, White
- Left: `ArrowLeft` back

### Month Picker
- Horizontal row, centered
- `ChevronLeft` (24px, `#002752`) + "May 2026" (18px, SemiBold, `#1a1c1f`) + `ChevronRight`
- Tap month text → opens month/year picker bottom sheet

### Status Filter Chips
- Chips: `All`, `Draft`, `Generated`, `Approved`, `Paid`
- Same chip styling as other screens

### Summary Card
- Background: gradient from `#002752` to `#1a3d6d`
- Border-radius: 12px
- Padding: 20px
- Text color: all white

```
┌──────────────────────────────────────┐
│  MAY 2026 PAYROLL SUMMARY           │
│                                      │
│  Total Guards: 45                    │
│  Total Salary: ₹5,45,000            │
│                                      │
│  ✅ Approved: 40  ⏳ Pending: 5     │
│                                      │
│  [Generate Payroll]  [Approve All]   │
└──────────────────────────────────────┘
```

- "Total Salary": 24px, Bold, White
- Action buttons:
  - "Generate Payroll" — shown only if payroll not yet generated for this month
    - bg white, text `#002752`, 14px SemiBold, border-radius 8px, height 40px
  - "Approve All" — shown only if there are unapproved entries
    - outlined white border, text white, same dimensions

### Guard Payroll List
- Each card:
```
┌──────────────────────────────────────┐
│ [Avatar] Ravi Yadav        ₹10,752  │
│          Patna Main Office  [Badge]  │
│          26/31 days present          │
└──────────────────────────────────────┘
```

- **Avatar:** 40px circle
- **Name:** 14px, SemiBold, `#1a1c1f`
- **Site name:** 12px, Regular, `#747780`
- **Days:** 12px, Regular, `#43474f`
- **Salary amount:** 18px, Bold, `#1a1c1f`, right-aligned
- **Status badge:**
  - Draft: bg `#F0F2F5`, text `#747780`
  - Generated: bg `#FFF3E0`, text `#F39C12`
  - Approved: bg `#E3F2FD`, text `#2980B9`
  - Paid: bg `#E8F8EF`, text `#27AE60`
- **Tap:** navigate to Salary Slip Detail

### Generate Payroll Flow
- Button tap → Loading overlay: "Calculating salary for 45 guards..."
- Progress indicator showing count: "Processing 12/45..."
- On success: list populates with generated entries
- On error: error toast with retry

---

## SCREEN 10: SALARY SLIP DETAIL

**Screen ID:** `ADM-010`
**Route:** `/admin/payroll/:id`
**API Endpoint:** `GET /functions/v1/payroll?id=UUID`
**Purpose:** Detailed salary breakdown for one guard for one month.

### Header
- Background: `#002752`
- Left: `ArrowLeft` back
- Title: "Salary Slip" — 18px, SemiBold, White
- Right: `Download` icon (export as PDF) + `Edit` icon (if editable)

### Guard Info Section
- Card: white bg, 12px radius
- Avatar (48px) + Guard name + Site name + Month
- Employee ID below name

### Salary Breakdown Card
- White bg, 12px radius, shadow

```
┌─────────────────────────────────────┐
│  SALARY SLIP — May 2026             │
│  Guard: Ravi Yadav                  │
│  Site: Patna Main Office            │
│  Employee ID: EMP-001               │
├─────────────────────────────────────┤
│  EARNINGS                           │
│  ──────────────────────             │
│  Base Salary              ₹12,000   │
│  Days Present              26/31    │
│  Pro-rated Salary         ₹10,064   │
│  Overtime (5.5 hrs @1.5x)  ₹  688   │
│                           ─────────  │
│  Total Earnings           ₹10,752   │
├─────────────────────────────────────┤
│  DEDUCTIONS                         │
│  ──────────────────────             │
│  Late Penalty (2×₹200)    ₹   400   │
│  Uniform Dues             ₹ 2,500   │
│  Advance Deduction        ₹     0   │
│                           ─────────  │
│  Total Deductions         ₹ 2,900   │
├─────────────────────────────────────┤
│  NET SALARY               ₹ 7,852   │
│  Status: ✅ APPROVED                │
└─────────────────────────────────────┘
```

**Styling details:**
- Section headers ("EARNINGS", "DEDUCTIONS"): 12px, SemiBold, `#747780`, uppercase
- Row labels: 14px, Regular, `#43474f`
- Row values: 14px, SemiBold, `#1a1c1f`, right-aligned
- Total rows: 16px, Bold, with top divider 1px `#002752`
- Net Salary: 20px, Bold, `#002752`
- Status: badge — same as payroll list status badges
- Divider between sections: 1px `#eeedf2`
- Earnings amounts: `#27AE60` tint
- Deduction amounts: `#E74C3C` tint

### Admin Action Buttons (if status = "generated")
- "Approve" — bg `#27AE60`, text white, full width
- "Edit Adjustments" — outlined `#002752`

### Edit Adjustments Bottom Sheet
- Fields:
  - Overtime Hours: numeric input
  - Penalty Amount: numeric input
  - Uniform Deduction: numeric input
  - Advance Deduction: numeric input
  - Other Deduction: numeric input
  - Reason: text input
- "Save Changes" button
- Live recalculation of net salary shown at bottom

---

*Continued in PART 3: More Menu, Recruitment, Uniforms, Notifications, Settings, Reports*
