# CBC School Management System — Project Plan

## Phase 1: Foundation (Current Phase)

### Deliverables
1. **Neon Postgres + Drizzle Setup**
   - Initialize project with Node.js + TypeScript + Express
   - Configure Drizzle ORM with Neon pooled connection
   - Implement full schema from Addendum Section D via migrations
   - Create `.env.example` with all required env vars (DB URL, JWT secret, Daraja credentials, SMS credentials)

2. **Auth & RBAC Layer**
   - `users` table seed/setup
   - JWT login + registration endpoints
   - Role-based access control middleware (`schoolAdmin`, `teacher`, `accountant`, `parent`)
   - Password hashing with bcrypt, password reset flow

3. **Student & Guardian Management**
   - CRUD for students (admission number, CBC grade/class)
   - Guardians table with FK to students
   - SMS opt-out flag on guardians

4. **Academic (CBC) Module**
   - Learning areas and strands CRUD
   - Formative and summative assessments entry
   - Report card generation (JSONB compiled results)

5. **Fees & M-Pesa Integration**
   - Fee structures per grade/term
   - Invoice generation with computed balance
   - M-Pesa Daraja STK Push initiation
   - Webhook handler with idempotency guard
   - Receipt generation

6. **Staff & Payroll**
   - Staff CRUD (flat rate and session-based)
   - Attendance tracking for staff
   - Payroll run generation (draft → approve → pay)
   - Payroll adjustments

7. **Ledger**
   - Chart of accounts
   - Journal entries with balanced trigger enforcement
   - Fee payments and payroll expenses auto-post to ledger

8. **Attendance (Students)**
   - Mark attendance by class/date
   - View attendance summaries

9. **Timetable**
   - Slot CRUD with EXCLUDE constraint validation
   - No staff overlap, no class overlap at DB level

10. **SMS Engine**
    - SMS templates CRUD
    - Campaign creation and sending
    - Automated rules (fee due, low attendance, result published)
    - SMS logs with cost tracking

11. **Error Handling & Infrastructure**
    - Centralized error handling middleware
    - Request validation (Zod or similar)
    - Logging strategy
    - Health check endpoint

## Phase 2: Multi-School Growth (Not Now)
- Control-plane `schools` table in separate Neon project
- Per-request DB resolution based on subdomain
- Super Admin dashboard
- Cross-school analytics aggregation

## Phase 3: Advanced (Future)
- Parent portal (frontend)
- Advanced reporting and analytics
- Notification preferences per user
- Bulk operations (bulk student import, fee payment posting)
