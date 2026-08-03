# UI/UX Audit Report — School Management Dashboard

**Date:** 2026-08-02  
**Scope:** Entire frontend (`/frontend/src`) — components, pages, layout, global CSS, Tailwind config  
**Method:** Static analysis of all source files; contrast ratios computed via WCAG relative luminance formula

---

## 1. DESIGN TOKENS IN USE

### 1.1 Color Palette — Custom (tailwind.config.js)

| Token | Shade | Hex | Semantic Role |
|-------|-------|-----|---------------|
| `brand` | 50 → 950 | `#fef3e7` → `#3e0f06` | Primary identity (orange-amber spectrum) |
| `accent` | 50 → 950 | `#ecfeff` → `#083344` | Cyan/teal accent |
| `surface` | 50 → 950 | `#faf8f6` → `#1a1510` | Warm neutral gray for text, borders, backgrounds |
| `success` | 50 → 700 | `#ecfdf5` → `#047857` | Positive states (emerald) |
| `warning` | 50 → 700 | `#fffbeb` → `#b45309` | Caution states (amber) |
| `danger` | 50 → 700 | `#fef2f2` → `#b91c1c` | Negative states (red) |

**Also in use — Tailwind built-in colors:** `emerald`, `amber`, `red`, `blue`, `purple`, `pink`, `indigo`, `rose`, `cyan`, `sky`, `teal`, `orange`, `green`

---

### 1.2 Color Usage by Location

#### Page Body
- **Background:** `bg-surface-50` → `#faf8f6` *(index.css:10)*
- **Primary text:** `text-surface-900` → `#2d241b` *(index.css:10)*
- **Muted descriptions:** `text-surface-500` → `#9a8065`
- **Subtle/metadata:** `text-surface-400` → `#b5a38c`
- **Placeholder text:** `placeholder-surface-400` → `#b5a38c`

#### Sidebar (`Sidebar.tsx`)
- **Container:** `bg-white`, `border-r border-surface-200` (`#ded6cc`)
- **Logo:** `bg-brand-600` (`#cc4409`), text `text-white`
- **Active nav item:** `bg-brand-50` (`#fef3e7`), `text-brand-700` (`#a9320b`)
- **Inactive nav item:** `text-surface-600` (`#7a654d`), hover → `bg-surface-50` / `text-surface-900`
- **Group labels:** 8 hardcoded colors (brand, accent, emerald, rose, cyan, purple, sky, surface)

#### Topbar (`Topbar.tsx`)
- **Header:** `bg-white/80 backdrop-blur-md`, border-bottom `border-surface-200`
- **Gradient accent bar:** `bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600`
- **Role badge:** hardcoded per role → `brand-100/700`, `purple-100/700`, `cyan-100/700`, `teal-100/700`

#### Cards
- **Container:** `bg-white rounded-xl border border-surface-200 shadow-sm`
- **Top accent stripe:** `bg-gradient-to-r from-brand-500/30 via-accent-500/20 to-transparent` (every card)

#### Stat Metric Cards (Pattern C1 — gradient stat boxes)
| Page | Stat | Color Family |
|------|------|-------------|
| FoodDashboard | Daily Food Cost | `brand` (50/200/600/900) |
| FoodDashboard | Weekly Food Cost | `emerald` |
| FoodDashboard | Active Food Items | `amber` |
| FoodDashboard | Low Stock Alerts | `red` (or `surface` if zero) |
| Invoices | Total Outstanding | `amber` |
| Invoices | Total Collected | `emerald` |
| Invoices | Overdue Accounts | `red` |
| Payroll | Draft runs | `amber` |
| Payroll | Approved runs | `blue` |
| Payroll | Paid runs | `emerald` |
| FoodLogs | Entries count | `brand` |
| FoodLogs | Est. Value | `emerald` |
| FoodLogs | Students | `amber` |
| FoodLogs | Boarding | `purple` |

**Pattern:** Each stat box uses `bg-gradient-to-br from-{color}-50 to-{color}-100 rounded-2xl p-4 border border-{color}-200`. Label → `text-{color}-600`, value → `text-{color}-900`.

#### Dashboard Stat Tiles (Pattern C2 — StatCard)
**Color logic: programmatic** — the `color` prop (e.g. `text-brand-600`) is parsed by regex to derive `bg-{color}-100` for the icon box. Dynamic per-caller:
- Active Students → `text-brand-600`
- Fee Collection → dynamic `text-emerald-600` / `text-amber-600` / `text-red-600`
- Overdue Fees → `text-red-600`
- Active Staff → `text-purple-600`

#### Badges / Pills (EnumBadge — 32 status values mapped)
| Semantic Group | Colors (bg/border/text) | Status Values |
|---------------|------------------------|---------------|
| Success (emerald) | `emerald-50/200/700` | paid, approved, delivered, active, present, sent |
| Warning (amber) | `amber-50/200/700` | pending, unpaid, partial, draft, queued, scheduled, sending, halfDay, leave, late |
| Danger (red) | `red-50/200/700` | overdue, failed, absent, withdrawn, disputed, partiallyFailed |
| Info (blue) | `blue-50/200/700` | excused, male |
| Gender (pink) | `pink-50/200/700` | female |
| Roles | brand / purple / cyan / teal | schoolAdmin, teacher, accountant, parent |
| Fallback | `surface-100/200/600` | Any unrecognized value |

#### Buttons
| Variant | Default | Hover |
|---------|---------|-------|
| Primary | `bg-brand-600 text-white shadow-sm shadow-brand-200` | `hover:bg-brand-700` |
| Secondary | `bg-white text-surface-700 border border-surface-300 shadow-sm` | `hover:bg-surface-50 hover:border-surface-400` |
| Danger | `bg-red-600 text-white shadow-sm shadow-red-200` | `hover:bg-red-700` |
| Ghost | `text-surface-600` | `hover:bg-surface-100 hover:text-surface-900` |

All: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`, `disabled:opacity-50 disabled:cursor-not-allowed`

#### Gradient Buttons (inline overrides, hardcoded)
- Fee-related: `bg-gradient-to-r from-brand-600 to-brand-500` (FeeStructures, Invoices)
- Food-related: `bg-gradient-to-r from-rose-600 to-rose-500` (FoodPresets, FoodLogs)
- Draft: `bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700`
- Delete confirm: `bg-red-600 hover:bg-red-700`

#### Dashboard Quick Links (8 cards — fully hardcoded per link)
| Link | bg | border | text | iconBg |
|------|-----|--------|------|--------|
| SMS Campaigns | `sky-50` | `sky-200` | `sky-700` | `sky-100` |
| Students | `purple-50` | `purple-200` | `purple-700` | `purple-100` |
| Fee Payments | `emerald-50` | `emerald-200` | `emerald-700` | `emerald-100` |
| Salaries | `amber-50` | `amber-200` | `amber-700` | `amber-100` |
| Attendance | `cyan-50` | `cyan-200` | `cyan-700` | `cyan-100` |
| Session Assignments | `indigo-50` | `indigo-200` | `indigo-700` | `indigo-100` |
| Staff | `rose-50` | `rose-200` | `rose-700` | `rose-100` |
| Settings | `surface-100` | `surface-200` | `surface-700` | `surface-200` |

All: `hover:bg-{color}-100 hover:border-{color}-300 hover:shadow-sm`

#### Tables (DataTable + inline)
- **Header row:** `bg-surface-50`, text `text-xs font-semibold text-surface-500 uppercase tracking-wider`
- **Data rows:** even `bg-white`, odd `bg-surface-50/50`
- **Hover (clickable):** `hover:bg-brand-50`
- **Hover (non-clickable):** `hover:bg-surface-50`
- **Cells:** `px-4 py-3 text-surface-700`

#### Toasts / Notifications
| Type | Background | Border | Text |
|------|-----------|--------|------|
| Success | `emerald-50` | `emerald-200` | `emerald-800` |
| Error | `red-50` | `red-200` | `red-800` |
| Info | `blue-50` | `blue-200` | `blue-800` |
| Warning | `amber-50` | `amber-200` | `amber-800` |

#### Login Page
- **Left panel:** `bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900`
- **Inputs:** `border-surface-300`, focus → `ring-2 ring-brand-500/20 border-brand-500`

#### Modal
- **Backdrop:** `bg-surface-900/50 backdrop-blur-sm`
- **Panel:** `bg-white rounded-xl shadow-xl border border-surface-200`

---

### 1.3 Hardcoded Hex Colors (not from Tailwind, mostly print CSS)

| Hex | Context |
|-----|---------|
| `#1a1510` | Print body color (printReportCard.ts, StudentDetail.tsx) |
| `#a9320b` | Print headers, table borders (printReportCard.ts) |
| `#7a654d` | Print secondary text (printReportCard.ts, StudentDetail.tsx) |
| `#0b3d2e` | StudentResults/ReportCards print headers |
| `#dc2626`, `#059669` | Inline balance conditional colors (Invoices.tsx) |
| `#6b7280` | Fallback bar chart color (ReportCards.tsx) |

---

### 1.4 Typography

| Attribute | Value | Source |
|-----------|-------|--------|
| **Font families (sans)** | `Inter`, `system-ui`, `-apple-system`, `sans-serif` | tailwind.config.js |
| **Font families (mono)** | `JetBrains Mono`, `IBM Plex Mono`, `monospace` | tailwind.config.js |
| **Google Fonts loaded** | Inter (400, 500, 600, 700) + JetBrains Mono (400, 500) | index.css |
| **Body default** | `font-sans antialiased` | index.css |
| **Tabular numbers** | `.tabular` class → `font-mono tabular-nums` | index.css |

**Font weights in use (Tailwind):**
| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Rare — Sidebar group labels (normal-case override) |
| 500 | `font-medium` | Most common — labels, form fields, badges, nav items |
| 600 | `font-semibold` | Subheadings, table headers, button text |
| 700 | `font-bold` | Page titles, stat values, emphasis |

**Notable font sizes:**
| Size | Class | Where |
|------|-------|-------|
| `text-2xl` | Page titles, stat values | Headers, metric cards |
| `text-sm` | Default body, table cells | Most content |
| `text-xs` | Help text, badges, labels | Supporting text |
| `text-[10px]` | Compact badges, metadata | Sidebar subtitle, tiny labels |
| `text-[9px]` | Very small counters | Dashboard grade count dots |

**Print CSS font families (inconsistent across pages):**
- `'Segoe UI', 'Inter', Arial, sans-serif` (printReportCard.ts)
- `'Inter', sans-serif` (StudentDetail.tsx, LeaveNotes.tsx)
- `'Helvetica Neue', Arial, sans-serif` (StudentResults.tsx, ReportCards.tsx)

---

### 1.5 Border-Radius Values

| Value | Tailwind Class | Primary Usage |
|-------|---------------|---------------|
| `0.375rem` (6px) | `rounded-md` | Small buttons (sm), nav buttons, collapse toggle |
| `0.5rem` (8px) | `rounded-lg` | Standard buttons (md/lg), inputs, toasts, badges, pagination, modals |
| `0.75rem` (12px) | `rounded-xl` | Cards, panels, dropdown menus, data tables |
| `1rem` (16px) | `rounded-2xl` | Gradient stat boxes, some cards |
| `9999px` | `rounded-full` | Avatars, notification badges, status dots, pill badges |

**Hardcoded in print CSS:** `3px`, `4px`, `6px`, `8px`, `10px`, `50%` (inconsistent across 4 different print templates)

---

### 1.6 Shadow / Elevation

| Token | Value | Where |
|-------|-------|-------|
| `shadow-sm` | Small | Cards, stat boxes, primary/secondary/danger buttons, data tables |
| `shadow-lg` | Large | Toasts, dropdown hover, gradient FeeStructure buttons |
| `shadow-xl` | Extra large | Modals, dropdown menus, notifications panel, delete confirmations |
| `shadow-2xl` | 2X large | Notification dropdown only |
| `shadow-inner` | Inset | FeeStructures row, ReportCards `<kbd>` |
| `shadow-brand-200` | Colored | Primary button shadow |
| `shadow-red-200` | Colored | Danger button shadow |
| `shadow-rose-200` | Colored | Food preset create button |
| `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` | Arbitrary | Dropdown menu |
| `shadow-[0_4px_24px_rgba(0,0,0,0.06)]` | Arbitrary | MarksEntry card |

---

### 1.7 Spacing (padding/margin/gap)

| Context | Common Values |
|---------|--------------|
| Card padding | `p-4` (1rem), `p-5` (1.25rem), `p-6` (1.5rem) |
| Modal body | `px-6 py-4` |
| Table cells | `px-4 py-3` |
| Button sm/md/lg | `px-2.5 py-1.5` / `px-3.5 py-2` / `px-5 py-2.5` |
| Form inputs | `px-3.5 py-2.5` (md), `px-3 py-2` (compact forms) |
| Section gutters | `gap-4`, `space-y-4` / `space-y-6` |
| Badge/pill | `px-2 py-0.5` (standard), `px-2.5 py-1` (larger alerts) |

---

### 1.8 Icon Library

**No external icon library is imported.** All icons are:

1. **Custom SVG components** — Hardcoded SVG `<path>` data in a `SvgIcon` component (Sidebar.tsx) mapping 20 Heroicons-outline-style icon strings
2. **Inline `<svg>` elements** — Appear in 15+ files (Basics.tsx, Modal.tsx, Dropdown.tsx, Dashboard.tsx, Topbar.tsx, Login.tsx, Pagination.tsx, etc.)
3. **Unicode/emoji characters** — "✓", "✕", "ℹ", "⚠" in Toasts; "💰", "⚠️", "✅", "❌" in Notifications; "📚", "⚽", "💻", "🏠", "🍲", "👨‍🏫", "👷" in fee/staff/ledger pages

**Consistency:** No unified icon component. Sizes vary (`w-4 h-4`, `w-5 h-5`, `w-6 h-6`, `w-7 h-7`, `w-8 h-8`). Stroke widths inconsistent.

---

### 1.9 Gradients

| Gradient | Usage |
|----------|-------|
| `from-brand-500 via-accent-500 to-brand-600` | Topbar horizontal accent bar |
| `from-brand-500/30 via-accent-500/20 to-transparent` | Card top accent stripe (every card) |
| `from-brand-500 to-brand-600` | PageHeader left accent bar |
| `from-brand-600 via-brand-700 to-brand-900` | Login left panel |
| `from-X-50 to-X-100` | All 20+ gradient stat boxes |
| `from-brand-600 to-brand-500` | Fee-structure action buttons |
| `from-rose-600 to-rose-500` | Food-related create buttons |
| `from-brand-400 to-brand-600` | Student avatar circle |

---

## 2. COMPONENT INVENTORY

### 2.1 Card/Layout Patterns

| Pattern | File | Description | Color Logic |
|---------|------|-------------|-------------|
| **Card (wrapper)** | `Basics.tsx:200-207` | White bg, surface-200 border, brand+accent gradient top stripe, shadow-sm | **Hardcoded** — always same colors, no variants |
| **PageHeader** | `Basics.tsx:209-229` | gradient accent bar + title + description | **Hardcoded** — brand gradient bar, surface-900 title, surface-500 desc |
| **Modal** | `Modal.tsx` | Backdrop blur + white panel + surface-200 border | **Hardcoded** surface/brand |

### 2.2 Stat / Metric Patterns

| Pattern | Files | Visual | Color Logic |
|---------|-------|--------|-------------|
| **Gradient Stat Box** (C1) | FoodDashboard, FoodLogs, Payroll, Invoices, MealTimetable, StudentDetail | `bg-gradient-to-br from-{color}-50 to-{color}-100 rounded-2xl p-4 border-{color}-200` | **Per-box hardcoded color** assigned by stat meaning — no semantic function, colors chosen ad-hoc per screen |
| **Dashboard StatCard** (C2) | Dashboard.tsx | White card + `bg-{color}-100` icon box + `text-{color}-600` label | **Programmatic** — parses a `color` prop string; dynamic for collection rate (emerald/amber/red thresholds) |
| **Small Stat Box** (C3) | StudentDetail.tsx | `bg-{color}-50 rounded-xl p-3 border-{color}-200`, smaller than C1 | **Hardcoded** emerald/purple/blue |

**Key Issue — Stat Icon Color Assignment (C2):** The `StatCard` component parses the `color` prop string to derive an icon background (e.g., `text-brand-600` → `bg-brand-100`). The color string is **hardcoded by each caller** and has no semantic link to the data. For example, "Active Students" is `text-brand-600` while "Active Staff" is `text-purple-600` — these assignments are arbitrary and must be manually kept consistent across the dashboard.

### 2.3 Badge / Pill Patterns (9 distinct patterns)

| Pattern | File | Bg Shade | Text Shade | Color Logic |
|---------|------|----------|------------|-------------|
| **EnumBadge** — 32 statuses | `Basics.tsx:115-163` | `-50` | `-700` | **Lookup-table driven** — maps status string → color triplet |
| **Workflow Status Pipes** | `Payroll.tsx:74-84` | `-50` | `-700` | **Hardcoded** per status + colored dot + border |
| **Fee Breakdown Pills** | `FeeStructures.tsx:114-118` | `-50` | `-700` | **Hardcoded** per fee category (blue/green/purple/amber/rose) |
| **Food Log Type Pills** | `FoodLogs.tsx:357-362` | `-50` | `-700` | **Hardcoded** per type (blue/emerald/amber/red) |
| **Payment Type Pills** | `PaymentsLog.tsx:102-104` | **`-100`** | `-700` | **Hardcoded** ternary — uses `-100` bg (darker than EnumBadge) |
| **Session Type Pills** | `Payroll.tsx:413-416` | **`-100`** | `-700` | **Hardcoded** 3-way ternary (amber/indigo/purple) |
| **Food Status Pills** | `FoodDashboard.tsx:222-228` | `-50` / `-100` | `-700` / `-400` | **Hardcoded** 3-way condition |
| **Grade Pills** | `Dashboard.tsx:145-148` | `brand-50` | `brand-700` | **Hardcoded** brand only — includes nested count dot |
| **Manual "Active"/"Draft" Pills** | `FeeStructures.tsx:109` | `emerald-50` / `amber-50` | `emerald-700` / `amber-700` | **Hardcoded** ternary — bypasses EnumBadge to show custom labels |

**Key Issue:** 9 distinct pill/badge implementations with different padding (`px-2 py-0.5` vs `px-2.5 py-1`), different bg shade conventions (`-50` vs `-100`), and no shared component beyond EnumBadge. Each was built ad-hoc.

### 2.4 Alerts / Banners (Pattern D10)

**Shared pattern:** `text-sm bg-{color}-50 border border-{color}-200 rounded-xl p-4`

| Type | Color | Files |
|------|-------|-------|
| Error / Danger | `red` | ResourcePage, Login, FeeStructures delete confirm |
| Warning / Info | `amber` | FoodDashboard unused-items, FeeStructures draft hint, Payroll draft info, Reconciliation |
| Success | `emerald` | Login reset success |
| Info / Feature | `brand` / `blue` | Invoices how-it-works, STK Push panel |

### 2.5 Conditional Color Logic (threshold-based)

| Location | Condition | Good | Warning | Bad |
|----------|-----------|------|---------|-----|
| Dashboard.tsx:165 | Collection rate | >=80% → emerald-600 | >=50% → amber-600 | <50% → red-600 |
| StudentDetail.tsx:256 | Attendance rate | >=90% → emerald-600 | >=75% → amber-600 | <75% → red-600 |
| StudentDetail.tsx:262 | Avg score | >=80% → emerald-600 | >=50% → amber-600 | <50% → red-600 |
| StudentDetail.tsx:249 | Fee balance | 0 → emerald-600 | — | >0 → red-600 |
| Invoices.tsx:73 | Invoice balance | 0 → emerald-600 | — | >0 → red-600 |
| FoodDashboard.tsx:152 | Low stock count | 0 → surface-50 | — | >0 → red-50 |
| FoodDashboard.tsx:215 | Days left | >7 → surface-600 | <=7 → amber-600 | <=2 → red-600 |
| FoodPresets.tsx:106 | Stock quantity | >reorder → emerald-600 | <=reorder → amber-500 | <=0 → red-500 |

**Observation:** 8 threshold-based color-coded indicators across 5 pages, each implemented inline with hardcoded class strings. No shared `makeThresholdColor(value, good, warn, bad)` utility.

---

## 3. STATE COVERAGE

### 3.1 State Matrix by Component Type

| Interactive Element | Hover | Focus | Focus-Visible | Active (Press) | Disabled |
|---------------------|:-----:|:-----:|:-------------:|:--------------:|:--------:|
| **Primary button** | ✅ | ❌ | ✅ (global + button) | ❌ | ✅ (opacity-50) |
| **Secondary/Ghost button** | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Danger button** | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Dropdown trigger** | ✅ | ✅ (`focus:ring`) | ❌ | ✅ (`active:scale-[0.97]`) | ✅ |
| **Dropdown menu items** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sidebar nav links** | ✅ | ❌ | ✅ (global) | ❌ | ❌ |
| **Text inputs** | ❌ | ✅ (`focus:ring focus:border`) | ❌ | ❌ | ✅ (opacity-50 + dimmed bg) |
| **Checkboxes** | ❌ | ✅ (`focus:ring`) | ❌ | ❌ | ❌ |
| **Table sort headers** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Table rows** | ✅ (brand-50 / surface-50) | ❌ | ❌ | ❌ | ❌ |
| **Pagination buttons** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Breadcrumb links** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Dashboard quick links** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Notification bell items** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Toast close button** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Modal close button** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Filter toggle buttons** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Attendance status cards** | ✅ | ❌ | ❌ | ❌ | ❌ |

### 3.2 Key Gaps

1. **No `active:` (press) state on any button variant** — users get no visual feedback on click/mousedown
2. **No `focus:` ring on most interactive elements** — keyboard navigation (Tab through links, table rows, pagination, sidebar) gives no visual indicator except the global focus-visible outline
3. **Focus-visible explicitly used in only 2 places** — the global CSS rule and the Button component (duplicate)
4. **No `disabled` state on sidebar links, table rows, pagination, checkboxes, dropdown items**
5. **Hover is the only styled interactive state** for 14 of 17 component types
6. **Dropdown is the only component with a proper complete state set** (hover, focus, active, disabled all styled)

### 3.3 Focus Management

- **Global:** `:focus-visible { outline-2 outline-offset-2 outline-brand-500 }` (index.css:17)
- **Button:** Duplicates the same focus-visible rule
- **Dropdown trigger:** Uses `focus:outline-none focus:ring-[3px] focus:ring-brand-500/20` (non-standard ring size)
- **Form inputs:** `focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`
- **Everything else:** Falls back to browser default or the global focus-visible — no component-level focus styling

---

## 4. ACCESSIBILITY

### 4.1 Key Contrast Ratios

| Element | Foreground | Background | Ratio | WCAG AA | WCAG AAA |
|---------|-----------|------------|-------|---------|----------|
| **Body text** (text-surface-900) | `#2d241b` | `#faf8f6` | **14.2:1** | ✅ Pass | ✅ Pass |
| **Sidebar active text** | `#a9320b` | `#fef3e7` | **6.29:1** | ✅ Pass | ✅ Pass (large) |
| **Sidebar inactive text** | `#7a654d` | `#ffffff` | **5.03:1** | ✅ Pass | ❌ Fail (normal) |
| **Description/hint text** (text-surface-500) | `#9a8065` | `#faf8f6` | **3.49:1** | ❌ **FAIL** (normal) | ❌ Fail |
| **Subtle/metadata text** (text-surface-400) | `#b5a38c` | `#faf8f6` | **2.17:1** | ❌ **FAIL** | ❌ Fail |
| **Placeholder text** | `#b5a38c` | `#ffffff` | **2.30:1** | ❌ **FAIL** | ❌ Fail |
| **Card border** | `#ded6cc` | `#ffffff` | **1.39:1** | ❌ **FAIL** | ❌ Fail |
| **EnumBadge fallback** | `#7a654d` | `#f0ece7` | **3.77:1** | ❌ **FAIL** (normal) | ❌ Fail |
| **"Not in timetable" pill** | `#b5a38c` | `#f0ece7` | **2.57:1** | ❌ **FAIL** | ❌ Fail |

### 4.2 Badge Contrast (all EnumBadge values)

| Badge Group | Text | Background | Ratio | AA |
|-------------|------|-----------|-------|:--:|
| Emerald (positive) | `#047857` | `#ecfdf5` | **5.79:1** | ✅ |
| Amber (warning) | `#b45309` | `#fffbeb` | **6.63:1** | ✅ |
| Red (danger) | `#b91c1c` | `#fef2f2` | **6.11:1** | ✅ |
| Blue (info) | `#1d4ed8` | `#eff6ff` | **7.36:1** | ✅ |
| Pink (female) | `#be185d` | `#fdf2f8` | **5.35:1** | ✅ |
| Purple (teacher) | `#7e22ce` | `#faf5ff` | **6.07:1** | ✅ |
| Surface-100 (support) | `#645341` | `#f0ece7` | **4.76:1** | ✅ |
| Brand-50 (schoolAdmin) | `#a9320b` | `#fef3e7` | **6.29:1** | ✅ |
| Cyan (accountant) | `#0e7490` | `#ecfeff` | **5.65:1** | ✅ |
| Teal (parent) | `#0f766e` | `#f0fdfa` | **5.50:1** | ✅ |
| Indigo (flatRate) | `#4338ca` | `#eef2ff` | **6.93:1** | ✅ |
| Orange (sessionBased) | `#c2410c` | `#fff7ed` | **5.70:1** | ✅ |
| **Fallback** | `#7a654d` | `#f0ece7` | **3.77:1** | ❌ |

### 4.3 Screen Reader & Semantic HTML

- **No `aria-*` attributes found** in any component or page file (searched globally)
- **No `<label>` elements** associated with form inputs in the canonical FormField component — labels use `<span>` with no `htmlFor`/`for` attribute
- **No `role` attributes** on any custom interactive elements
- **No `alt` text** on inline SVG icons or decorative elements
- **No skip-link** or landmark regions (`<main>`, `<nav>`, etc.)

### 4.4 Color-Only Information

- **Status dots** in Payroll workflow pills (`bg-amber-500`, `bg-blue-500`, `bg-emerald-500`) communicate state with color alone — no text fallback, no aria-label
- **"Needs Attention" dot** on Dashboard (`bg-red-500`) — purely visual indicator
- **Online status dot** on Topbar (`bg-emerald-500`) — no text equivalent
- **CompetencyDots** — performance level communicated only through filled/empty dot count (no aria-label)

---

## 5. ARCHITECTURAL OBSERVATIONS (non-blocking)

| Finding | Impact |
|---------|--------|
| **No shared color-semantic utility** — 20+ stat boxes and 8 quick-link cards each hardcode their own color family | Adding a new metric requires choosing a color manually; no guarantee of consistency |
| **9 distinct badge/pill implementations** with different padding conventions (`px-2 py-0.5` vs `px-2.5 py-1`) and bg shades (`-50` vs `-100`) | Visual inconsistency across the app |
| **Print CSS duplicated across 4 files** with different fonts, colors, and border-radius values | Report cards render differently depending on which code path generates them |
| **No icon library** — all 20+ sidebar icons are raw SVG path strings | Adding a new icon requires copying minified SVG data; inconsistent stroke widths |
| **Mixed use of emoji and SVG for icons** (emoji in fee/staff/payroll pages, SVG elsewhere) | Looks unprofessional in a corporate context |
| **Card top accent stripe** (`brand-500/30 → accent-500/20 → transparent`) applied uniformly to every card | No visual distinction between card types or severity levels |
| **`text-surface-500` used as standard description color everywhere** but fails WCAG AA at normal text sizes | 80+ instances of inaccessible secondary text across the app |
