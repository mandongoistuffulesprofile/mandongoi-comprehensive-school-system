# TODO — CBC School Management System

## Phase 1: Foundation

### Setup & Infrastructure
- [ ] Initialize Node.js + TypeScript + Express project structure
- [ ] Install and configure Drizzle ORM with Neon pooled connection
- [ ] Create central `config/` module for env vars (DB URL, JWT, Daraja, SMS)
- [ ] Implement full database schema from Addendum Section D via Drizzle migrations
- [ ] Create `.env.example` with all required variables
- [ ] Set up error handling middleware and request validation

### Auth & RBAC
- [ ] Implement password hashing and JWT token generation
- [ ] Create `users` table seed data (admin, sample teacher, accountant, parent)
- [ ] Build login endpoint with JWT issuance
- [ ] Build registration endpoint (admin only)
- [ ] Implement RBAC middleware (`schoolAdmin`, `teacher`, `accountant`, `parent`)
- [ ] Build password reset flow
- [ ] Build "get current user" endpoint

### Student & Guardian Management
- [ ] CRUD endpoints for students (with admission number uniqueness)
- [ ] CRUD endpoints for guardians (FK to students, cascade delete)
- [ ] Bulk guardian creation for a student
- [ ] Guardian lookup by phone (for SMS two-way replies)

### Academic (CBC)
- [ ] CRUD for learning areas (with grade_levels array)
- [ ] CRUD for strands (FK to learning areas)
- [ ] CRUD for assessments (formative/summative, term/year scoped)
- [ ] Assessment entry with performance level and score validation
- [ ] Report card generation (JSONB compiled results per term/year)
- [ ] Report card publish endpoint (sets `published_at`)

### Fees & M-Pesa
- [ ] CRUD for fee structures (per grade/term/year, JSONB items)
- [ ] Invoice generation from fee structure (computed balance)
- [ ] Invoice list with balance filter (pending fees)
- [ ] M-Pesa Daraja STK Push initiation endpoint
- [ ] M-Pesa webhook handler with idempotency (`ON CONFLICT DO NOTHING`)
- [ ] Auto-match M-Pesa transactions to students/invoices
- [ ] Receipt generation with sequential receipt numbers
- [ ] Manual payment entry (cash/bank) for non-M-Pesa payments

### Staff & Payroll
- [ ] CRUD for staff (teacher/support, flatRate/sessionBased)
- [ ] Staff attendance marking (present/absent/halfDay/leave)
- [ ] Payroll run creation (draft status)
- [ ] Payroll entry generation (gross/net calculation)
- [ ] Payroll run approval (schoolAdmin only)
- [ ] Payroll run payment marking
- [ ] Payroll adjustments (reasons + amounts)

### Ledger
- [ ] Chart of accounts CRUD (5 account types)
- [ ] Journal entry creation with balanced enforcement
- [ ] Auto-post fee payments to ledger
- [ ] Auto-post payroll expenses to ledger
- [ ] Ledger trial balance endpoint

### Attendance (Students)
- [ ] Mark attendance by class/date (present/absent/late/excused)
- [ ] Attendance summary by student/term
- [ ] Attendance report for parent portal

### Timetable
- [ ] CRUD for timetable slots
- [ ] Overlap prevention via EXCLUDE constraints (handled by DB, but validate in app)
- [ ] Timetable view by class and by staff

### SMS Engine
- [ ] CRUD for SMS templates (fee reminder, receipt, results, etc.)
- [ ] SMS campaign creation (bulk/scheduled/automated)
- [ ] SMS sending with provider adapter interface
- [ ] SMS logs with status tracking
- [ ] Automated SMS rules (fee due soon, fee overdue, low attendance, result published)
- [ ] SMS cost tracking per campaign

### Testing & Deployment
- [ ] Unit tests for services (especially ledger balance, payroll calculations)
- [ ] Integration tests for webhook idempotency
- [ ] Deploy to staging (Render/Railway/Vercel)
- [ ] Verify scale-to-zero behavior
- [ ] Production deployment with Neon `main` branch
