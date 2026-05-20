# Pan India Security — UI/UX Design Brief
## Mobile App — Complete Design Specification for Designers

**App Name:** Pan India Security  
**Platform:** Mobile (Android + iOS) — React Native  
**Industry:** Security Workforce Management  
**Target Users:** Security Guards, Admins, Managers, Recruiters  
**Language:** Hindi + English (bilingual support)

---

## 1. APP OVERVIEW

A mobile app for managing security guard workforce operations. The app serves **4 different user roles**, each with their own navigation and screens. Think of it as 4 mini-apps in one — role is determined at login.

### Business Context
- Security company manages 50-200+ guards across multiple client sites
- Guards need to check-in/out daily with GPS + selfie (like a biometric but mobile)
- Admin needs to manage guards, sites, payroll, and recruitment
- Managers inspect sites and report issues
- The app replaces paper attendance registers and manual salary calculations

---

## 2. USER ROLES & ACCESS

| Role | Who | Primary Actions |
|------|-----|----------------|
| **Guard** | Security guard on field | Check-in/out, view salary, see assigned site |
| **Admin** | Company owner/HR | Manage everything — guards, sites, payroll, recruitment |
| **Manager** | Field supervisor | Inspect sites, verify guard presence, report incidents |
| **Recruiter** | HR executive | Add candidates, manage hiring pipeline |

---

## 3. DESIGN SYSTEM

### 3.1 Color Palette (Based on Brand Logo 🦅)

| Token | Hex | Usage |
|-------|-----|-------|
| **Brand Blue** (Primary) | `#1A3D6D` | Headers, navigation bar, primary text, tabs |
| **Brand Red** (Accent/CTA) | `#C0392B` | Primary buttons, CTAs, active badges, alerts |
| **White** | `#FFFFFF` | Backgrounds, cards, button text |
| **Light Gray** | `#F0F2F5` | Screen backgrounds |
| **Dark Gray** | `#2D3748` | Body text |
| **Medium Gray** | `#A0AEC0` | Placeholder text, inactive icons |
| **Light Blue** | `#E8EEF6` | Secondary backgrounds, card tints |
| **Success Green** | `#27AE60` | Check-in confirmed, present, approved |
| **Danger Red** | `#E74C3C` | Outside geofence, absent, rejected, errors |
| **Warning Amber** | `#F39C12` | Late, pending, attention needed |
| **Info Blue** | `#2980B9` | Links, information badges |

**Logo Colors Reference:**
- Eagle + Wings + Text = `#1A3D6D` (Brand Blue)
- Shield + Circle = `#C0392B` (Brand Red)
- Star = `#FFFFFF` (White)

### 3.2 Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| H1 (Screen Title) | Inter | 24px | Bold (700) |
| H2 (Section Title) | Inter | 20px | SemiBold (600) |
| H3 (Card Title) | Inter | 16px | SemiBold (600) |
| Body | Inter | 14px | Regular (400) |
| Caption | Inter | 12px | Regular (400) |
| Button | Inter | 16px | SemiBold (600) |
| Tab Label | Inter | 11px | Medium (500) |
| Stat Number | Inter | 32px | Bold (700) |

### 3.3 Spacing & Layout

- **Screen padding:** 16px horizontal
- **Card padding:** 16px all sides
- **Card border-radius:** 12px
- **Button height:** 48px
- **Button radius:** 8px
- **Card shadow:** `0 2px 8px rgba(0,0,0,0.08)`
- **Card gap:** 12px between cards
- **Bottom tab bar height:** 64px + safe area

### 3.4 Icon Style
- Use **Lucide Icons** or **Phosphor Icons** (outlined style)
- Icon size in tabs: 24px
- Icon size in cards: 20px
- Icon size in list items: 18px

---

## 4. NAVIGATION ARCHITECTURE

### 4.1 Auth Flow (All Roles — Before Login)

```
Splash Screen → Phone Input → OTP Verification → Role-Based Home
```

### 4.2 Guard Navigation (Bottom Tabs)

```
[🏠 Home]    [📋 Attendance]    [💰 Salary]    [👤 Profile]
```

### 4.3 Admin Navigation (Bottom Tabs)

```
[📊 Dashboard]    [👥 Guards]    [🏢 Sites]    [⋯ More]
```

**"More" menu contains:**
- Payroll
- Recruitment
- Uniforms
- Notifications
- Settings

### 4.4 Manager Navigation (Bottom Tabs)

```
[🏠 Home]    [🔍 Inspections]    [🔔 Notifications]    [👤 Profile]
```

### 4.5 Recruiter Navigation (Bottom Tabs)

```
[🏠 Dashboard]    [👥 Candidates]    [🔔 Notifications]    [👤 Profile]
```

---

## 5. SCREEN-BY-SCREEN SPECIFICATIONS

---

### 5.1 AUTH SCREENS

#### Screen: Splash Screen
- Full-screen Navy Blue background
- Company logo centered (shield icon with "PIS" text)
- Tagline: "Workforce Management System" below logo
- Auto-navigates to login after 2 seconds
- Show loading spinner at bottom

#### Screen: Phone Input
- Clean white background
- Illustration at top (security guard with phone)
- Title: "Welcome" / "स्वागत है"
- Subtitle: "Enter your registered phone number"
- Country code: `+91` (fixed, non-editable, shown as prefix)
- Phone input field (10 digits, numeric keyboard)
- "Send OTP" button (Gold, full width)
- Footer: "Contact admin if you don't have an account"

#### Screen: OTP Verification
- "Verify OTP" title
- Subtitle: "OTP sent to +91 98765XXXXX" (masked)
- 6-digit OTP input (individual boxes, auto-focus next)
- Timer: "Resend OTP in 0:30" → "Resend OTP" link
- "Verify" button (Gold, full width)
- Loading state: button shows spinner

---

### 5.2 GUARD SCREENS (7 screens)

#### Screen: Guard Home
**Purpose:** Guard's daily overview — assigned site, today's status

| Section | Content |
|---------|---------|
| **Header** | "Good Morning, Ravi 👋" + notification bell (with badge count) |
| **Assigned Site Card** | Site name, address, shift type (Day/Night badge), client name |
| **Today's Status Card** | Shows: Not Checked In / ✅ Checked In at 8:05 AM / ✅ Checked Out at 8:02 PM |
| **Quick Stats Row** | This month: X days present, Y days absent, Z days late |
| **Upcoming** | Next shift info, any notifications |

**States:**
- Not checked in → Show "Check In Now" button
- Checked in → Show "Check Out" button
- Checked out → Show "Shift Complete ✅" 
- No assignment → Show "Not assigned to any site. Contact admin."

#### Screen: Guard Attendance (CHECK-IN FLOW)
**Purpose:** GPS-verified check-in with selfie — this is the CORE screen

**Layout (top to bottom):**

1. **Map Section** (top 40% of screen)
   - Show map with:
     - Site location pin (Gold/Navy marker)
     - Guard's current location (Blue dot with pulse animation)
     - Geofence circle (dashed circle around site, 100m radius)
   - Distance indicator: "You are 45m from site" (green if inside, red if outside)

2. **Status Section**
   - ✅ GPS: Inside geofence (green) / ❌ GPS: Outside geofence (red)
   - 📅 Date: May 20, 2026
   - ⏰ Shift: Day (8:00 AM - 8:00 PM)

3. **Selfie Section**
   - Camera preview (circular, 150px diameter)
   - "Take Selfie" button or captured photo thumbnail
   - Must show face clearly

4. **Check-In Button**
   - Large Gold button: "CHECK IN" (full width, 56px height)
   - **Disabled states:**
     - Gray + "Outside Geofence Area" if too far
     - Gray + "Take Selfie First" if no selfie
   - **After check-in:** Button changes to "CHECK OUT" (different color - green)

**Error States:**
- GPS not enabled → "Enable location services" prompt
- Camera denied → "Camera permission needed for selfie"
- Outside geofence → Red banner: "You are 450m away. Move closer to site."
- Already checked in → Show checkout option

#### Screen: Attendance History
- Calendar view at top (horizontal scrollable week view)
- Tap date → shows that day's attendance card:
  - Check-in time + GPS distance
  - Check-out time + GPS distance
  - Hours worked
  - Status badge (Present/Late/Absent)
- Monthly summary: Total present / absent / late
- Color-coded calendar dots: Green=present, Red=absent, Orange=late

#### Screen: Guard Salary Slips
- List of monthly salary slips (cards)
- Each card shows:
  - Month/Year: "May 2026"
  - Status badge: Generated / Approved / Paid
  - Final salary: "₹12,450"
  - "View Details →" link

#### Screen: Salary Slip Detail
**Full breakdown card:**

```
┌─────────────────────────────────┐
│  SALARY SLIP — May 2026        │
│  Guard: Ravi Yadav              │
│  Site: Patna Main Office        │
├─────────────────────────────────┤
│  EARNINGS                       │
│  Base Salary        ₹12,000     │
│  Days Present       26/31       │
│  Pro-rated Salary   ₹10,064     │
│  Overtime (5.5 hrs) ₹   688     │
│                     ──────────  │
│  Total Earnings     ₹10,752     │
├─────────────────────────────────┤
│  DEDUCTIONS                     │
│  Late Penalty (2×₹200) ₹  400  │
│  Uniform Dues          ₹2,500  │
│  Advance Deduction     ₹    0  │
│                     ──────────  │
│  Total Deductions      ₹2,900  │
├─────────────────────────────────┤
│  NET SALARY           ₹7,852   │
│  Status: ✅ PAID                │
└─────────────────────────────────┘
```

#### Screen: Guard Profile
- Profile photo (circular, 100px) with edit icon
- Name, Phone, Employee ID
- Joining Date
- Assigned Site + Shift
- Emergency Contact
- Documents section (view uploaded docs)
- "Contact Admin" button
- App version at bottom

#### Screen: Guard Documents
- List of uploaded documents
- Each item: Document type icon + name + upload date + status (verified/pending)
- Document types: Aadhaar, PAN, Photo, Police Verification, Other

---

### 5.3 ADMIN SCREENS (15+ screens)

#### Screen: Admin Dashboard
**Purpose:** Bird's-eye view of entire operations

**Layout:**

1. **Header:** "Dashboard" + notification bell + settings gear
2. **Stats Cards Row** (2x2 grid):
   - Total Guards: 45 (active count)
   - Active Sites: 12
   - Today's Attendance: 38/45 (with % ring)
   - Pending Payroll: 3

3. **Today's Attendance Bar** (horizontal stacked bar):
   - Present (green): 35
   - Late (orange): 3
   - Absent (red): 7

4. **Quick Actions Row** (horizontal scroll):
   - + Add Guard
   - + Add Site
   - 📋 Generate Payroll
   - 🔍 View Reports

5. **Recent Activity Feed:**
   - "Ravi Yadav checked in at Patna Main Office — 2 min ago"
   - "Manoj Thakur checked out — 15 min ago"
   - "Inspection submitted by Sunil Verma — 1 hr ago"
   - Each item has user avatar, action text, timestamp

6. **Alerts Section** (if any):
   - 🔴 "3 guards absent today"
   - 🟡 "Payroll pending for April 2026"
   - 🔴 "Incident reported at Boring Road Complex"

#### Screen: Guard List (Admin)
- Search bar at top (search by name or phone)
- Filter chips: All | Active | Inactive | Terminated
- List of guard cards:
  - Avatar (first letter or photo)
  - Name, Phone
  - Status badge (Active/Inactive)
  - Assigned site name (or "Unassigned")
  - Shift badge (Day/Night)
  - Tap → Guard Detail

- FAB (Floating Action Button): "+ Add Guard"

#### Screen: Guard Detail (Admin)
**Tabbed layout with 4 tabs:**

**Tab 1 — Profile:**
- Photo + Name + Phone + Employee ID
- Joining date, Education, Height, Weight
- Address, Emergency contact
- Employment status
- Edit button

**Tab 2 — Assignment:**
- Current assignment card (site name, shift, since date)
- "Change Assignment" button → Site picker
- "Remove Assignment" button (red)
- Assignment history list

**Tab 3 — Attendance:**
- This month's attendance calendar
- Stats: Present/Absent/Late counts
- List of recent attendance records

**Tab 4 — Salary:**
- Salary slip list (same as guard view)
- "Generate Payroll" button

#### Screen: Add/Edit Guard Form
**Form fields (scrollable):**

| Field | Type | Required |
|-------|------|----------|
| Full Name | Text | ✅ |
| Phone (10 digit) | Numeric | ✅ |
| Base Salary | Currency (₹) | ✅ |
| Shift Type | Dropdown: Day/Night/Rotational | ✅ |
| Address | Multiline text | Optional |
| Education | Dropdown: 8th/10th/12th/Graduate | Optional |
| Height (cm) | Numeric | Optional |
| Weight (kg) | Numeric | Optional |
| Aadhaar Number | 12-digit masked | Optional |
| PAN Number | Alphanumeric | Optional |
| Emergency Contact | Phone | Optional |
| Upload Photo | Camera/Gallery picker | Optional |
| Upload Documents | File picker (multi) | Optional |

- "Save" button (Gold, full width)
- Form validation: Red error text below invalid fields

#### Screen: Site List (Admin)
- Search bar
- Filter: Active / Inactive
- Site cards:
  - Site name, Client name
  - Address (truncated)
  - Guards assigned count: "3 guards"
  - Active badge
  - Tap → Site Detail

- FAB: "+ Add Site"

#### Screen: Site Detail (Admin)
- **Map** showing site location with geofence circle
- Site name, Client name, Address
- Contact person + phone
- Geofence radius
- Shift timings (Day: 8AM-8PM, Night: 8PM-8AM)

- **Assigned Guards Section:**
  - List of guards with name, shift, status
  - "+ Assign Guard" button

- **Recent Attendance:**
  - Today's check-ins for this site

- **Recent Inspections:**
  - Last 3 inspections with date + inspector

#### Screen: Add/Edit Site Form

| Field | Type | Required |
|-------|------|----------|
| Site Name | Text | ✅ |
| Client Name | Text | ✅ |
| Address | Multiline | ✅ |
| Location | Map picker (tap to set pin) | ✅ |
| Geofence Radius | Slider (50m-500m) | ✅ Default: 100m |
| Contact Person | Text | Optional |
| Contact Phone | Numeric | Optional |
| Day Shift Start | Time picker | Default: 08:00 |
| Day Shift End | Time picker | Default: 20:00 |
| Night Shift Start | Time picker | Default: 20:00 |
| Night Shift End | Time picker | Default: 08:00 |

#### Screen: Assign Guard to Site
- Site info card at top
- Searchable list of unassigned guards
- Select guard → pick shift type (Day/Night)
- "Assign" button
- Confirmation dialog: "Assign Ravi to Patna Main Office (Day shift)?"

#### Screen: Payroll List (Admin)
- Month picker at top (dropdown or horizontal scroll)
- Status filter: All | Generated | Approved | Paid
- Summary card:
  - Total guards: 45
  - Total salary: ₹5,45,000
  - Approved: 40 | Pending: 5
- Guard payroll list:
  - Guard name, Final salary, Status badge
  - Tap → Salary slip detail
- Action buttons:
  - "Generate Payroll for [Month]" (if not generated)
  - "Approve All" (if all generated)

#### Screen: Candidate List (Admin/Recruiter)
- Status filter tabs: All | New | Contacted | Interested | Interview | Selected
- Search bar
- Candidate cards:
  - Name, Phone
  - Experience: "2 years"
  - Expected salary: "₹13,000"
  - Status pill (color-coded per stage)
  - Tap → Candidate Detail

- FAB: "+ Add Candidate"

#### Screen: Candidate Detail
- Profile info (name, phone, education, experience, location)
- Salary expectation
- Notes from recruiter
- **Pipeline Status Bar** (visual horizontal stepper):
  ```
  [New] → [Contacted] → [Interested] → [Interview] → [Selected] → [Hired]
  ```
  Current stage highlighted in Gold, future in gray, completed in green
- "Update Status" dropdown button
- "Convert to Guard" button (only visible when status = "selected")
  - Opens form with base_salary and shift_type pre-filled

#### Screen: Notifications Center
- "Mark All Read" link at top right
- List of notification cards:
  - Icon (by type: 🔔 shift, 📋 attendance, 💰 salary, etc.)
  - Title (bold)
  - Body text
  - Timestamp ("2 hours ago")
  - Unread indicator (blue dot on left)
- Empty state: Bell icon + "No notifications yet"

#### Screen: Admin Settings
- Profile section (name, phone, role)
- App Settings:
  - Language: English / Hindi
  - Notifications: Toggle
  - Dark Mode: Toggle
- Data:
  - Export Attendance Report
  - Export Payroll Report
- About:
  - App version
  - Terms & Conditions
  - Privacy Policy
- "Logout" button (red)

---

### 5.4 MANAGER SCREENS (4 screens)

#### Screen: Manager Home
- Welcome header
- Stats: Sites to inspect, recent inspections count
- Quick action: "New Inspection" button
- Recent inspections list

#### Screen: New Inspection Form
**Multi-step form:**

**Step 1 — Select Site:**
- Dropdown or searchable list of sites
- Shows site address and assigned guard count

**Step 2 — Guard Verification:**
- Checklist of assigned guards
- Checkbox: Present ✅ / Absent ❌ for each
- Auto-calculates present/absent count

**Step 3 — Observations:**
- Remarks (multiline text, required)
- "Report Incident?" toggle
  - If yes: Severity dropdown (Low/Medium/High/Critical) + Description
- Photo upload (grid, min 2 photos recommended)
  - Camera button + Gallery button
  - Photo thumbnails with X to remove

**Step 4 — Submit:**
- GPS auto-captured (show "Submitting from: 25.612, 85.158")
- Review summary
- "Submit Inspection" button

#### Screen: Inspection History
- Date range picker
- Filter by site
- Inspection cards:
  - Site name, Date, Inspector
  - Guards present/absent count
  - Incident badge (if any)
  - Tap → detail view

#### Screen: Inspection Detail
- Site info
- Date + Time + GPS location
- Guards present list / absent list
- Photos (horizontal scrollable gallery, tap to zoom)
- Remarks
- Incident details (if any, with severity color)

---

### 5.5 RECRUITER SCREENS (3 screens)

#### Screen: Recruiter Dashboard
- Stats cards: New (5), In Progress (8), Hired this month (3)
- Pipeline funnel visualization
- Recent candidates list

#### Screen: Add Candidate Form

| Field | Type | Required |
|-------|------|----------|
| Full Name | Text | ✅ |
| Phone | Numeric (10 digit) | ✅ |
| Height (cm) | Numeric | Optional |
| Weight (kg) | Numeric | Optional |
| Education | Dropdown | Optional |
| Experience (years) | Numeric | Optional |
| Preferred Location | Text | Optional |
| Salary Expectation | Currency (₹) | Optional |
| Notes | Multiline text | Optional |

#### Screen: Candidate Pipeline (shared with Admin)
- Same as Admin candidate detail (section 5.3)

---

## 6. USER FLOWS (Step-by-Step)

### Flow 1: Guard Daily Check-in
```
Open App → Home Screen → Tap "Check In"
→ App requests GPS permission (if first time)
→ Map loads showing guard location + site location
→ Distance calculated:
   IF inside geofence (< 100m):
     → "Inside geofence ✅" shown in green
     → Tap "Take Selfie" → Camera opens → Capture
     → Tap "CHECK IN" button → Loading spinner
     → Success: "Checked in at 8:05 AM" ✅
     → Navigate to Home (shows checked-in status)
   IF outside geofence:
     → "Outside geofence ❌ (450m away)" shown in red
     → CHECK IN button disabled (grayed out)
     → Toast: "Move closer to your assigned site"
```

### Flow 2: Admin Creates Guard & Assigns to Site
```
Dashboard → Tap "Guards" tab → Tap "+" FAB
→ Fill form (name, phone, salary, shift)
→ Tap "Save" → Guard created ✅
→ Navigates to Guard Detail
→ Tap "Assignment" tab → "Assign to Site"
→ Select site from list → Select shift (Day/Night)
→ Tap "Assign" → Confirmation dialog → Confirm
→ "Ravi assigned to Patna Main Office ✅"
```

### Flow 3: Admin Generates Monthly Payroll
```
Dashboard → More → Payroll
→ Select month: "May 2026"
→ Tap "Generate Payroll"
→ Loading: "Calculating salary for 45 guards..."
→ Success: Shows list of generated payrolls
→ Review each guard's salary → Edit adjustments if needed
→ Tap "Approve All" → Confirmation
→ Payrolls marked as "Approved" ✅
→ Guards can now see salary slips in their app
```

### Flow 4: Manager Submits Inspection
```
Manager Home → Tap "New Inspection"
→ Step 1: Select site → "Patna Main Office"
→ Step 2: Mark guards: Ravi ✅, Sanjay ✅, Vikash ❌
→ Step 3: Write remarks + take 3 photos
→ Step 4: Review → Tap "Submit"
→ GPS auto-captured
→ "Inspection submitted ✅"
```

### Flow 5: Recruiter → Hire → Convert to Guard
```
Recruiter Dashboard → Candidates → Tap candidate
→ Update status: New → Contacted → Interested → Interview → Selected
→ Admin views selected candidate → Tap "Convert to Guard"
→ Pre-fills form (name, phone from candidate)
→ Set salary + shift → "Convert"
→ Guard record created ✅
→ Candidate marked as "Hired"
→ Guard appears in Guards list, ready for assignment
```

---

## 7. COMPONENT LIBRARY

### Common Components to Design

| Component | Usage |
|-----------|-------|
| **StatCard** | Dashboard stats (number + label + icon, 2x2 grid) |
| **ListCard** | Guard/Site/Candidate list items |
| **StatusBadge** | Active/Inactive/Present/Absent/Late/Pending/Approved pills |
| **ShiftBadge** | Day (☀️ yellow) / Night (🌙 blue) pills |
| **SearchBar** | Top search with filter icon |
| **FilterChips** | Horizontal scrollable filter pills |
| **FormInput** | Label + input + error text |
| **FormDropdown** | Label + dropdown + error text |
| **PrimaryButton** | Gold button (full width) |
| **SecondaryButton** | Outlined Navy button |
| **DangerButton** | Red outlined button (delete, remove) |
| **FAB** | Floating action button (bottom right, "+" icon) |
| **EmptyState** | Illustration + message + action button |
| **LoadingSkeleton** | Shimmer placeholder while loading |
| **ErrorState** | Error icon + message + "Retry" button |
| **BottomSheet** | Slide-up modal for filters, confirmations |
| **MapView** | Map with site pin + guard location + geofence circle |
| **CalendarView** | Horizontal week view with color-coded dots |
| **PipelineStepper** | Horizontal step indicator for candidate pipeline |
| **SalaryBreakdown** | Earnings/Deductions table layout |
| **NotificationItem** | Icon + title + body + timestamp + unread dot |
| **PhotoGrid** | 2x2 or 3x3 photo thumbnails with add/remove |

---

## 8. EMPTY STATES & EDGE CASES

| Screen | Empty State Message | Illustration Idea |
|--------|--------------------|--------------------|
| Guard Home (no assignment) | "You're not assigned to any site yet. Contact your admin." | Guard standing with question mark |
| Attendance History (no records) | "No attendance records yet. Check in to get started!" | Calendar with checkmark |
| Salary Slips (none) | "No salary slips available yet." | Wallet icon |
| Guard List (no guards) | "No guards added yet. Tap + to add your first guard." | People group silhouette |
| Site List (no sites) | "No sites added yet. Add a client site to get started." | Building with pin |
| Notifications (empty) | "You're all caught up! 🎉" | Bell with checkmark |
| Candidates (none) | "No candidates in pipeline. Start recruiting!" | Briefcase |

---

## 9. MICRO-ANIMATIONS

| Action | Animation |
|--------|-----------|
| Check-in success | Confetti burst + haptic feedback + green checkmark scale-up |
| Check-out success | Slide-up success card with hours worked |
| Geofence enter | Pulse animation on geofence circle (green) |
| Geofence exit | Shake animation on distance text (red) |
| Pull-to-refresh | Custom loading spinner (shield icon rotates) |
| Tab switch | Smooth crossfade between tab content |
| Card tap | Slight scale-down (0.98) on press, spring back on release |
| FAB tap | Rotate 45° (+ becomes ×) when menu opens |
| Status change | Badge color transition (fade) |
| Loading | Shimmer skeleton (left-to-right shine) |

---

## 10. SCREEN COUNT SUMMARY

| Role | Screens | Priority |
|------|---------|----------|
| Auth | 3 (Splash, Phone, OTP) | P0 |
| Guard | 7 (Home, Check-in, History, Salary List, Salary Detail, Profile, Documents) | P0 |
| Admin | 15+ (Dashboard, Guards List/Detail/Form, Sites List/Detail/Form, Assign, Payroll, Candidates, Uniforms, Notifications, Settings) | P0 |
| Manager | 4 (Home, New Inspection, History, Detail) | P1 |
| Recruiter | 3 (Dashboard, Add Candidate, Pipeline) | P1 |
| **Total** | **~32 unique screens** | |

---

## 11. DELIVERABLES EXPECTED FROM DESIGNER

1. **Style Guide** — Colors, typography, spacing, icon set
2. **Component Library** — All reusable components (Figma)
3. **Wireframes** — Low-fi for all 32 screens
4. **High-Fidelity Mockups** — Pixel-perfect for all screens
5. **Prototype** — Interactive clickable prototype (Figma)
6. **User Flows** — Annotated flow diagrams
7. **Handoff** — Developer-ready specs with measurements

### Design File Structure (Figma):
```
📁 Pan India Security
├── 📄 Cover Page
├── 📄 Style Guide (Colors, Typography, Spacing)
├── 📄 Component Library
├── 📄 Auth Screens
├── 📄 Guard Screens
├── 📄 Admin Screens
├── 📄 Manager Screens
├── 📄 Recruiter Screens
├── 📄 Empty States & Errors
└── 📄 Prototype Flows
```

---

## 12. DESIGN REFERENCES & INSPIRATION

Look at these apps for design inspiration:
- **Zomato/Swiggy** — Clean cards, status tracking, map UX
- **Google Pay** — Dashboard layout, stats cards
- **Notion** — Clean forms, list views
- **Slack** — Notification center, activity feed
- **Apple Health** — Calendar view with color-coded data
- **Uber Driver App** — GPS tracking, status flow, check-in UX
