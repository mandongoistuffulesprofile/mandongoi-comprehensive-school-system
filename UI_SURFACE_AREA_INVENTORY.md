# UI Surface-Area Inventory — School Management Dashboard

**Date:** 2026-08-02  
**Source:** Static analysis of all source files in `/frontend/src`  
**Scope:** Every route, page, component, and global element — verbatim from code only

---

## GLOBAL ELEMENTS

### Topbar (`components/layout/Topbar.tsx`)
Rendered inside `<AppShell>` on every authenticated page above the content area.

**Left-to-right elements:**

| Position | Element | Details |
|----------|---------|---------|
| Full width | Gradient accent bar | `h-1 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600` |
| Left (flex row) | Green dot | `w-2 h-2 rounded-full bg-emerald-500` (color-only, no text equivalent) |
| Left | Text | `"Signed in as "` + `<span class="font-bold">{user.name}</span>` |
| Left | Role badge | Dynamic from `roleToClass[user.role]` with display label from `user.role.replace(/([A-Z])/g, " $1").toLowerCase()` |

**Role badge color map:**
| Role | Classes |
|------|---------|
| `schoolAdmin` | `bg-brand-100 text-brand-700` (label: "school admin") |
| `teacher` | `bg-purple-100 text-purple-700` |
| `accountant` | `bg-cyan-100 text-cyan-700` |
| `parent` | `bg-teal-100 text-teal-700` |
| (fallback) | `bg-surface-100 text-surface-600` |

**Right section:**
| Element | Details |
|---------|---------|
| Notification bell | `<NotificationBell />` — shows `"Notifications"` dropdown with 5 types (payroll/💰, warning/⚠️, success/✅, error/❌, info/ℹ️), `"Mark all read"` button, `"No notifications"` empty state, `"View"` link on payroll-type items |
| Log out button | Ghost variant + logout SVG icon + text `"Log out"` |

---

### Sidebar (`components/layout/Sidebar.tsx`)
Rendered inside `<AppShell>` on every authenticated page. Full-height left panel, `bg-white border-r border-surface-200`.

**Header:**
- Logo: `w-8 h-8 rounded-lg bg-brand-600 text-white` with letter **"S"**
- School name: dynamic from settings API (`schoolName`), default `"School"`
- Subtitle: `"MANAGEMENT"` — `text-[10px] uppercase tracking-widest text-surface-400 font-medium`
- Collapse toggle: double-chevron-left SVG icon, toggles `w-64` ↔ `w-16`

#### Full Nav Tree (all groups, all items, in order)

| Group | Group Color | Item Label | Icon Key | Route | Roles |
|-------|-------------|------------|----------|-------|-------|
| **Overview** | `text-brand-600` | Dashboard | `dashboard` | `/` | schoolAdmin, teacher, accountant |
| **Students & Academics** | `text-accent-600` | Students | `students` | `/students` | schoolAdmin, teacher, accountant |
| | | Subjects | `subjects` | `/academic/learning-areas` | schoolAdmin, teacher, accountant |
| | | Marks Entry | `attendance` | `/academic/marks-entry` | schoolAdmin, teacher |
| | | Class Results | `report` | `/academic/results` | schoolAdmin, teacher, accountant |
| | | Report Cards | `reportCards` | `/academic/report-cards` | schoolAdmin, teacher |
| | | Attendance | `attendance` | `/attendance` | schoolAdmin, teacher |
| | | Leave Notes | `leaveNotes` | `/attendance/leave-notes` | schoolAdmin, teacher |
| **Fees & Billing** | `text-emerald-600` | Set Term Fees | `fees` | `/fees/structures` | schoolAdmin, accountant |
| | | Fee Payments | `payment` | `/fees/invoices` | schoolAdmin, accountant |
| | | Reconciliation | `report` | `/fees/reconciliation` | schoolAdmin, accountant |
| | | Payments Log | `payment` | `/fees/payments` | schoolAdmin, accountant |
| **Food Programme** | `text-rose-600` | Meal Timetable | `timetable` | `/fees/meal-timetable` | schoolAdmin, teacher |
| | | Food Dashboard | `report` | `/fees/food-dashboard` | schoolAdmin, teacher |
| | | Food Items & Stock | `fees` | `/fees/food-presets` | schoolAdmin |
| | | Food Logs | `leaveNotes` | `/fees/food-logs` | schoolAdmin, teacher |
| **Accounting** | `text-cyan-600` | Income & Expenses | `report` | `/ledger/trial-balance` | schoolAdmin, accountant |
| | | Chart of Accounts | `report` | `/ledger/accounts` | schoolAdmin, accountant |
| | | Record Transaction | `payment` | `/ledger/journal` | schoolAdmin, accountant |
| **Staff & Payroll** | `text-purple-600` | Staff Records | `staff` | `/staff` | schoolAdmin, accountant |
| | | Staff Attendance | `staffAttendance` | `/staff/attendance` | schoolAdmin |
| | | Class Teachers | `users` | `/staff/class-teachers` | schoolAdmin |
| | | Session Assignments | `timetable` | `/staff/session-assignments` | schoolAdmin |
| | | Salaries & Payroll | `payroll` | `/payroll` | schoolAdmin, accountant |
| **SMS & Communication** | `text-sky-600` | Message Templates | `smsTemplates` | `/sms/templates` | schoolAdmin, accountant |
| | | Send Messages | `sendSms` | `/sms/campaigns` | schoolAdmin, accountant |
| | | Auto Messages | `autoSms` | `/sms/automated-rules` | schoolAdmin |
| | | Message History | `smsLogs` | `/sms/logs` | schoolAdmin, accountant |
| **Administration** | `text-surface-500` | School Settings | `settings` | `/settings` | schoolAdmin |
| | | Parent Accounts | `parents` | `/parents/links` | schoolAdmin |
| | | User Accounts | `users` | `/admin/users` | schoolAdmin |
| | | Paybills | `payment` | `/settings/paybills` | schoolAdmin |
| | | System Logs | `smsLogs` | `/admin/logs` | schoolAdmin |

**Badge/counter:** None. No notification dots, counts, or badges anywhere in the sidebar.

**Nav item states:**
- Active: `bg-brand-50 text-brand-700`
- Inactive: `text-surface-600 hover:bg-surface-50 hover:text-surface-900`
- No focus/active/disabled states beyond global focus-visible

**Icons:** All 20 icons are hardcoded SVG `d` path strings rendered via a `SvgIcon` component with `viewBox="0 0 24 24"`, `strokeWidth={1.5}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, fill `"none"`.

**Sidebar icons defined:** `dashboard` (grid), `students` (cap), `subjects` (book), `reportCards` (clipboard), `attendance` (checkmark-circle), `timetable` (calendar), `fees` (dollar-circle), `payment` (credit-card), `report` (bar-chart), `staff` (two-people-plus), `staffAttendance` (clock), `payroll` (download-box), `smsTemplates` (doc-edit), `sendSms` (envelope), `autoSms` (sparkle), `smsLogs` (doc-lines), `leaveNotes` (doc-lines, identical to smsLogs), `settings` (gear), `parents` (two-people-plus, identical to staff), `users` (link-plus pattern)

---

### Breadcrumbs (`components/layout/Breadcrumbs.tsx`)
Rendered inside `<AppShell>` above every page content.

- Home: SVG house icon, links to `/`
- Separator: `"/"` in `text-surface-300`
- Last segment: non-link `<span>` in `text-surface-600 font-medium`

**LABEL_MAP (all entries):**

| Path Segment | Display Label |
|---|---|
| `""` / `dashboard` | "Dashboard" |
| `students` | "Students" |
| `academic` | "Academics" |
| `learning-areas` | "Subjects" |
| `marks-entry` | "Marks Entry" |
| `report-cards` | "Report Cards" |
| `results` | "Results" |
| `fees` | "Fees" |
| `structures` | "Set Term Fees" |
| `invoices` | "Fee Payments" |
| `reconciliation` | "Reconciliation" |
| `payments` | "Payments Log" |
| `food-logs` | "Food Logs" |
| `food-presets` | "Food Items & Stock" |
| `food-dashboard` | "Food Dashboard" |
| `meal-timetable` | "Meal Timetable" |
| `staff` | "Staff" |
| `attendance` | "Attendance" |
| `leave-notes` | "Leave Notes" |
| `payroll` | "Salaries & Payroll" |
| `session-assignments` | "Session Assignments" |
| `sms` | "SMS" |
| `templates` | "Message Templates" |
| `campaigns` | "Send Messages" |
| `logs` | "Message History" |
| `automated-rules` | "Auto Messages" |
| `ledger` | "Finance" |
| `accounts` | "Accounts" |
| `journal` | "Record Transaction" |
| `trial-balance` | "Income & Expenses" |
| `settings` | "School Settings" |
| `parents` | "Parents" |
| `links` | "Parent Accounts" |
| `admin` | "Admin" |
| `users` | "User Accounts" |

Fallback: segment replaces hyphens with spaces, title-cases each word.

---

### Toast System (`components/ui/Toast.tsx`)
Rendered as fixed `top-4 right-4 z-[100]` container. Auto-dismiss after 4000ms.

**Types, icons, and colors:**

| Type | Icon | Background | Border | Text |
|------|------|-----------|--------|------|
| `success` | `"✓"` | `bg-emerald-50` | `border-emerald-200` | `text-emerald-800` |
| `error` | `"✕"` | `bg-red-50` | `border-red-200` | `text-red-800` |
| `info` | `"ℹ"` | `bg-blue-50` | `border-blue-200` | `text-blue-800` |
| `warning` | `"⚠"` | `bg-amber-50` | `border-amber-200` | `text-amber-800` |

**Toast message inventory (distinct strings only):**

#### Success (58 messages)
| Message | Source (file:line) |
|---------|-------------------|
| `Created successfully` | ResourcePage.tsx:109 |
| `Updated successfully` | ResourcePage.tsx:112 |
| `Deleted successfully` | ResourcePage.tsx:131 |
| `{n} exception{s} recorded` | StudentAttendance.tsx:68 |
| `Leave approved — attendance marked as excused` | LeaveNotes.tsx:53 |
| `Student marked as returned — attendance set to present` | LeaveNotes.tsx:63 |
| `Leave note created` | LeaveNotes.tsx:134 |
| `Seeded {created} new CBC subjects ({total} total)` | LearningAreas.tsx:22 |
| `User created. They'll be prompted to reset their password on first login.` | Users.tsx:15 |
| `Fee structure saved as draft` | FeeStructures.tsx:77 |
| `Fee structure published` | FeeStructures.tsx:77 |
| `Fee structure deleted` | FeeStructures.tsx:87 |
| `Invoice generated` | Invoices.tsx:118 |
| `Created {created} invoice{s}` | Invoices.tsx:267 |
| `Payment recorded` | Invoices.tsx:337 |
| `STK Push sent to parent's phone` | Invoices.tsx:350 |
| `Transaction matched` | Reconciliation.tsx:44 |
| `{itemName} logged ({logType})` | FoodLogs.tsx:89 |
| `Entry removed` | FoodLogs.tsx:126 |
| `Food preset created` | FoodPresets.tsx:68 |
| `Food preset updated` | FoodPresets.tsx:71 |
| `Preset removed` | FoodPresets.tsx:79 |
| `Item added` | MealTimetable.tsx:133 |
| `Removed` | MealTimetable.tsx:148 |
| `Rule disabled` | AutomatedRules.tsx:28 |
| `Rule enabled` | AutomatedRules.tsx:28 |
| `Rule created` | AutomatedRules.tsx:83 |
| `Campaign sent` | SmsCampaigns.tsx:32 |
| `Message sent to {n} recipients` | SmsCampaigns.tsx:157 |
| `Payroll run {month}/{year} created as draft` | Payroll.tsx:32 |
| `Draft run deleted` | Payroll.tsx:98 |
| `Entries generated from attendance` | Payroll.tsx:310 |
| `Payroll run approved` | Payroll.tsx:319 |
| `Payroll run marked as paid` | Payroll.tsx:328 |
| `Parent linked to student` | ParentLinks.tsx:26 |
| `Link removed` | ParentLinks.tsx:39 |
| `{meta.title} recorded` | JournalEntry.tsx:219 |
| `Transaction recorded` | JournalEntry.tsx:239 |
| `Transaction deleted and effects reversed` | JournalEntry.tsx:257 |
| `Attendance recorded` | StaffAttendance.tsx:32 |
| `Signature uploaded` | ClassTeachers.tsx:63 / SchoolSettings.tsx:40 |
| `Updated` | ClassTeachers.tsx:77 |
| `Created` | ClassTeachers.tsx:80 |
| `Removed` | ClassTeachers.tsx:94 |
| `Session assigned` | SessionAssignments.tsx:55 |
| `Assignment removed` | SessionAssignments.tsx:68 |
| `{created} payment records created ({skipped} already existed)` | SessionAssignments.tsx:82 |
| `{name} added to staff` | CreateStaff.tsx:40 |
| `Guardian added` | StudentDetail.tsx:286 |
| `Guardians added` | StudentDetail.tsx:293 |
| `Marked` | StudentDetail.tsx:385 |
| `Published` | StudentDetail.tsx:457 |
| `Student updated` | StudentsList.tsx:85 |
| `Student deleted` | StudentsList.tsx:102 |
| `Student saved ({n})` | CreateStudent.tsx:83 |
| `Settings saved` | SchoolSettings.tsx:54 |

#### Error (74 distinct message patterns)
Key static messages include: `"Failed to print note"`, `"Failed to approve"`, `"Failed to create"`, `"Failed to load data"`, `"Select at least one student"`, `"Failed to load students"`, `"Failed to load results"`, `"Failed to create user"`, `"Grade and Tuition Fee are required"`, `"Save failed"`, `"Delete failed"`, `"Failed"`, `"STK Push failed"`, `"Failed to load receipts"`, `"Failed to match"`, `"Failed to load payments"`, `"Enter a food item"`, `"Select a student for contributions"`, `"Item name and price are required"`, `"Select a food item and enter quantity"`, `"Failed to update rule"`, `"Failed to send"`, `"Failed to load recipients"`, `"Failed to load extra duty"`, `"Failed to generate entries"`, `"Failed to mark as paid"`, `"Failed to create link"`, `"Failed to remove link"`, `"Enter the amount"`, `"Required ledger accounts not found. Check your Chart of Accounts."`, `"Total money out must equal total money in."`, `"Failed to record"`, `"Failed to delete"`, `"Failed to mark attendance"`, `"Upload failed"`, `"Failed to save"`, `"Failed to remove"`, `"Name and phone are required"`, `"Base rate is required for teachers"`, `"First name, last name, and grade are required"`, `"Delete failed — restored"`, `"Failed to add guardian"`, `"Failed to load"`

#### Info / Warning
**None.** Zero `toast.add("info", ...)` and zero `toast.add("warning", ...)` calls anywhere in the codebase.

---

### Global Confirmation Dialog (`components/ui/Modal.tsx` — `ConfirmDialog`)

| Property | Value |
|----------|-------|
| Cancel button | `"Cancel"` (ghost) |
| Confirm button (default) | `"Confirm"` (primary) |
| Confirm button (danger) | `"Confirm"` (danger variant, when `danger={true}`) |
| Confirm button (loading) | `"Processing..."` |
| Default message | Passed as prop, no hardcoded default |

**Modal styling:** `bg-white rounded-xl shadow-xl border border-surface-200`

---

## ROUTE MAP SUMMARY

| Path | Component | Roles Allowed | One-line Purpose |
|------|-----------|---------------|-----------------|
| `/login` | Login | (public) | Authentication: username/password login + forgot password flow |
| `/` | Dashboard | schoolAdmin, teacher, accountant | Role-specific dashboard (admin, accountant, teacher variants) |
| `/students` | StudentsList | schoolAdmin, teacher, accountant | Searchable, filterable student table with edit/delete |
| `/students/new` | CreateStudent | schoolAdmin | Multi-section student registration form with guardian fields |
| `/students/:id` | StudentDetail | schoolAdmin, teacher, accountant | 7-tab student profile (overview, guardians, fees, attendance, marks, report cards, food) |
| `/academic/learning-areas` | LearningAreas | schoolAdmin, teacher, accountant | CRUD for CBC learning areas with strands modal |
| `/academic/marks-entry` | MarksEntry | schoolAdmin, teacher | Per-student score entry grid with auto-save and level calculation |
| `/academic/results` | StudentResults | schoolAdmin, teacher, accountant | Class results table ranked by average with print |
| `/academic/report-cards` | ReportCards | schoolAdmin, teacher | CBC report cards with bulk print, inline comments, performance charts |
| `/attendance` | StudentAttendance | schoolAdmin, teacher | Exception-only attendance (absent/late/excused) per date |
| `/attendance/leave-notes` | LeaveNotes | schoolAdmin, teacher | Leave note CRUD with approve/return flow and printable notes |
| `/fees/structures` | FeeStructures | schoolAdmin, accountant | Set term fees by grade/type with draft/publish workflow |
| `/fees/invoices` | Invoices | schoolAdmin, accountant | Invoice generation (single + bulk), payment recording, STK push, receipts |
| `/fees/reconciliation` | Reconciliation | schoolAdmin, accountant | Match unmatched M-Pesa transactions to student invoices |
| `/fees/payments` | PaymentsLog | schoolAdmin, accountant | Searchable/filterable payment log (M-Pesa + manual) |
| `/fees/meal-timetable` | MealTimetable | schoolAdmin, teacher | 7×3 grid (days × meals) for setting daily food plan |
| `/fees/food-dashboard` | FoodDashboard | schoolAdmin, teacher | Stock levels, daily/weekly usage, reorder alerts, unit economics |
| `/fees/food-presets` | FoodPresets | schoolAdmin | CRUD for food items with price, unit, stock, reorder level |
| `/fees/food-logs` | FoodLogs | schoolAdmin, teacher | Log contributions (per-student), purchases, wastage; auto-consumption read-only |
| `/staff` | StaffList | schoolAdmin, accountant | Staff records table (via ResourcePage CRUD) |
| `/staff/new` | CreateStaff | schoolAdmin | New staff registration form |
| `/staff/attendance` | StaffAttendance | schoolAdmin | Per-staff attendance marking (feeds payroll) |
| `/staff/class-teachers` | ClassTeachers | schoolAdmin | Assign teachers to grades with signature uploads |
| `/staff/session-assignments` | SessionAssignments | schoolAdmin | Assign morning/evening/weekend extra duty sessions |
| `/payroll` | PayrollRuns | schoolAdmin, accountant | List payroll runs with create/delete; navigate to detail |
| `/payroll/:id` | PayrollRunDetail | schoolAdmin, accountant | Run detail: generate entries, manual add, adjustments, approve/pay |
| `/ledger/accounts` | LedgerAccounts | schoolAdmin, accountant | Chart of accounts CRUD (via ResourcePage) |
| `/ledger/journal` | JournalEntry | schoolAdmin, accountant | Record transactions via templates or advanced double-entry |
| `/ledger/trial-balance` | TrialBalance | schoolAdmin, accountant | Read-only account balances with debit/credit totals |
| `/sms/templates` | SmsTemplates | schoolAdmin, accountant | SMS template CRUD (via ResourcePage) |
| `/sms/campaigns` | SmsCampaigns | schoolAdmin, accountant | Create/send SMS campaigns with 3-step wizard |
| `/sms/automated-rules` | AutomatedRules | schoolAdmin | Configure trigger-based auto-SMS rules |
| `/sms/logs` | SmsLogs | schoolAdmin, accountant | Delivery logs with status filter pills |
| `/settings` | SchoolSettings | schoolAdmin | School name, term dates, currency, pay day, session rates, signatures |
| `/settings/paybills` | Paybills | schoolAdmin | M-Pesa paybill configuration (via ResourcePage) |
| `/parents/links` | ParentLinks | schoolAdmin | Link parent user accounts to students |
| `/admin/users` | Users | schoolAdmin | Create user accounts (registration form) |
| `/admin/logs` | SystemLogs | schoolAdmin | Audit trail with category filters and pagination |

---

## ROUTE INVENTORIES

---

## Route: `/login` — Login
**Accessible to:** Public (all users)

### Layout
- No shared layout/shell. Standalone two-panel layout.
- Left panel (hidden on <lg): gradient `from-brand-600 via-brand-700 to-brand-900`, shows logo `"CBC School"` / `"Management System"`, tagline `"A comprehensive school management platform with CBC curriculum support, M-Pesa integration, and real-time reporting."`, `"Competency-Based Curriculum"`, footer `"© 2026 CBC School Management"`
- Right panel: `bg-surface-50`

### Content inventory — Sign-in form (default view)

**Title:** `"Welcome back"`
**Subtitle:** `"Sign in to your account to continue"`

**Form fields:**
| # | Label | Type | Required | Placeholder |
|---|-------|------|----------|-------------|
| 1 | Username | text | Yes | `admin@school.edu` |
| 2 | Password | password | Yes | `Enter your password` |

**Buttons:**
| Label | Type | Action |
|-------|------|--------|
| `Forgot password?` | button (text link) | Opens forgot password flow |
| `Signing in...` / `Sign in` | submit | Calls `login(username, password)` |

**Error banner:** Red background (`bg-red-50 border-red-200 text-red-700`), shows `ApiError.message` or `"Invalid credentials."`

**Demo text:** `"Demo: admin@school.edu / teacher@school.edu / accountant@school.edu"`

### Content inventory — Forgot Password (3-step flow)

**Step "email":**
- Title: `"Reset Password"`, subtitle: `"Enter your email to receive a reset link."`
- Field: Email (type=email, required, placeholder=`admin@school.edu`)
- Button: `"Sending..."` / `"Send Reset Link"`
- Link: `"Back to sign in"`
- On success with token: transitions to "reset" step, message `"Enter a new password below."`
- On success without token: transitions to "done" step, message `"If that email exists, a reset link has been sent."`
- Error: `"Failed to send reset request."`

**Step "reset":**
- Subtitle: `"Choose a new password."`
- Field: New Password (type=password, required, placeholder=`Min 6 characters`)
- Validation: `"Password must be at least 6 characters."`
- Button: `"Resetting..."` / `"Reset Password"`
- Error: `"Reset failed. The link may have expired."`

**Step "done":**
- Subtitle: shows `resetMsg` text
- Success banner: `bg-emerald-50 border-emerald-200 text-emerald-700`
- Button: `"Back to Sign In"`
- Expected success message: `"Password reset successful! You can now sign in."`

---

## Route: `/` — Dashboard
**Accessible to roles:** schoolAdmin, teacher, accountant
**Component:** Dashboard (role-dispatches to 3 sub-dashboards)

### AdminDashboard

**Title:** `{settings.schoolName || "School"} Dashboard`
**Subtitle:** `{settings.currentTerm} • {settings.currentAcademicYear}` + term dates if set

**Grade pill strip (header right):**
- Label: `"Students:"`
- One pill per unique grade: `"G{grade number}"` with count badge

**Stat Cards (4-column grid):**
| # | Label | Value Source | Color | Hint |
|---|-------|-------------|-------|------|
| 1 | `Students (Active)` | `activeStudents.length` | `text-brand-600` | (none) |
| 2 | `Fee Collection` | `{collectionRate}%` | Dynamic: `text-emerald-600` (≥80%), `text-amber-600` (≥50%), `text-red-600` (<50%) | `KES {collected} / KES {expected}` |
| 3 | `Overdue Fees` | `overdueInvoices.length` | `text-red-600` | `KES {overdueTotal}` |
| 4 | `Staff (Active)` | `activeStaff.length` | `text-purple-600` | `"Teachers & support"` |

**"Needs Attention" Card:**
- Title: `"Needs Attention"` with red dot
- Shows: overdue count + amount, unpaid count, partial count, SMS sent count
- When all clear: `"✅ All fees up to date"`
- Right side: `"Term: {currentTerm}"` and `"Year: {academicYear}"`

**Quick Links (8 cards, 4-column grid):**
| Label | Description | Color |
|-------|-------------|-------|
| `SMS Campaigns` | `Bulk & automated` | sky (blue) |
| `Students` | `View & manage` | purple |
| `Fee Payments` | `Track collections` | emerald |
| `Salaries` | `Manage payroll` | amber |
| `Attendance` | `Mark & view` | cyan |
| `Session Assignments` | `Morning, Evening, Weekend` | indigo |
| `Staff` | `Staff records` | rose |
| `Settings` | `School config` | surface/gray |

**Loading state:** Centered `<Spinner>` with `w-8 h-8`
**Empty state:** None — stats show 0 values

### AccountantDashboard

**Title:** `"Fee Overview"`

**Stat Cards (3-column grid):**
| # | Label | Value | Color | Hint |
|---|-------|-------|-------|------|
| 1 | `Collected` | `KES {totalCollected}` | `text-emerald-600` | `{paid.length} paid` |
| 2 | `Outstanding` | `KES {totalOutstanding}` | `text-amber-600` | `{unpaid.length} unpaid` |
| 3 | `Overdue` | `KES {totalOverdue}` | `text-red-600` | `{overdue.length} overdue` |

**Buttons:**
| Label | Target |
|-------|--------|
| `View Invoices` | `/fees/invoices` |
| `Set Term Fees` | `/fees/structures` |

### TeacherDashboard

**Title:** `"Teacher Dashboard"`
**Subtitle:** `"Mark attendance, enter assessments, and manage report cards."`
**Content:** Quick Links only (same 8 links as AdminDashboard). No stats.

---

## Route: `/students` — StudentsList
**Accessible to roles:** schoolAdmin, teacher, accountant

**Title:** `"Students"`
**Description:** `"Enrolled learners across all grades and classes."`

### Filters/search
| Control | Type | Placeholder | Options |
|---------|------|-------------|---------|
| Search | text input | `"Search by name..."` | free text, 300ms debounce |
| Grade | Dropdown | `"All Grades"` | All grades from LEVELS |

### Table (DataTable)
**Columns (in order):**
| # | Header | Sortable | Cell |
|---|--------|----------|------|
| 1 | `Name` | Yes | `{firstName} {lastName}` (font-medium) |
| 2 | `Level` | Yes | `{level.replac("_", " ")}` (uppercase tracking-wider) |
| 3 | `Grade` | Yes | `{grade}` |
| 4 | `Status` | No | `<EnumBadge value={status}>` |

**Row click:** Navigates to `/students/{id}`
**Loading state:** DataTable internal (spinner + `"Loading..."`)
**Empty state:** `"No records yet."` (DataTable default)
**Pagination:** 20 per page

### Buttons
| Label | Variant | Condition | Action |
|-------|---------|-----------|--------|
| `+ New Student` | primary | admin only | Navigate to `/students/new` |
| `Edit` (per row) | text-brand | admin only | Opens Edit modal |
| `Delete` (per row) | text-red | admin only | Opens delete confirmation |

### Edit Modal
**Title:** `"Edit Student"`
**Fields:**

| Label | Name | Type | Required | Options |
|-------|------|------|----------|---------|
| First Name | firstName | text | Yes | |
| Last Name | lastName | text | Yes | |
| Date of Birth | dateOfBirth | date | No | max=today |
| Gender | gender | select | No | Male, Female |
| Level | level | select | No | From LEVELS; resets grade |
| Grade | grade | select | Yes | From selectedLevel.grades |
| Enrollment Date | enrollmentDate | date | No | max=today |

**Buttons:** `Cancel` (ghost) / `Saving...` or `Update` (primary)

### Delete Confirmation
**Title:** `"Delete Student"`
**Message:** `"This action cannot be undone. Are you sure?"`
**Buttons:** `Cancel` (ghost) / `Delete` (danger)

---

## Route: `/students/new` — CreateStudent
**Accessible to roles:** schoolAdmin

**Breadcrumb:** `Students / New Student`
**Title:** `"Register New Student"`
**Description:** `"Comprehensive School — Pre-Primary (PP1-PP2) and Grade 1-9. Boarding and Day Scholar."`

### Card 1: Student Details (numbered "1")

| # | Label | Name | Type | Required | Options |
|---|-------|------|------|----------|---------|
| 1 | First Name | firstName | text | Yes | |
| 2 | Last Name | lastName | text | Yes | |
| 3 | Gender | gender | select | No | Male ("male"), Female ("female") — default "male" |
| 4 | Date of Birth (optional) | dateOfBirth | date | No | max=today |
| 5 | Level | level | select | Yes | From LEVELS; default "comprehensive" |
| 6 | Grade | grade | select | Yes | From selectedLevel.grades |
| 7 | NEMIS ID (optional) | nemisId | text | No | |
| 8 | Enrollment Date (optional) | enrollmentDate | date | No | max=today |

### Card 2: Accommodation & Food (numbered "2")

| # | Label | Name | Type | Required | Options |
|---|-------|------|------|----------|---------|
| 1 | Student Type | studentType | select | Yes | Day Scholar ("day") / Boarding ("boarding") — default "day" |

**Conditional (when boarding):**
| # | Label | Name | Type | Required | Options |
|---|-------|------|------|----------|---------|
| 2 | Boarding House / Dormitory | boardingHouse | text | No | placeholder: "e.g. Lions, Dolphin" |
| 3 | Food Programme | foodProgramType | select | Yes | N/A ("none") / Pay Fee ("pay_fee") / Bring Own Food ("bring_own") |

**Info boxes (contextual):**
- Bring own food: Amber box — `"Food items will be logged manually via the Food Logs page. The food fee will be deducted from this student's invoice."`
- Pay fee: Blue box — `"The food programme fee from the fee structure will be included in this student's invoice."`
- Day scholar: Gray box — `"Day scholar — boarding and food fees do not apply."`

### Card 3: Guardian / SMS Contact (numbered "3")

**Helper text:** `"Results, fee reminders & term dates sent to this phone"`

| # | Label | Name | Type | Required | Options |
|---|-------|------|------|----------|---------|
| 1 | Guardian Name (optional) | guardianName | text | No | |
| 2 | Phone (2547XXXXXXXX) | guardianPhone | text | No | placeholder: `2547XXXXXXXX` |
| 3 | Relationship | guardianRelationship | text | No | |

### Footer Buttons
| Label | Variant | Action |
|-------|---------|--------|
| `Cancel` | ghost | Navigate to `/students` |
| `Saving...` / `Save & Add Another` / `Save & Add Another ({n})` | secondary | Creates + resets form |
| `Saving...` / `Save & View Profile` | primary | Creates + navigates to profile |

**Validation:** `firstName`, `lastName`, `grade` required
**Post-save badge:** `"{savedCount} saved this session"` (emerald, shown after ≥1 save)

---

## Route: `/students/:id` — StudentDetail
**Accessible to roles:** schoolAdmin, teacher, accountant

**Loading:** `"Loading student..."`
**Not found:** `"Student not found."`

### Header
- Avatar: initials circle, gradient `from-brand-400 to-brand-600`
- Title: `{firstName} {lastName}`
- Subtitle: `{level capitalized} · {grade}`
- Badges: `<EnumBadge value={status}>` + `{gender}`
- Back link: `"Back to students"` with left chevron, links to `/students`

### Tabs (7 tabs)
| # | Key | Label | Write Access |
|---|-----|-------|-------------|
| 1 | `overview` | `Overview` | Read-only |
| 2 | `guardians` | `Guardians` | schoolAdmin |
| 3 | `invoices` | `Fees` | Read-only |
| 4 | `attendance` | `Attendance` | schoolAdmin, teacher |
| 5 | `assessments` | `Marks` | Read-only |
| 6 | `report-cards` | `Report Card` | schoolAdmin (publish), schoolAdmin/teacher (read) |
| 7 | `food` | `Food` | Read-only |

### Tab: Overview
- **Guardians card** — title `"Guardians"`; empty: `"No guardians on file"`; shows name, `"Primary"` badge, phone (mono), `"SMS Opted Out"` (red)
- **Stat cards (right):**
  | Label | Value | Color |
  |---|---|----|
  | `Fee Balance` | `KES {balance}` | red if >0, emerald if 0 |
  | `Attendance Rate` | `{rate}%` | emerald (≥90), amber (≥75), red (<75) |
  | `Avg Score` | `{avg}%` | emerald (≥80), amber (≥50), red (<50) — only when assessments exist |

### Tab: Guardians
- **Empty:** `"No guardians on file."`
- **Buttons (admin):** `+ Add Guardian` (primary) / `+ Bulk Add` (secondary)

**Add Guardian Modal:**
- Title: `"Add Guardian"`
- Fields: Name (text, req), Phone (text, req, placeholder `2547XXXXXXXX`), Relationship (text, req), Language (select: English "en"/Swahili "sw"), Primary guardian (checkbox), Opted out of SMS (checkbox)
- Buttons: `Cancel` / `Save`

**Bulk Add Modal:**
- Title: `"Bulk Add Guardians"`
- Dynamic entries with per-entry: Name (text, req), Phone (text, req), Relationship (text, opt) + `"Remove"` per entry
- Global: `"+ Add Another"` / `Cancel` / `"Save All ({n})"`

### Tab: Fees
- **Empty:** `"No invoices for this student."`
- Each card: `"Term {inv.term} · {inv.academicYear}"`, `"KES {total} total, KES {balance} balance"`, `<EnumBadge value={status}>`

### Tab: Attendance
- **Empty:** `"No absences logged."`
- **Form (when canWrite):** Date (default today), Status (Dropdown: Absent/Late/Excused)
- **Button:** `"Log Exception"` (primary)
- Records: date (mono) + `<EnumBadge value={status}>`

### Tab: Marks
- **Empty:** `"No assessments recorded."`
- Each card: `"Term {a.term} · {a.academicYear} · {type capitalized}"`, remarks, `<CompetencyDots level={performanceLevel}>`

### Tab: Report Card
- **Empty:** `"No report cards generated yet."`
- **Button:** `"🖨️ Print All Published ({n})"` (secondary, when cards.length >1)
- Per card: `"Term {term} · {year}"`, `"Published {date}"` or `"Not yet published"`
- **Buttons:** `Publish` (secondary, canPublish + not published) / `🖨️ Print` (primary, published)
- Print content: title `"SCHOOL REPORT CARD"`, columns `Subject | Score | Grade | Remarks`, grade labels "Exceeding"/"Meeting"/"Approaching"/"Below", signature lines `Class Teacher | Head Teacher | Parent/Guardian`

### Tab: Food
- **Empty:** `"No food activity recorded for this student yet."`
- 3 conditional sections: `"Food Items Brought In"`, `"Money Paid for Food"`, `"Food Consumed"`
- **Stat cards:** `Total Brought In` (emerald), `Total Paid (KES)` (purple), `Total Consumed` (blue)
- Type labels: contribution→"Brought in" (emerald), consumption→"Ate" (blue), purchase→"School bought" (amber), wastage→"Wastage" (red), payment→"Paid" (purple)

---

## Route: `/academic/learning-areas` — LearningAreas
**Accessible to roles:** schoolAdmin, teacher, accountant

**Title:** `"Learning Areas"`
**Description:** `"CBC learning areas and their applicable grade levels."`

### Buttons
| Label | Variant | Condition | Action |
|-------|---------|-----------|--------|
| `Seed CBC Subjects` | secondary | admin only | Seeds CBC subjects from API |
| `+ New` | primary | admin only | Opens create modal |
| `Edit` | text-brand | admin only (per row) | Opens edit modal |
| `Delete` | text-red | admin only (per row) | Opens delete confirmation |

### Table (DataTable)
| # | Header | Cell |
|---|--------|------|
| 1 | `Name` | `a.name` |
| 2 | `Grade Levels` | comma-separated from `a.gradeLevels` |
| 3 | `Strands` | `"View strands"` button (opens StrandsModal) |

### Create/Edit Form
| Label | Name | Type | Required | Placeholder |
|-------|------|------|----------|-------------|
| Name | name | text | Yes | `e.g. Mathematics` |
| Grade Levels (comma separated) | gradeLevels | text | No | `Grade 1, Grade 2` |

### Strands Modal
**Title:** `"Strands · {area.name}"`
**Loading:** `"Loading…"`
**Empty:** `"No strands yet."`
**Add form (admin):** text input + `"Add"` button
**Per strand (admin):** `"Remove"` red button

### Modal titles
- Create: `"New Learning Areas"`, Edit: `"Edit Learning Areas"`
- Delete: `"Delete Learning Areas"`, message: `"This action cannot be undone. Are you sure?"`

### Empty state: `"No records yet."` / `"Get started by creating the first entry."`

---

## Route: `/academic/marks-entry` — MarksEntry
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Marks Entry"`
**Subtitle:** `"Record and manage student assessment scores."`
**Prompt (no grade):** `"Select Grade to Submit Marks"` (with pencil SVG)

### Filter Controls (5 dropdowns, progressively revealed)
| # | Control | Placeholder | Options |
|---|---------|-------------|---------|
| 1 | Grade | `"Select Grade"` | All grades from LEVELS |
| 2 | Subject | `"Select Subject"` | Filtered by grade |
| 3 | Exam Type | `"Type"` | Summative / Formative |
| 4 | Term | `"Term"` | Term 1/2/3 (auto-computed default) |
| 5 | Year | number input | auto: current year |

### Summary Bar (when loaded)
- `{marks.length} students` (brand-600), `{filledCount} scored` (brand-600), `{savedCount} saved` (emerald-600)
- Missing button: `"{missingCount} missing"` — amber when active
- Save status: `All saved` (emerald) / `Saving...` (amber) / `Save failed` (red)

### Table Columns
| # | Header | Content |
|---|--------|---------|
| 1 | `#` | Row number |
| 2 | `Student` | `{studentName}` (bold) |
| 3 | `Score (%)` | number input, min 0, max 100 |
| 4 | `Level` | 4 clickable level buttons (1-4) |
| 5 | `Remarks` | text input, auto-set from level |
| 6 | `Status` | checkmark (saved) or clock (unsaved) |

**Level button colors:**
- 1: `bg-red-100 text-red-700 ring-red-300`
- 2: `bg-amber-100 text-amber-700 ring-amber-300`
- 3-4: `bg-emerald-100 text-emerald-700 ring-emerald-300`
- Unselected: `bg-surface-100 text-surface-400`

**Auto-computation:** Score ≥80 → level 4, ≥60 → 3, ≥40 → 2, <40 → 1
**Auto-save:** 800ms debounce
**Remarks mapping:** Level 4=`"Exceeding Expectations"`, 3=`"Meeting Expectations"`, 2=`"Approaching Expectations"`, 1=`"Below Expectations"`

### Empty States
- No subject selected: `"Select a subject to begin entering marks."` (pencil SVG)
- No students in grade: `"No students found in this grade."`
- Search no match: `"No students match "{search}"."`
- Loading: `"Loading students..."`

---

## Route: `/academic/results` — StudentResults
**Accessible to roles:** schoolAdmin, teacher, accountant

**Title:** `"Class Results"`
**Description:** `"View compiled exam results per class and subject."`

### Filter Controls
| Control | Type | Options |
|---------|------|---------|
| Level | select | From LEVELS |
| Grade | select | From selectedLevel.grades |
| Term | number | auto-computed (1: Jan-Apr, 2: May-Aug, 3: Sep-Dec) |
| Year | number | auto: current year |

### Table (HTML, not DataTable)
**Columns:** `#`, `Student`, subject columns (first word of name), `Avg%`, `Grade`, `Pts`

**Score colors:** ≥80 emerald-600, ≥60 blue-600, ≥40 amber-600, <40 red-500
**Grade labels:** EE (≥80, emerald), ME (≥60, blue), AE (≥40, amber), BE (<40, red)
**Info bar:** `"{n} students · Sorted by rank"`, legend: `"EE ≥80% · ME ≥60% · AE ≥40% · BE <40%"`

### Buttons
| Label | Variant | Condition | Action |
|-------|---------|-----------|--------|
| `🖨️ Print` | secondary | results loaded | Opens print window |

### Empty State: `"No results found for {grade} Term {term}."`

---

## Route: `/academic/report-cards` — ReportCards
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Report Cards"`
**Description:** `"CBC-compliant report cards with competency-based grading."`

### Filter Controls
| Control | Type | Options |
|---------|------|---------|
| Level | select | From LEVELS |
| Grade | select | From selectedLevel.grades |
| Term | number | default 1 |
| Year | number | default current year |
| Sort | Dropdown | Name (A-Z), Name (Z-A), Mean (high-low), Mean (low-high), Grade (EE first), Grade (BE first) |

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `Load` / `...` | Always | Load students |
| `Print Selected ({n})` | loaded, selected >0 | Bulk print |
| `Print` (per student) | Always | Open print window |

### Report Card List (custom, not DataTable)
**Header:** Checkbox (select all), `Student`, `Subjects`, `Mean`, `Grade`, `Teacher`, `Head`, (action)
**Per row:** checkbox, student name (link), subject tiles (w-8 w-8 colored squares with grade label), mean, grade pill, teacher comment input, head comment input, print button
**Selected row:** `bg-brand-50/40`

**Grade colors:** BE=red, AE=amber, ME=emerald, EE=brand
**Print content:** `"SCHOOL REPORT CARD"`, columns `Subject | Score | Grade | Remarks`
**Grade labels:** `"Exceeding (4/4)"`, `"Meeting (3/4)"`, `"Approaching (2/4)"`, `"Below (1/4)"`
**Signature lines:** `Class Teacher | Head Teacher | Parent/Guardian`

### Performance Chart Modal
**Title:** `"{firstName} {lastName} — Subject Performance"`
**Content:** Summary stats (mean, grade, subjects count) + vertical bar chart

### Empty States
- Loading: spinner
- No students: `"No students found in {grade}."`

---

## Route: `/attendance` — StudentAttendance
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Attendance"`
**Description:** `"Only log absences, lateness, or excused students — everyone else is assumed present."`

### Controls
| Control | Type | Default |
|---------|------|---------|
| Date | date input | today |
| Search | text | placeholder `"Search students by name or grade..."` |

### Student Grid (CSS grid, 5 columns)
Each student card shows name + grade + status pills (Absent/Late/Excused)
**Status colors:**
| Status | Card Style | Dot | Label |
|--------|-----------|-----|-------|
| Absent | `ring-2 ring-red-300 bg-red-50 hover:bg-red-100` | `bg-red-500` | "Absent" |
| Late | `ring-2 ring-amber-300 bg-amber-50 hover:bg-amber-100` | `bg-amber-500` | "Late" |
| Excused | `ring-2 ring-blue-300 bg-blue-50 hover:bg-blue-100` | `bg-blue-500` | "Excused" |

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `+ Mark Exception` | Student has no exception | Adds to exceptions with default "absent" |
| Absent / Late / Excused pills | Student has exception | Toggles status |
| `Save {n} Exception{s}` | Exceptions exist | POSTs to API |

### Attendance History Section
- Student selector (Dropdown) + history list with date, colored dot, status badge
- No student selected: `"Select a student above to view their attendance history."`
- No records: `"No attendance records found for {name}."`

### Empty States
- All present: green card, `"All present — no exceptions"`

---

## Route: `/attendance/leave-notes` — LeaveNotes
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Leave Notes"`
**Description:** `"Record and manage student leave requests. Print leave notes for parent signatures."`

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `+ New Leave Note` | Always | Opens create modal |
| `Approve` | status "pending" | Patches to "approved", marks attendance excused |
| `Mark Returned` | status "approved", no return date | Patches return date, marks attendance present |
| `Print` | Always | Opens print modal |

### Table (DataTable)
**Columns:** `Student`, `Grade`, `Leave Date`, `Expected Return`, `Actual Return`, `Status`, `Signed By`

### Create Modal
**Title:** `"New Leave Note"`
**Fields:** Student (search-with-dropdown, req), Reason for Leave (textarea, req), Leave Date (date, req), Expected Return (date, req)
**Buttons:** `Cancel` / `Create Leave Note`

### Print Modal
**Title:** `"Leave Note"`
**Content:** Student name, grade, reason, dates, status, signature blocks (Parent/Guardian, Teacher/Admin, Witness/Head of Institution)
**Button:** `Print Leave Note` (opens browser print dialog)

---

## Route: `/fees/structures` — FeeStructures
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Fee Structures"`
**Description:** `"Set term fees by grade and student type — tuition, activity, admin levies, boarding, and food programme."`

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `+ New Fee Structure` | admin only | Opens create modal |
| `Edit` (per row) | admin only | Opens edit modal |
| `Delete` (per row) | admin only | Opens delete modal |

### Table (DataTable)
**Columns:** `Grade`, `Type`, `Status`, `Term`, `Year`, `Breakdown`, `Total`, `Actions`
- Status: custom badge — Active=`bg-emerald-50 text-emerald-700`, Draft=`bg-amber-50 text-amber-700`
- Breakdown: category pills — Tuition (blue), Activity (green), Admin (purple), Boarding (amber), Food (rose)
- Total: `<Money>` in bold brand-600

### Create/Edit Modal
**Title:** `"New Fee Structure"` / `"Edit Fee Structure"`
**Fields:** Grade (text, req), Student Type (select: Day Scholar/Boarding/Both, req), Term (number, req), Year (number, req)
**Fee Categories:** Tuition Fees (req), Activity Fee, Admin & ICT Levy, Boarding & Accommodation (hidden for "day"), Food Programme (hidden for "day")

### Confirm Modal
**Title:** `"Confirm Fee Structure"`
**Info:** `"Choose how to save: Draft keeps it hidden from invoice generation until published."`
**Buttons:** `← Back to Edit` / `💾 Save as Draft` (amber) / `✅ Publish & Activate` (brand gradient)

### Delete Confirmation
**Title:** `"Delete Fee Structure"`
**Message:** `"Are you sure?"` + `"Existing invoices generated from this structure will not be affected."`
**Buttons:** `Cancel` / `🗑 Delete`

---

## Route: `/fees/invoices` — Invoices
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Invoices"`
**Description:** `"Fee invoices, payments, and M-Pesa reconciliation."`

### Stat Boxes (3 cards)
| Label | Value | Color |
|-------|-------|-------|
| `Total Outstanding` | `KES {sum of balance}` | Amber gradient |
| `Total Collected` | `KES {sum of amountPaid}` | Emerald gradient |
| `Overdue Accounts` | `{count}` | Red gradient |

### Filter Tabs
| Tab | Filter |
|-----|--------|
| `All` | no filter |
| `Pending` | unpaid/partial |
| `Paid` | paid |
| `Overdue` | overdue |

### Buttons
| Label | Variant | Action |
|-------|---------|--------|
| `Generate for All` | secondary | Opens BulkGenerateModal |
| `+ Generate Invoice` | primary (brand gradient) | Opens GenerateInvoiceModal |
| `Record Payment` (per row) | text-brand | Opens PaymentModal |
| `Receipts` (per row) | text-surface | Opens ReceiptsModal |

### Table (DataTable)
**Columns:** `Student`, `Grade`, `Term`, `Due`, `Total`, `Paid`, `Balance`, `Status`, `Actions`
- Balance: red-600 if >0, emerald-600 if 0
- Status: `<EnumBadge>` (paid=emerald, pending=amber, overdue=red, partial=amber)

### GenerateInvoiceModal (2-step)
**Step 1:** Student search + Fee Structure selector + Due Date
**Step 2:** Summary + Fee Breakdown + Total
**Buttons:** `Cancel` / `Review & Confirm` / `← Back to edit` / `✅ Confirm & Generate Invoice`

### BulkGenerateModal (3-step)
**Step 1:** Fee Structure select
**Step 2:** Summary confirmation
**Step 3:** Results: `"Generation Complete"` + Created/Skipped/Errors counts
**Buttons:** `Cancel` / `Review & Confirm` / `← Back` / `✅ Confirm & Generate All`

### PaymentModal
**Title:** `"Record Payment"`
**Fields:** Payment Amount (KES, req) + M-Pesa STK section (phone, paybill) + Manual section (Payment Method: Cash/Bank Transfer/M-Pesa manual)
**Buttons:** `📱 Send STK Push to Parent` / `Cancel` / `✅ Record Payment`

### ReceiptsModal
**Title:** `"Payment Receipts"`
**Empty:** `"No receipts issued yet."` + `"Receipts are generated when a payment is recorded against this invoice."`
**Content:** Summary bar + receipt list (numbered circle + Receipt# + date + amount + payment method badge)

---

## Route: `/fees/reconciliation` — Reconciliation
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Payment Reconciliation"`
**Description:** `"Manually match unmatched M-Pesa transactions to student invoices."`

### Data Display
Each transaction card shows: Transaction ID (mono), `<EnumBadge value={matchStatus}>`, amount (bold), phone number, account reference, date

### Match Modal
**Title:** `"Match to Invoice"`
**Content:** Transaction info (amber box) + Student Dropdown + Invoice list (clickable)
**Invoice loading:** `"Loading invoices..."`
**Invoice empty:** `"No invoices found for this student."`

### Button
| Label | Action |
|-------|--------|
| `Match to Invoice` (per transaction) | Opens match modal |

### Empty State: `"No unmatched transactions."`

---

## Route: `/fees/payments` — PaymentsLog
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Payments Log"`
**Description:** `"All payments (M-Pesa + manual) recorded in the system."`

### Filters
| Control | Type | Options |
|---------|------|---------|
| Search | text | `"Search by transaction ID, phone, or reference..."` |
| Type filter | Dropdown | All Types / M-Pesa / Manual |
| Status filter | Dropdown | All Statuses / Auto Matched / Manually Matched / Unmatched / Manual Entry |

**Running total:** `"Total:"` + `<Money>` (brand-600)

### Table (custom HTML table)
**Columns:** `Type`, `Transaction ID`, `Amount`, `Phone`, `Reference`, `Status`, `Date`
**Type pills:** M-Pesa=`bg-green-100 text-green-700`, Manual=`bg-blue-100 text-blue-700`

### Empty State: `"No payments found."`

---

## Route: `/fees/meal-timetable` — MealTimetable
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Daily Meal Timetable"`
**Description:** If admin: `"Set fixed food quantities for each meal, each day. These are auto-consumed by the system daily."` If not admin: `"View the daily food plan for the school."`

### Filter Controls
| Control | Type | Options |
|---------|------|---------|
| Term | select | Term 1/2/3 (auto-computed) |
| Year | number | current year |

### The 7×3 Grid (HTML table)
**Headers:** `Meal` | `Mon` | `Tue` | `Wed` | `Thu` | `Fri` | `Sat` | `Sun`
**Rows:** Breakfast (🥐), Lunch (🥘), Supper (🍲)
**Empty cell:** `"Click to add"` (admin) or `"—"` (non-admin)
**Filled cell:** itemName (bold) + quantity + unit in `bg-brand-50 text-brand-700` (active) or `bg-surface-50 text-surface-400 line-through` (inactive)
**Click (admin):** Opens edit modal for that day+meal

### Stat Cards
| Label | Value | Color |
|-------|-------|-------|
| `Daily Food Cost (All Meals)` | per-day cost badges (Mon-Sun) | white card |
| `Weekly Total` | `KES {grandTotal}` | brand gradient |

### Edit Meal Slot Modal
**Title:** `"Edit — {Day} {Meal}"` (e.g. `"Edit — Monday Breakfast"`)
**Item list:** each shows itemName, quantity×unit, cost, `Disable`/`Enable` toggle (amber/emerald), `Remove` (red)
**Empty:** `"No items added yet."`
**Add section:**
| Control | Type |
|---------|------|
| Preset selector | select, filtered to available presets |
| Quantity | number (step 0.5, min 0) |
| Add button | primary |
**Preset empty:** `"All food items already added to this meal."`
**Footer:** `Done` (secondary)

---

## Route: `/fees/food-dashboard` — FoodDashboard
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Food Dashboard"`
**Description:** `"Stock levels, daily consumption, and reorder alerts based on the meal timetable."`

### Stat Boxes (4 cards)
| Label | Value | Color |
|-------|-------|-------|
| `Daily Food Cost` | `KES {totalDailyCost}` | Brand |
| `Weekly Food Cost` | `KES {totalWeeklyCost}` | Emerald |
| `Active Food Items` | `{count}` | Amber |
| `Low Stock Alerts` | `{count}` | Red if >0, gray if 0 |

### Alerts
- **Reorder Required** (when lowStock >0): Red banner with red pills per item: `"{itemName}: {stock}{unit} left ({daysLeft}d)"`
- **Unused Items** (when items not in timetable): Amber banner `"{n} food item(s) not in the current meal timetable."` + `"Add them to the Meal Timetable"` link

### Table (custom HTML)
**Columns:** `Food Item`, `Stock`, `Daily Use`, `Weekly Use`, `Weekly Cost`, `Days Left`, `Status`
- Stock: red-600 if low, else surface-800
- Weekly Cost: emerald-600
- Days Left: red (≤2), amber (≤7), gray (>7)
- Status pills: Reorder=`bg-red-50 text-red-700`, Active=`bg-emerald-50 text-emerald-700`, Not in timetable=`bg-surface-100 text-surface-400`
- Row dimmed: `opacity-60` for items with dailyUsage===0 and not in timetable

---

## Route: `/fees/food-presets` — FoodPresets
**Accessible to roles:** schoolAdmin

**Title:** `"Food Presets"`
**Description:** `"Set food items and price per kg/litre for the Bring-Your-Own food programme. Staff selects these when logging food."`

### Button
| Label | Style | Condition |
|-------|-------|-----------|
| `+ New Food Preset` | Gradient rose, white text | Always |

### Table (DataTable)
**Columns:** `Item`, `Price`, `Per`, `In Stock`, `Reorder`, `Status`, `Actions`
- In Stock color: red-500 (0), amber-500 (≤reorder), emerald-600 (>reorder)
- Status: Active=`text-emerald-600`, Inactive=`text-surface-400`

### Create/Edit Modal
**Title:** `"New Food Preset"` / `"Edit Food Preset"`
**Fields:**
| Label | Name | Type | Required | Options |
|-------|------|------|----------|---------|
| Food Item | itemName | text | Yes | placeholder "e.g. Rice, Maize Flour" |
| Price (KES) | unitPrice | number (0.01) | Yes | |
| Unit | unit | select | Yes | kg, g, l, pcs, bag |
| Current Stock | stockQuantity | number (0.01) | No | helpText "How many units are in stock now" |
| Reorder At | reorderLevel | number (0.01) | No | helpText "Alert when stock drops to this level" |

**Buttons:** `Cancel` (ghost) / `Saving...` or `Save` (primary)

---

## Route: `/fees/food-logs` — FoodLogs
**Accessible to roles:** schoolAdmin, teacher

**Title:** `"Food Programme Logs"`
**Description:** `"Log parent contributions (per student), purchases, wastage. Consumption is auto-generated from the meal timetable."`

### Stat Boxes (4 cards, hidden when loading or no logs)
| Label | Value | Color |
|-------|-------|-------|
| `Entries` | `filteredLogs.length` | Brand |
| `Est. Value` | `KES {totalValue}` | Emerald |
| `Students` | unique student count | Amber |
| `Boarding` | boarding students count | Purple |

### Log Entry Form
**Fields:**
| Label | Type | Required | Options |
|-------|------|----------|---------|
| Type * | select | Yes | Consumption (disabled), Contribution, Purchase, Wastage |
| Food Item * | text with autocomplete | Yes | Suggestions from presets (max 8) |
| Quantity | number (0.5) | No | |
| Unit | select | No | kg, g, l, pcs |
| Term | number | No | default 1 |
| Year | number | No | default current year |

**Student selector (contribution only):** search input (`"Type student name, grade, or boarding house..."`) with dropdown of boarding students
**Bulk toggle (contribution only):** `Bulk Log` / `Single Mode` button

### Log Type Pills (table)
| Type | Color |
|------|-------|
| consumption | `bg-blue-50 text-blue-700` |
| contribution | `bg-emerald-50 text-emerald-700` |
| purchase | `bg-amber-50 text-amber-700` |
| wastage | `bg-red-50 text-red-700` |

### Table (custom HTML)
**Columns:** `Date`, `Student`, `Grade`, `Type`, `Item`, `Qty`, `Value`, `Notes`, `Action`
**Search:** `"Search entries by student, item..."` + `"{n} entries"` badge

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `Clear` | Always | Resets form |
| Dynamic submit (varies) | Always | Logs entry |
| `Delete` (per row) | admin only | Opens delete confirmation |

### Bulk Select Modal
**Title:** `"Select Boarding Students"`
**Content:** Search + scrollable student list (checkbox style, initials avatar, name, grade, house)
**Button:** `"Done ({n} selected)"`

### Delete Confirmation
**Title:** `"Delete Entry"`
**Message:** `"Remove this food log entry?"`
**Buttons:** `Cancel` / `Delete` (red)

### Empty State: `"No food logged yet. Select a student above."`

---

## Route: `/staff` — StaffList
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Staff"`
**Description:** `"Teaching and support staff. BOM teachers get monthly salary; TSC get extra duty pay only."`

### Button
| Label | Condition | Action |
|-------|-----------|--------|
| `+ New Staff` | admin | Navigate to `/staff/new` |

### Table (via ResourcePage)
**Columns:** `Name`, `Teacher Type`, `Role`, `Base Rate`, `Extra Rate`, `Status`
- Teacher Type: `<EnumBadge>` (BOM/TSC)
- Role: `<EnumBadge>` (teacher/support)
- Base Rate: `<Money>`
- Extra Rate: `<Money>` or `"default"` in surface-400

### Form Fields (ResourcePage)
| Label | Name | Required |
|-------|------|----------|
| Name | name | true |
| Phone | phone | true |
| Email | email | false |
| Active | isActive | false (checkbox) |

---

## Route: `/staff/new` — CreateStaff
**Accessible to roles:** schoolAdmin

**Title:** UNKNOWN (page was not fully explored; UNCLEAR if it uses a different title)
**Fields:**
| Label | Name | Type | Required | Options |
|-------|------|------|----------|---------|
| Full Name | name | text | Yes | |
| Phone | phone | text | Yes | |
| Email | email | email | No | |
| Role | role | select | Yes | Teacher, Support Staff |
| Teacher Type | teacherType | select | Yes (if teacher) | BOM, TSC |
| Base Rate (KES/month) | baseRate | number | Yes (if teacher) | |
| Extra Session Rate (KES) | extraSessionRate | number | No | |
| Employment Type | employmentType | select | Yes | flatRate, sessionBased |

**Validation:** `"Name and phone are required"`, `"Base rate is required for teachers"`
**Button:** `Saving...` / `Save` (primary)

---

## Route: `/staff/attendance` — StaffAttendance
**Accessible to roles:** schoolAdmin

**Title:** `"Staff Attendance"`
**Description:** `"Feeds payroll entry generation for session-based staff."`

### Form Fields
| Control | Type | Options |
|---------|------|---------|
| Staff Member | Dropdown | All staff |
| Date | date | default today |
| Status | Dropdown | present, absent, halfDay, leave |
| Sessions | number | |

### Button
| Label | Action |
|-------|--------|
| `Mark` | POSTs attendance |

### Records List
Each card: date (mono) + sessions + `<EnumBadge value={status}>`
**Empty:** `"No attendance recorded for this staff member yet."`

---

## Route: `/staff/class-teachers` — ClassTeachers
**Accessible to roles:** schoolAdmin

**Title:** `"Class Teachers"`
**Description:** `"Assign teachers to grades and upload their signature images for report cards."`

### Buttons
| Label | Action |
|-------|--------|
| `+ Assign Teacher` | Opens new assignment form |
| `Upload` (signature) | Uploads image |
| `Remove` (signature) | Clears signature |
| `Assign Teacher` / `Update Assignment` | Saves |
| `Edit` (per row) | Opens edit form |
| `Remove` (per row) | Deletes assignment |

### Form Fields
| Label | Type | Required | Options |
|-------|------|----------|---------|
| Teacher * | Dropdown | Yes | Staff with role "teacher" |
| Grade * | Dropdown | Yes | All grades |
| Class | Dropdown | No | All classes, Class A-E |
| Signature Image | file | No | accept image/* |

### Data Display
Each row: signature preview (or `"No sig"`), staff name (bold), grade/class, Edit + Remove buttons
**Empty:** `"No class teachers assigned yet."`

---

## Route: `/staff/session-assignments` — SessionAssignments
**Accessible to roles:** schoolAdmin

**Title:** `"Session Assignments"`
**Description:** `"Assign teachers to Morning, Evening, and Weekend sessions. These feed into payroll extra duty calculations."`

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `Generate for Payroll` | admin | Generates payment records |
| `+ Assign Session` | admin | Opens form |
| `Assign` | form open | Creates assignment |
| `Remove` (per row) | admin | Deletes assignment |

### Form Fields
| Label | Type | Required | Options |
|-------|------|----------|---------|
| Teacher * | Dropdown | Yes | Active staff |
| Session * | Dropdown | Yes | Morning, Evening, Weekend |
| Day * | Dropdown | Yes | Sunday (0) to Saturday (6), default Monday |

### Session Type Pills
| Type | Color |
|------|-------|
| morning | `bg-amber-100 text-amber-700` |
| evening | `bg-indigo-100 text-indigo-700` |
| weekend | `bg-purple-100 text-purple-700` |

### Info Panel: "How this works" explains assignments feed into payroll extra duty calculations

### Empty State: `"No session assignments yet. Click \"+ Assign Session\" to add one."`

---

## Route: `/payroll` — PayrollRuns
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Salaries & Payroll"`
**Description:** `"Create monthly payroll runs, generate payslips from attendance, approve, and process payments."`

### Stat Cards
| Label | Value | Color |
|-------|-------|-------|
| Draft | `{count}` | Amber |
| Approved | `{count}` | Blue |
| Paid | `{count}` | Emerald |
| Total Runs | `{count}` | Surface |

### Workflow Indicator
Draft (amber pill+dot) → Approved (blue pill+dot) → Paid (emerald pill+dot)
+ `"Click a run to view details"`

### Table (DataTable)
**Columns:** `Period`, `Status`
**Row click:** Navigates to `/payroll/{id}`
**Empty:** `"Create your first payroll run to get started."`

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `+ New Run` | Always | Opens create modal |
| `Delete` (per row) | status "draft" | Deletes (with confirm()) |

### New Run Modal
**Title:** `"New Payroll Run"`
**Fields:** Month (1-12, number, req), Year (number, req)
**Buttons:** `Cancel` / `Create Draft`

---

## Route: `/payroll/:id` — PayrollRunDetail
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"{monthName} {year}"` (e.g. "January 2026")
**Subtitle:** `"Payroll run · Created as draft"`
**Back link:** `"← Back to all runs"`

### Buttons
| Label | Condition | Action |
|-------|-----------|--------|
| `Generate from Attendance` | status "draft" | Generates entries |
| `+ Manual Entry` | status "draft" | Opens add modal |
| `Approve` | status "draft" | Approves run |
| `Mark Paid (posts to ledger)` | status "approved" | Marks paid + posts to ledger |
| `Refresh Data` | Always | Reloads extra duty |
| `Add Adjustment` (per entry) | status "draft" | Opens adjustment modal |

### Extra Duty Table
**Columns:** `Staff`, `Category`, `Type`, `Sessions`, `Rate (KES)`, `Amount (KES)`
Session type pills: morning (amber), evening (indigo), weekend (purple)
**Empty:** `"No extra duty sessions found for this period."`

### Entry Table (BOM Teachers / Support Staff)
**Columns:** `Staff`, `Rate`, `Sessions`, `Days`, `Gross`, `Net`
**Empty/note:** `"TSC Teachers on this run: {names} — these staff receive extra duty / per diem only"`

### Reconciliation Card
Salary Breakdown + Extra Duty + Grand Total (Gross Pay, Net Pay Salary, Extra Duty, Total Payout)

### AddEntryModal
**Fields:** Staff (select, req), Base Rate (number, req), Sessions (number, opt), Days (number, opt)
**Buttons:** `Cancel` / `Add`

### AdjustmentModal
**Fields:** Reason (text, req), Amount +/- (number, req)
**Buttons:** `Cancel` / `Apply`

### States
- Loading: spinner
- Not found: `"Payroll run not found."`

---

## Route: `/ledger/accounts` — LedgerAccounts
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Chart of Accounts"`
**Description:** `"Categories where money is recorded — e.g., Cash, Fees Income, Salaries Expense. Every transaction moves money between these accounts."`

### Table (via ResourcePage)
**Columns:** `Code` (tabular font), `Name`, `Type` (EnumBadge)

### Form Fields
| Label | Name | Type | Required | Options |
|-------|------|------|----------|---------|
| Code | code | text | Yes | placeholder "e.g. 1000" |
| Name | name | text | Yes | |
| Type | type | select | Yes | Asset, Liability, Equity, Income, Expense |

---

## Route: `/ledger/journal` — JournalEntry
**Accessible to roles:** schoolAdmin, accountant

### Main view (mode "choose")
**Title:** `"Record a Transaction"`
**Description:** `"Choose what happened, fill in the details — we'll handle the accounting."`

**3 Template Cards:**
| Emoji | Title | Type Badge |
|-------|-------|-----------|
| 🛒 | Buy Supplies | "Expense" (emerald) |
| 🎁 | Donation Received | "Income" (purple) |
| 🔧 | Repair / Maintenance | "Expense" (amber) |

**Link:** `Advanced Entry` (text-surface-400)

**Recent Transactions (max 8):**
Each shows description + source type badge + date + created by + amount + delete button (admin)
**Empty:** `"No transactions recorded yet."` (py-6, surface-400)

**Source type badges:** Manual (surface), Fee Payment (emerald), Payroll (blue), Expense (amber), SMS Cost (purple), Food Purchase (orange), Food Contribution (lime)

### Template: Buy Supplies
**Fields:** Date (default today), Supplier (text, opt, placeholder "e.g. Kifaru Stationers"), What was bought? (text, opt, placeholder "e.g. Exercise books, pens, chalk"), Amount (KES) * (number min 1, req), Paid from * (Dropdown: Cash/M-Pesa Till/Bank Account)
**Button:** `Record Purchase — KES {amount}` (brand)

### Template: Donation Received
**Fields:** Date, Donor name (text, opt, placeholder "e.g. John Kariuki Foundation"), Amount (KES) * (number min 1, req), Received into * (Dropdown: Cash/M-Pesa Till/Bank Account)
**Button:** `Record Donation — KES {amount}` (brand)

### Template: Repair / Maintenance
**Fields:** Date, Contractor or vendor (text, opt, placeholder "e.g. Paul's Plumbing"), What was repaired? (text, opt, placeholder "e.g. Leaking roof in Grade 4 classroom"), Amount (KES) * (number min 1, req), Paid from * (Dropdown: Cash/M-Pesa Till/Bank Account)
**Button:** `Record Repair — KES {amount}` (brand)

### Advanced Entry
**Title:** `"Advanced Entry"`
**Description:** `"Manually set which accounts are debited and credited. Use this for corrections or anything that doesn't fit the templates."`
**Fields:** Date, Description (text, opt), Account lines (dropdown + Money Out + Money In)
**Button:** `Add account line` (text-brand) / `Record Transaction` (brand)
**Validation:** `"Total money out must equal total money in"` (red) / balanced totals (emerald)
**Buttons:** `Back to templates`

---

## Route: `/ledger/trial-balance` — TrialBalance
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"Account Balances"`
**Description:** `"Shows every account with its total money out and money in. The totals must always match — this confirms all transactions are recorded correctly."`

### Table (HTML)
**Columns:** `Code` (mono surface-600), `Account` (font-medium), `Type` (EnumBadge), `Money Out` (Money, right-aligned), `Money In` (Money, right-aligned)
**Footer:** Total row (bold, border-top-2) showing totalDebit and totalCredit
**EnumBadge values:** asset, liability, equity, income, expense
**No buttons, no forms, no modals**
**Loading:** spinner

---

## Route: `/sms/templates` — SmsTemplates
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"SMS Templates"`
**Description:** `"Reusable message templates used by campaigns and automated rules."`

### Table (via ResourcePage)
**Columns:** `Name`, `Type` (EnumBadge), `Language` (uppercased), `Status` (EnumBadge: active/inactive)

### Form Fields
| Label | Name | Type | Required | Options |
|-------|------|------|----------|---------|
| Name | name | text | Yes | |
| Type | type | select | Yes | feeReminder, receipt, results, meeting, attendance, emergency, custom |
| Content | content | textarea | Yes | placeholder "Dear {guardianName}, ..." |
| Language | language | select | No | English (en), Swahili (sw) |
| Active | isActive | checkbox | No | |

---

## Route: `/sms/campaigns` — SmsCampaigns
**Accessible to roles:** schoolAdmin, accountant

### List View
**Title:** `"Send Messages"`
**Description:** `"Send SMS to parents — fee reminders, term dates, results, and more."`

**Table (DataTable):** `Name`, `Type`, `Recipients`, `Status` (EnumBadge), `Cost`
**Buttons:** `+ New Message` (admin only), `Send` (per draft row, admin only)

### Create View (3-step wizard)
**Title:** `"New SMS Campaign"`
**Breadcrumb:** `"Send Messages / New Message"` with step indicator

**Step 1 (Message):**
| Label | Type | Required | Options |
|-------|------|----------|---------|
| Campaign Name | text | Yes | |
| Schedule | select | Yes | Send Now (bulk), Schedule for Later (scheduled) |
| Use Template | select | No | Active template names |
| Message | textarea | Yes | placeholder "Dear {guardianName},\nYour child {studentName}..." |

**Variables (expandable):** `{guardianName}`, `{studentName}`, `{balance}`, `{totalAmount}`, `{amountPaid}`, `{dueDate}`, `{currentTerm}`, `{academicYear}`, `{termStartDate}`, `{termEndDate}`, `{schoolName}`

**Button:** `Choose Recipients →` (disabled if !name || !message)

**Step 2 (Target - radio cards):**
| Option | Description |
|--------|-------------|
| All Parents | Send to every guardian who hasn't opted out |
| By Grade | Send to parents of students in a specific grade |
| By Fee Status | Send to parents based on fee payment status |

**Conditional fields:** Select Grade (grades list), Fee Status (Overdue Fees/No Payment Made/Partially Paid/Fully Paid)

**Recipient preview:** count + first 10 names
**Message preview:** first 120 chars with variable substitution
**Button:** `← Edit Message` / `Send to {n} recipients →` (shows "Sending...")

---

## Route: `/sms/automated-rules` — AutomatedRules
**Accessible to roles:** schoolAdmin

**Title:** `"Automated SMS Rules"`
**Description:** `"Trigger-based messaging: fee due/overdue, low attendance, results published."`

### Buttons
| Label | Action |
|-------|--------|
| `+ New Rule` | Opens create modal |
| `Enable` / `Disable` (per rule) | Toggles isActive |

### Rule Cards (custom list)
Each shows: name + trigger type badge + template name + Active/Inactive badge

### Create Modal
**Title:** `"New Automated Rule"`
**Fields:** Rule Name (text, req), Trigger (select: feeDueSoon, feeOverdue, lowAttendance, resultPublished, emergencyClosure, custom), Template (select from templates, req)
**Buttons:** `Cancel` / `Create`
**Trigger badges:** `<EnumBadge>`

### Empty State: `"No rules configured yet."` (center, text-surface-500)

---

## Route: `/sms/logs` — SmsLogs
**Accessible to roles:** schoolAdmin, accountant

**Title:** `"SMS Logs"`
**Description:** `"Delivery status per recipient message."`

### Filter Pills
| Pill | Filter |
|------|--------|
| All | no filter |
| Queued | queued |
| Sent | sent |
| Delivered | delivered |
| Failed | failed |

Active: `bg-brand-600 text-white`, Inactive: `border-surface-300 text-surface-500`

### Table (DataTable)
**Columns:** `Recipient` (phone, mono), `Type`, `Message` (truncated), `Status` (EnumBadge: queued/sent/delivered/failed), `Cost`

---

## Route: `/settings` — SchoolSettings
**Accessible to roles:** schoolAdmin

**Title:** `"School Settings"`
**Description:** `"Configure your school name, term dates, and system preferences."`

### Button
| Label | Action |
|-------|--------|
| `Save Settings` / `Saving...` | PUTs to settings API |

### 6 Card Sections

**School Information:**
| Label | Name | Type | Required |
|-------|------|------|----------|
| School Name | schoolName | text | Yes |
| School Motto | schoolMotto | text | No |
| Address | schoolAddress | text | No |
| Phone | schoolPhone | tel | No |
| Email | schoolEmail | email | No |

**Current Term:**
| Label | Name | Type | Options |
|-------|------|------|---------|
| Term | currentTerm | select | Term 1/2/3 |
| Academic Year | currentAcademicYear | text | |
| Term Start Date | termStartDate | date | |
| Term End Date | termEndDate | date | |
| Next Term Start Date | nextTermStartDate | date | |

**Other Settings:**
| Label | Name | Type | Options |
|-------|------|------|---------|
| Currency | currency | select | KES, UGX, TZS, USD |
| SMS Sender ID | smsSenderId | text | |

**Payroll Settings:**
| Label | Name | Type | Min/Max |
|-------|------|------|---------|
| Pay Day (1-31) | payDay | number | 1-31 |

**Extra Duty Session Rates:**
| Label | Name | Type |
|-------|------|------|
| Morning Session (KES) | morningSessionRate | number |
| Evening Session (KES) | eveningSessionRate | number |
| Weekend Session (KES) | weekendSessionRate | number |

**Digital Signatures:**
- Head Teacher Signature: file upload (accept `image/png,image/jpeg,image/gif,image/webp`) + URL text paste
- Upload/Remove buttons

### States
- Loading: `w-8 h-8` spinner centered `mt-20`
- Not found: `"No settings found"` centered `mt-20`

---

## Route: `/settings/paybills` — Paybills
**Accessible to roles:** schoolAdmin

**Title:** `"Payment Methods"`
**Description:** `"Configure M-Pesa paybill numbers for fee collection. Each paybill can have its own Daraja credentials."`

### Table (via ResourcePage)
**Columns:** `Name`, `Shortcode`, `Purpose`, `Active` (Yes/No)

### Form Fields
| Label | Name | Type | Required | Placeholder |
|-------|------|------|----------|-------------|
| Paybill Name | name | text | Yes | "e.g. School Tuition Paybill" |
| Business Shortcode | shortcode | text | Yes | "e.g. 174379" |
| Account Ref Format | accountReferenceFormat | text | Yes | "e.g. {firstname}{lastname}-{grade}" |
| Purpose | purpose | select | Yes | Tuition, Trip, Event, Custom |
| Consumer Key Ref | darajaConsumerKeyRef | text | Yes | "ref:mpesa_consumer_key" |
| Consumer Secret Ref | darajaConsumerSecretRef | text | Yes | "ref:mpesa_consumer_secret" |
| Passkey Ref | darajaPasskeyRef | text | Yes | "ref:mpesa_passkey" |
| Active | isActive | checkbox | No | |

---

## Route: `/parents/links` — ParentLinks
**Accessible to roles:** schoolAdmin

**Title:** `"Parent Links"`
**Description:** `"Assign parent accounts to students for the parent portal."`

### Buttons
| Label | Variant | Action |
|-------|---------|--------|
| `+ New Link` | primary | Opens create modal |
| `Remove` (per row) | danger (sm) | Deletes link |

### Data Display (custom div list)
Each row: `{userName || userId}` (font-medium) + `"Student: {studentName || studentId}"`

### Create Modal
**Title:** `"Link Parent to Student"`
**Fields:** Parent User ID (text, req, placeholder "User UUID"), Student ID (text, req, placeholder "Student UUID")
**Buttons:** `Cancel` / `Create Link`

### Empty State
Label: `"No parent links yet"`, Description: `"Link parents to students so they can access the parent portal."`

---

## Route: `/admin/users` — Users
**Accessible to roles:** schoolAdmin

**Title:** `"Users"`
**Description:** `"Register staff, accountants, and parent accounts."`

### Form Only (no table)
**Fields:**
| Label | Name | Type | Required | Options |
|-------|------|------|----------|---------|
| Full Name | name | text | Yes | |
| Phone | phone | text | Yes | |
| Temporary Password | password | text | Yes | placeholder "Min 6 characters" |
| Role | role | select | Yes | School Admin, Teacher, Accountant, Parent |

### Button
| Label | Action |
|-------|--------|
| `Create User` | Calls authApi.register(), resets form on success |

**No modals, no table, no badges, no empty state**

---

## Route: `/admin/logs` — SystemLogs
**Accessible to roles:** schoolAdmin

**Title:** `"System Logs"`
**Description:** `"Audit trail of all system actions, filterable by category."`

### Category Filters
**Summary chips with counts:**
| Category | Color |
|----------|-------|
| Leave Notes | `bg-violet-100 text-violet-700` |
| Invoices | `bg-blue-100 text-blue-700` |
| Payments | `bg-emerald-100 text-emerald-700` |
| Students | `bg-amber-100 text-amber-700` |
| Users | `bg-cyan-100 text-cyan-700` |
| Settings | `bg-surface-100 text-surface-700` |
| Attendance | `bg-orange-100 text-orange-700` |
| Report Cards | `bg-pink-100 text-pink-700` |
| Fee Structures | `bg-indigo-100 text-indigo-700` |
| Other | `bg-surface-100 text-surface-500` |

Active chip: `ring-2 ring-brand-500/30 shadow-sm`

### Log Entries (custom div list)
Each entry: colored dot + category pill (text-[10px]) + action (capitalized, font-medium) + description (surface-500) + performedByName + timestamp (text-[11px])

### Pagination
50 per page, prev/next arrow buttons, page indicator `"{page} / {totalPages}"`
Total: `"{total} total entries"`

### Empty State: `"No audit logs found."` (p-10, text-surface-400)

---

## Route: `*` — NotFound
**Accessible to:** Any authenticated user

**Content:**
- Large `"404"` in `text-7xl font-bold text-surface-200`
- `"Page not found"` in `text-xl font-semibold text-surface-600`
- `"The page you're looking for doesn't exist or has been moved."` in `text-sm text-surface-400`
- Button: `"Go to Dashboard"` (primary, links to `/`)

---

## END OF INVENTORY
