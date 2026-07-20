# CBC School Management System — Backend API Documentation

> Purpose: This document is the source of truth for the **backend** of the CBC School Management System. It is intended to be handed to a frontend code-generation agent (e.g. Claude Code) so it can (1) understand the data model and API surface, (2) recommend the best UI/UX, and (3) produce precise frontend build prompts.

---

## 1. System Overview

A multi-module school management system built around the **CBC (Competency-Based Curriculum)** used in Kenyan schools. It covers: student/guardian management, CBC academic assessment & report cards, fee billing & M-Pesa payments, staff & payroll, a double-entry ledger, attendance, timetabling, and an SMS/notification engine.

Key product facts:
- **One database per school** (Neon Postgres). There is **no multi-tenant `tenantId`** anywhere — the DB itself is the tenant boundary.
- Roles: `schoolAdmin`, `teacher`, `accountant`, `parent`.
- All money is stored and returned as `NUMERIC(10,2)` (exposed as **strings** in JSON, never floats).
- M-Pesa (Daraja) and an SMS provider are the external integrations.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ (ESM) |
| Language | TypeScript (strict, `moduleResolution: bundler`) |
| Server | Express 5 → pinned to **Express 4.21** |
| ORM | Drizzle ORM (`drizzle-orm`) |
| Database | Neon Postgres (serverless, pooled connection string) |
| Driver | `@neondatabase/serverless` (`neon()` HTTP driver) |
| Auth | JWT (`jsonwebtoken`) + bcrypt password hashing |
| Validation | Zod (`zod`) |
| Dev runner | `tsx` |

Scripts: `npm run dev` (tsx watch), `npm run build` (tsc), `npm run db:generate|db:migrate|db:seed`.

---

## 3. Architecture & Directory Structure

```
src/
  config/index.ts        # central env config (DB url, JWT, M-Pesa, SMS)
  db/index.ts            # neon() + drizzle() client
  models/schema.ts       # Drizzle schema: 26 tables + relations
  middleware/
    auth.ts              # JWT auth middleware, AuthRequest type
    rbac.ts              # requireRole(...) guard
    validation.ts        # Zod validators (login/register/etc.)
    errorHandler.ts      # central error handler (AppError)
  routes/                # 18 route modules (HTTP layer only)
  services/              # business logic: fees, mpesa, payroll, ledger, sms
  utils/auth.ts          # hash/compare password, generateToken
  index.ts               # app bootstrap, mounts /health + /api/*
```

**Module boundaries (do not cross)**
- `routes/` — parse request, call a service, return JSON only.
- `services/` — business logic & transactions.
- `models/` — Drizzle schema + types.
- `middleware/` — auth, RBAC, validation, errors.
- `config/` — single place for env/secrets.

---

## 4. Authentication & RBAC

### Flow
1. `POST /api/auth/login` → `{ email, password }` → returns `{ user, token }`.
2. Client stores JWT and sends `Authorization: Bearer <token>` on every `/api/*` request.
3. `authMiddleware` validates the JWT and attaches `req.user` (`{ id, role }`).
4. Route handlers gate access with `requireRole('schoolAdmin', ...)`.

### Roles & typical access
| Role | Can do |
|------|--------|
| `schoolAdmin` | Everything: manage users, students, staff, fees, invoices, payroll approve/pay, ledger, timetable, SMS, automated rules |
| `accountant` | Fees, invoices, payments, ledger, view payroll runs/entries, SMS, reports |
| `teacher` | Mark attendance, enter assessments, generate/publish report cards, view own classes, view students/guardians |
| `parent` | Read-only: own children's attendance, invoices/receipts, report cards |

### Endpoints
- `POST /api/auth/login` — public. Body: `{ email, password }`.
- `POST /api/auth/register` — `schoolAdmin` only. Body: `{ name, email, phone, password, role }`. New users get `mustResetPassword: true`.
- `GET /api/auth/me` — any authenticated role. Returns the current user.

> Note: there is currently **no password-reset endpoint implemented** beyond the `mustResetPassword` flag, and **no super-admin / cross-school** concept (out of scope for Phase 1).

---

## 5. Database Schema (26 tables)

All tables use `uuid` PKs defaulting to `gen_random_uuid()`. Monetary columns are `numeric(10,2)` (returned as strings). Timestamps are timezone-aware.

### Core / People
**users** — `id, name, email (unique), phone, passwordHash, role (enum), permissions (text[]), isActive, mustResetPassword, lastLoginAt, createdAt, updatedAt`

**students** — `id, admissionNumber (unique), firstName, lastName, dateOfBirth, gender, grade, class, enrollmentDate, status (enum: active|transferred|graduated|withdrawn, default active), photoUrl, createdAt, updatedAt`

**guardians** — `id, studentId (FK→students, cascade), name, phone, relationship, isPrimary, preferredLanguage (enum sw|en), smsOptOut, createdAt`. Indexed on `studentId`, `phone`.

### Academic (CBC)
**learningAreas** — `id, name, gradeLevels (text[])`

**strands** — `id, learningAreaId (FK→learningAreas, cascade), name`

**assessments** — `id, studentId (FK), learningAreaId (FK), strandId (FK→strands), term (smallint), academicYear (smallint), type (enum formative|summative), performanceLevel (smallint), score (numeric(5,2)), remarks, assessedBy (FK→users), assessedAt`. Indexed `(studentId, term, academicYear)`.

**reportCards** — `id, studentId (FK), term, academicYear, compiledResults (jsonb, not null), teacherComments, headTeacherComments, generatedAt, generatedBy (FK), publishedAt`. Unique `(studentId, term, academicYear)`.

### Fees & Payments
**feeStructures** — `id, grade, term (smallint), academicYear (smallint), items (jsonb), totalAmount (numeric(10,2))`

**feeInvoices** — `id, studentId (FK, cascade), feeStructureId (FK), term, academicYear, totalAmount, amountPaid (default 0), balance (default 0), dueDate, status (enum unpaid|partial|paid|overdue, default unpaid), lastReminderDate, createdAt`

**paybills** — `id, name, shortcode (unique), accountReferenceFormat, purpose (enum tuition|trip|event|custom), darajaConsumerKeyRef, darajaConsumerSecretRef, darajaPasskeyRef, isActive`

**mpesaTransactions** — `id, paybillId (FK), transactionId (unique), amount, phoneNumber, accountReference, transactionDate, matchedStudentId (FK), matchedInvoiceId (FK), matchStatus (enum auto-matched|unmatched|manually-matched|disputed, default unmatched), rawPayload (jsonb), createdAt`

**receipts** — `id, invoiceId (FK), mpesaTransactionId (FK→mpesaTransactions), receiptNumber (numeric(10,0), unique), amount, paymentMethod (enum mpesa|cash|bank), issuedAt, issuedBy (FK→users)`

### Staff & Payroll
**staff** — `id, name, phone, email, role (enum teacher|support), employmentType (enum flatRate|sessionBased), baseRate (numeric(10,2)), payoutRef, isActive`

**attendanceStaff** — `id, staffId (FK, cascade), date, sessionsTaught (smallint, default 0), status (enum present|absent|halfDay|leave)`

**payrollRuns** — `id, month (smallint), year (smallint), status (enum draft|approved|paid, default draft), approvedBy (FK), approvedAt, paidAt`

**payrollEntries** — `id, payrollRunId (FK, cascade), staffId (FK), baseRate, sessionsCounted (smallint), daysPresent (smallint), grossPay, netPay (both numeric(10,2))`

**payrollAdjustments** — `id, payrollEntryId (FK, cascade), reason, amount (numeric(10,2))`

### Ledger (double-entry)
**ledgerAccounts** — `id, code (unique), name, type (enum asset|liability|equity|income|expense)`

**ledgerEntries** — `id, entryDate, description, sourceType (enum feePayment|payroll|expense|smsCost|manual), sourceId, createdBy (FK), createdAt`

**ledgerLines** — `id, ledgerEntryId (FK, cascade), accountId (FK), debit (numeric(10,2), default 0), credit (numeric(10,2), default 0)`

### Attendance & Timetable
**attendanceStudent** — `id, studentId (FK, cascade), date, status (enum present|absent|late|excused), markedBy (FK→users)`

**timetableSlots** — `id, grade, class, dayOfWeek (smallint), startTime, endTime, learningAreaId (FK→learningAreas), staffId (FK→staff), room`. DB enforces `EXCLUDE USING gist` so no staff/class overlap.

### SMS / Notifications
**smsTemplates** — `id, name, type (enum feeReminder|receipt|results|meeting|attendance|emergency|custom), content, variables (text[]), language (enum sw|en), isDefault, isActive`

**smsCampaigns** — `id, name, type (enum bulk|scheduled|automated), targetFilter (jsonb), templateId (FK), message, recipientCount (smallint), status (enum draft|scheduled|sending|sent|failed|partiallyFailed, default draft), scheduledAt, sentAt, sentBy (FK)`

**smsLogs** — `id, campaignId (FK), recipientId, recipientType (enum guardian|teacher|staff), phoneNumber, message, templateId (FK), providerMessageId, status (enum queued|sent|delivered|failed, default queued), errorMessage, sentAt, deliveredAt, cost (numeric(10,2))`

**automatedSmsRules** — `id, name, triggerType (enum feeDueSoon|feeOverdue|lowAttendance|resultPublished|emergencyClosure|custom), conditions (jsonb), templateId (FK), isActive, lastRunAt`

### Relations (summary)
- student → many guardians, assessments, reportCards, invoices, attendance; matched mpesa
- learningArea → many strands, assessments, timetableSlots
- feeStructure → many invoices; feeInvoice → many receipts, mpesaTransactions
- staff → many attendanceStaff, payrollEntries, timetableSlots
- payrollRun → many entries; payrollEntry → many adjustments
- ledgerEntry → many lines; ledgerAccount → many lines
- smsTemplate → many campaigns, logs, automatedRules

---

## 6. API Reference

Base URL: `/api`. All `/api/*` (except `/api/auth/login`) require `Authorization: Bearer <jwt>`.
Responses are `{ success: true|false, data?: ..., error?: string }`. Money fields are **strings**.

### Auth — `/api/auth`
| Method | Path | Role | Body |
|--------|------|------|------|
| POST | `/login` | public | `{ email, password }` |
| POST | `/register` | schoolAdmin | `{ name, email, phone, password, role }` |
| GET | `/me` | any | — |

### Students — `/api/students`
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | admin/teacher/accountant | query: `grade, class, status` |
| POST | `/` | schoolAdmin | create student |
| GET | `/:id` | any (parent=own child) | — |
| PUT | `/:id` | schoolAdmin | update |
| DELETE | `/:id` | schoolAdmin | cascade deletes guardians/invoices/assessments/attendance |

### Guardians — `/api/guardians`
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | admin/teacher/accountant | — |
| POST | `/` | schoolAdmin | `{ studentId, name, phone, relationship, isPrimary, preferredLanguage, smsOptOut }` |
| GET | `/phone/:phone` | admin/teacher/accountant | lookup by phone (M-Pesa matching) |

### Academic (CBC) — `/api/academic`, `/api/strands`, `/api/assessments`, `/api/report-cards`
| Method | Path | Role |
|--------|------|------|
| GET/POST/PUT/DELETE | `/api/academic` (learning areas) | admin for writes |
| GET `/learning-area/:learningAreaId`, POST/PUT/DELETE | `/api/strands` | admin for writes |
| POST `/api/assessments`, GET `/student/:studentId` | teacher (write), others read |
| POST `/generate`, PATCH `/:id/publish`, GET `/student/:studentId` | `/api/report-cards` | teacher generate, admin publish |

### Fees & Invoices — `/api/fees`, `/api/invoices`
**/api/fees** (fee structures): GET `/`, POST `/`, PUT `/:id`, DELETE `/:id` (schoolAdmin).
**/api/invoices**:
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | admin/accountant | query: `studentId, status, term, academicYear, balanceFilter(pending|paid|overdue)` |
| POST | `/generate` | schoolAdmin | generate invoice from a fee structure |
| POST | `/:id/payment` | admin/accountant | record payment (cash/bank), updates balance + posts to ledger |
| GET | `/:id/receipts` | admin/accountant/parent | — |
| POST | `/mpesa/stk-push` | admin/accountant | initiate M-Pesa STK push |
| POST | `/mpesa/webhook` | **public** (no auth) | Daraja callback; idempotent via `ON CONFLICT (transaction_id) DO NOTHING` |

### Staff & Payroll — `/api/staff`, `/api/staff-attendance`, `/api/payroll`, `/api/payroll-entries`
**/api/staff**: GET `/`, POST `/`, PUT `/:id`, DELETE `/:id` (schoolAdmin; accountant can list).
**/api/staff-attendance**: POST `/` (mark), GET `/staff/:staffId` (admin/accountant; query `startDate,endDate`).
**/api/payroll**:
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | admin/accountant | query `status, month, year` |
| POST | `/` | schoolAdmin | create run `{ month, year }` |
| POST | `/:id/generate-entries` | schoolAdmin | compute entries from attendance + base rates |
| PATCH | `/:id/approve` | schoolAdmin | draft→approved |
| PATCH | `/:id/pay` | schoolAdmin | approved→paid, posts to ledger |
**/api/payroll-entries**:
| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/:runId/entries` | schoolAdmin | manual entry `{ staffId, baseRate, sessionsCounted, daysPresent }` |
| POST | `/:entryId/adjustments` | schoolAdmin | `{ reason, amount }` (recomputes netPay) |
| GET | `/:entryId/adjustments` | admin/accountant | — |
| GET | `/run/:runId` | admin/accountant | entries for a run |

### Ledger — `/api/ledger`
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | admin/accountant | query `type` (account) |
| POST `/` | schoolAdmin | create ledger account `{ code, name, type }` |
| PUT `/:id`, DELETE `/:id` | schoolAdmin | account CRUD |
| POST | `/journal` | admin/accountant | post journal entry with lines (debit/credit) |
| GET | `/trial-balance` | admin/accountant | trial balance |

Balance is enforced by a **deferred DB trigger** (not app logic).

### Attendance (students) — `/api/attendance`
| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/` | admin/teacher | mark `{ studentId, date, status }` |
| GET | `/student/:studentId` | admin/teacher/parent | query `startDate,endDate` |

### Timetable — `/api/timetable`
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | admin/teacher/accountant | — |
| POST | `/` | schoolAdmin | `{ grade, class, dayOfWeek, startTime, endTime, learningAreaId, staffId, room }` |
| DELETE | `/:id` | schoolAdmin | — |

### SMS — `/api/sms`, `/api/sms-logs`, `/api/automated-rules`
**/api/sms**: GET `/` (query `status,type`), POST `/` (create campaign), PATCH `/:id/send`, POST `/send`.
**/api/sms-logs**: GET `/` (query `campaignId,status`), POST `/`.
**/api/automated-rules**: GET `/`, POST `/`, PATCH `/:id` (schoolAdmin).

### Health
`GET /health` → `{ status: 'ok', timestamp }` (no auth, no DB).

---

## 7. Business Logic & Key Flows

- **Invoice generation**: from a `feeStructures` row (grade/term/year + items + total) → `feeInvoices` with `balance = totalAmount`.
- **Payment**: `POST /invoices/:id/payment` reduces `amountPaid`, recomputes `balance`, sets `status` (unpaid/partial/paid), issues a `receipts` row, and auto-posts a ledger entry (income + receivable).
- **M-Pesa**: STK push initiates Daraja; the public `/mpesa/webhook` receives the callback, inserts `mpesaTransactions` **idempotently** (`transaction_id` unique, `ON CONFLICT DO NOTHING`), then matches to a student/invoice by `accountReference` and reconciles the payment.
- **Payroll**: a run is created (draft) → entries generated from staff base rates × (sessions or days) → approved → paid; paying posts payroll expense to the ledger.
- **Ledger**: every fee payment and payroll payout auto-posts journal lines (debit/credit) keeping accounts balanced via a deferred trigger.
- **SMS**: templates + campaigns + logs; automated rules trigger on `feeDueSoon`, `feeOverdue`, `lowAttendance`, `resultPublished`, etc. Guardians have `smsOptOut`.

---

## 8. Data Integrity & Constraints (must be preserved by frontend)

1. **Per-school isolation** — one Neon DB per school; **never add `tenantId`**.
2. **Money = string** — all `numeric(10,2)` values are strings in JSON; never parseFloat for storage.
3. **`feeInvoices.balance`** is derived (`totalAmount - amountPaid`); do not let the client set it directly.
4. **M-Pesa webhook is idempotent** — safe to receive duplicates.
5. **Timetable** prevents staff/class overlap at DB level (`EXCLUDE` constraint) — surface conflicts to the user.
6. **Ledger** balance enforced by deferred trigger — frontends should read, not force, balances.
7. **Secrets** — M-Pesa keys are stored as *references* (`darajaConsumerKeyRef`), never raw values.

---

## 9. Guidance for Frontend Design

This is a **role-based multi-screen web app** (no separate mobile app required initially). Recommended structure:

- **Auth screen**: login (email + password). On `schoolAdmin`, an in-app "register user" form.
- **Shell/navigation**: role-aware sidebar. `schoolAdmin` sees everything; `accountant` sees fees/ledger/reports; `teacher` sees attendance/assessment/report-cards; `parent` sees a read-only dashboard for their children.
- **Students & Guardians**: list (filter by grade/class/status) + detail + create/edit forms. Guardian phone is important for M-Pesa matching.
- **Academic**: learning areas & strands management; assessment entry per student/term; report-card generation + publish.
- **Fees**: fee-structure setup, invoice list (with balance badges: unpaid/partial/paid/overdue), record cash/bank payment, M-Pesa STK push button, receipt view.
- **Payroll**: runs list (draft→approved→paid state machine), entries, adjustments, staff attendance input.
- **Ledger**: chart of accounts, journal entry (debit/credit lines must balance), trial balance.
- **Attendance**: student mark (present/absent/late/excused) + staff attendance; date-range views.
- **Timetable**: weekly grid per grade/class; show overlap conflicts.
- **SMS**: templates, campaigns (bulk/scheduled/automated), logs with delivery status; automated-rule toggles.
- **Dashboards** per role: e.g. accountant → outstanding fees & trial balance; teacher → today's classes + pending assessments; parent → child balances, attendance, latest report card.

**Data shapes the frontend must expect** (examples):
- Invoice: `{ id, studentId, term, academicYear, totalAmount: "25000.00", amountPaid: "10000.00", balance: "15000.00", status: "partial", dueDate }`
- User: `{ id, name, email, role }`
- Auth login response: `{ success, data: { user, token } }`

> When generating the frontend, treat **all monetary values as strings**, enforce **role-based route guards** mirroring `requireRole`, and reflect the **invoice/payroll/ledger state machines** in the UI.

---

## 10. Known Environment Caveats (for local dev)

- The app uses the Neon **HTTP driver** (`neon()`), which relies on Node's global `fetch`. Some sandboxed/local environments block Node `fetch` egress (while `curl` works) — this is an infra limitation, not a code bug; deployments on Vercel/Render/Railway connect normally.
- Neon free tier uses scale-to-zero; first DB call after idle may take ~300–500ms.
- `npm run db:seed` requires a live Neon connection.
