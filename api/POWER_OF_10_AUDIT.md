# Power of 10 Audit — CBC School Management System

**Audited:** 77 TypeScript source files (40 routes, 15 services, 5 middleware, 17 others)
**Date:** 2026-07-20
**Stack:** Node/Express/Drizzle ORM/PostgreSQL — multi-tenant school SaaS with M-Pesa financial integration

---

## Rule 1 — Simple Control Flow

**Score: 7/10** — Most handlers are linear. No `goto`, no labeled breaks, no recursion.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/sms-scheduler.ts` | 42–160 | `switch` with 8+ cases including nested DB queries inside each branch. The `feeOverdue` and `lowAttendance` branches each have nested `if/for` exceeding 20 lines. | Medium | Extract each trigger type into its own function |
| `services/fees.ts` | 249–289 | `matchInvoice` has 4 fallback strategies chained with `if/else` — effectively a manual pattern-match pipeline. Cyclomatic complexity ~7. | Low | Extract each matcher strategy into named functions, return early |
| `services/timetable-engine.ts` | (306 lines) | Not fully audited due to size, but slot-allocation algorithms tend to have nested loops — flag for review | Medium | Break into smaller passes |

**Top Finding:** `sms-scheduler.ts:evaluateRule` is one function with 8+ branches, each containing DB queries and template rendering — hard to trace control flow, easy to miss a bug in one branch.

---

## Rule 2 — Bounded Loops

**Score: 6/10** — No unbounded `while(true)`, but pagination and retry logic have gaps.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/fees.ts` | 98–121 | `for` loop over `activeStudents` — unbounded. If 10,000 students match the filter, this inserts 10k invoices in one request. No batch-size cap. | **High** | Add `BATCH_SIZE = 50` chunking with `Promise.all` |
| `services/fees.ts` | 128–136 | `nextReceiptNumber` — `SELECT nextval` is safe from PostgreSQL side, but the `CREATE SEQUENCE IF NOT EXISTS` on every cold start is a race (two concurrent first calls both attempt to create). | Medium | Move sequence creation to migration |
| `services/sms-scheduler.ts` | 24–30 | `for (const rule of rules)` — unbounded if admin creates 200 rules. Each rule trigger scans the entire student/guardian table. | Medium | Add a cap on active rules or batch per iteration |
| `index.ts` | 156–169 | `setInterval` schedulers — no limit iterations, but this is intentional (long-lived process). Acceptable. | Low | N/A (by design) |

**Top Finding:** `generateBulkInvoices` (fees.ts:98) iterates over every matching student in one synchronous loop — if a grade has 5,000 students, this blows the event loop and risks a DB timeout.

---

## Rule 3 — No Unbounded Resource Growth

**Score: 8/10** — Good discipline overall. No unbounded in-memory caches.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/ledger.ts` | 65–76 | `trialBalance` loads ALL ledger lines into memory with `COALESCE(SUM, 0)` — aggregate happens in SQL, but result set grows with accounts. Acceptable for school scale. | Low | N/A |
| `services/fees.ts` | 126 | `let seqInitialized = false` — module-level mutable boolean, set once per process. Low risk but unnecessary global state. | Low | Remove, use `CREATE SEQUENCE IF NOT EXISTS` every call (already safe) or track in DB |
| `services/fees.ts` | 352–354 | `[...mpesa, ...manualReceipts].sort(...)` — loads ALL payments into memory for sorting. If the school has 50k receipts, this allocates two large arrays. | Medium | Paginate or sort in SQL |

**Top Finding:** Module-level `seqInitialized` flag (fees.ts:126) is low-severity but is a pattern that can lead to lifecycle bugs if the module is ever hot-reloaded or tested in isolation.

---

## Rule 4 — Function Length Ceiling

**Score: 5/10** — Several functions significantly exceed 60 lines.

**10 longest functions:**

| Rank | Function | File | Lines | Issues |
|------|----------|------|-------|--------|
| 1 | `applyMpesaWebhook` | `services/fees.ts` | 82 | Mixes DB insert, matching, notifications, nested transaction |
| 2 | `applyPaymentToInvoice` | `services/fees.ts` | 71 | Mixes invoice update, receipt creation, ledger post, food log |
| 3 | `generateBulkInvoices` | `services/fees.ts` | 62 | Loop + DB writes + error handling all in one function |
| 4 | `matchInvoice` | `services/fees.ts` | 42 | Multiple matcher strategies, each fetching from DB |
| 5 | `evaluateAndSend` | `services/sms-scheduler.ts` | 15+ | Calls `evaluateRule` which is 180 lines across all triggers |
| 6 | `evaluateRule` | `services/sms-scheduler.ts` | 180 | 8 trigger cases, each with DB queries and template logic |
| 7 | `postPayrollRunToLedger` | `services/payroll.ts` | ~40 | Iteration + ledger post |
| 8 | `generateRunEntries` | `services/payroll.ts` | ~60 | Staff categorization + attendance queries |
| 9 | `trialBalance` (SQL) | `services/ledger.ts` | 12 | Fine |
| 10 | `listInvoices` | `services/fees.ts` | 48 | Near limit |

**Top Finding:** `applyMpesaWebhook` (82 lines) and `applyPaymentToInvoice` (71 lines) both mix money processing, DB writes, ledger posting, and notifications — a "god function" pattern for the most financially critical path in the system.

---

## Rule 5 — Runtime Assertion Density

**Score: 7/10** — Zod schemas exist for some boundaries. Money paths have basic checks but miss several.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/fees.ts` | 41 | `let total = Number(structure.totalAmount)` — no check that `totalAmount` is a positive, finite number. Drizzle returns it as a string, `Number("")` = 0, `Number(null)` = 0, `Number("abc")` = NaN. | **High** | Assert `Number.isFinite(Number(structure.totalAmount)) && Number(structure.totalAmount) > 0` |
| `services/fees.ts` | 147–217 | `applyPaymentToInvoice` — no `input.amount > 0` check (that's in `recordManualPayment` but NOT in the webhook path). The M-Pesa webhook calls `applyPaymentToInvoice` directly without re-validating amount. | **High** | Move `amount > 0` assertion into `applyPaymentToInvoice` itself |
| `services/ledger.ts` | 30–63 | `postJournalEntry` — checks `debit === credit` but does NOT validate that accountIds are valid UUIDs or exist in DB. If a bad accountId is passed, the FK constraint catches it, but with a 500 error. | Medium | Add existence check or zod pre-validation |
| `services/fees.ts` | 368–448 | `applyMpesaWebhook` — no Zod validation of the webhook input. `input.amount` is typed as `number` but comes from `parseSafaricomPayload` which does `Number(body.TransAmount)` — if Safaricom sends a string, parsing silently produces NaN or 0. | **Critical** | Add Zod schema with `z.number().positive().finite()` for the webhook input |
| `services/fees.ts` | 64–123 | `generateBulkInvoices` | `total -= Number(structure.foodAmount)` — no assertion that `structure.foodAmount` is a valid number. Same NaN risk. | Medium | Add `Number.isFinite` guard before arithmetic |

**Top Finding:** The M-Pesa webhook path (`applyMpesaWebhook` → `applyPaymentToInvoice`) has NO Zod validation at the entry point. A malformed Safaricom callback (which happens in production — see their known `ResultCode` edge cases) could silently produce a 0-amount or NaN-amount payment, or worse, process a payment against the wrong invoice because `matchInvoice` returns a false positive. This is the highest-risk finding in the entire audit.

---

## Rule 6 — Smallest Possible Scope

**Score: 8/10** — Generally good. No module-level request data leakage.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/fees.ts` | 126 | `let seqInitialized = false` — module-level mutable variable | Low | Remove or use `Map<dbUrl, boolean>` if truly needed |
| `middleware/auth.ts` | 35 | `req.user = user` — attaches full user object (including `passwordHash` if selected) to the request. Later code accesses `req.user!.role` etc., but `passwordHash` is unnecessarily exposed to every downstream handler. | Medium | Either exclude `passwordHash` from the select, or use a projection type |
| `services/fees.ts` | 261 | `const invoices = await db.select().from(feeInvoices)` — loads ALL invoices into memory to find a prefix match. No LIMIT, no scope. | **High** | Replace with SQL `LIKE` or `starts_with` query |

**Top Finding:** `matchInvoice` at line 261 loads every invoice in the DB (`SELECT * FROM fee_invoices` with no WHERE clause) to do client-side prefix matching. With 10k+ invoices, this is both a performance and security issue — if the query accidentally runs in a tenant context, it leaks all data.

---

## Rule 7 — Check All Return Values / Awaits

**Score: 6/10** — Most `await` calls are awaited. Several silent fire-and-forget patterns exist.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/fees.ts` | 175–183 | Ledger auto-post failure is caught and logged, but the payment is considered successful. If ledger posting fails silently, the cash account and income account in the ledger won't match the receipt, causing a permanent reconciliation gap. | **Critical** | Either (a) make the ledger post part of the DB transaction so it rolls back the payment on failure, or (b) enqueue a dead-letter job for manual reconciliation |
| `services/fees.ts` | 108 | `await db.insert(feeInvoices).values({...})` — inside a try/catch that only increments `results.errors`. No logging of which student failed or why. | Medium | Log the error with student context |
| `services/fees.ts` | 130 | `await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS...`).catch(() => {})` — swallows ALL errors, including connection errors that might indicate the sequence wasn't created. | Medium | Log the error at least |
| `index.ts` | 140 | `pool.query("SELECT 1").catch(() => {})` — keep-alive ping error is silently swallowed. If the DB connection drops, this won't bubble up. | Low | Log the error |
| `services/fees.ts` | 199–210 | `await db.insert(foodLogs)...` — catching and logging but NOT rolling back the payment if food log fails. | Low | Acceptable (payment already recorded, food log is secondary) |
| `services/notify.ts` | 37–46 | Notification creation — `await db.insert(notifications)...` inside a loop. If one notification fails, remaining ones are not attempted. | Low | Use `Promise.allSettled` |

**Top Finding:** The ledger auto-post failure (fees.ts:175–183) is the most consequential — a payment goes through, a receipt is issued, but the ledger is never updated. This creates a permanent reconciliation discrepancy that can only be fixed manually. The try/catch silently logs it and moves on. For a fintech-adjacent system, the ledger post should be in the same DB transaction as the payment.

---

## Rule 8 — Validate All Inputs at Every Boundary

**Score: 5/10** — Internal functions often trust callers. No tenant-scope re-validation in services.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/ledger.ts` | 30–63 | `postJournalEntry` — does not validate that the accounts exist. If called with a bad `accountId`, the FK violation surfaces as a 500. Should return a 400. | Medium | Add `accountId` existence check |
| `services/fees.ts` | 147 | `applyPaymentToInvoice` — does not re-validate `input.amount > 0`. Trusts the caller. Called from `applyMpesaWebhook` which also doesn't validate. If amount is 0 or NaN, invoice gets a 0-credit payment with no error. | **Critical** | Add `input.amount > 0 && Number.isFinite(input.amount)` at the TOP of `applyPaymentToInvoice` |
| `services/fees.ts` | 368 | `applyMpesaWebhook` — no Zod validation of the outer shape. `input.accountReference` could be undefined/empty, causing `matchInvoice` to scan all records. | **Critical** | Add Zod schema: `z.object({ transactionId: z.string().min(1), amount: z.number().positive(), ... })` |
| All routes | — | No tenant-ID isolation argument. The schema has no `schoolId` column on tables, meaning the `AGENTS.md` mentions "per-school isolation model" but there is NO tenant-scope check anywhere in the code. Every query selects from ALL rows. | **Critical** | This is an architectural gap, not a per-function fix. The system relies on database-per-school, not row-level tenant isolation. If this assumption changes, every DB query would leak data across schools. |
| `middleware/rbac.ts` | 14 | `requireRole` checks only `req.user.role`. But `req.user` is attached by `authMiddleware` which queries by JWT payload. If the JWT secret is ever compromised, any user can forge tokens for any role — no additional validation. | Medium | Acceptable for current architecture but worth noting |

**Top Finding:** `applyPaymentToInvoice` trusts its caller to validate `amount > 0` and the webhook entry point has no Zod validation. A NaN amount ($0.00) from a malformed M-Pesa callback would be applied to an invoice without error, showing "paid" with zero money actually received.

---

## Rule 9 — Assert Impossibilities

**Score: 4/10** — Critical "should never happen" conditions are mostly unguarded.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/ledger.ts` | 38–39 | Debit = credit check EXISTS and throws. Good — but it's the ONLY such check. | — | — |
| `services/fees.ts` | 150–158 | Invoice update SQL uses computed balance — no post-update assertion that `balance >= 0` or that `amountPaid` didn't exceed `totalAmount` (the `GREATEST(0, ...)` on balance handles one side, but `amountPaid` could exceed total). | **High** | Assert `amountPaid <= totalAmount` after update |
| `services/fees.ts` | 388 | `onConflictDoNothing` for M-Pesa duplicate — correct pattern for idempotency. | — | — |
| `services/fees.ts` | 391–392 | Check `if (inserted.length === 0)` — handles the duplicate case correctly. Good. | — | — |
| `services/fees.ts` | 175–183 | Ledger auto-post failure — caught, logged, but no "impossible" guard halting the operation. If the ledger ever fails but the payment succeeds, there's no compensating action. | **High** | Add a `never`-scenario dead-letter queue for ledger failures |
| All services | — | No "this query returned rows from multiple schools" guard (because there is no school_id column — see Rule 8). This is an architectural invariant with no check. | **Critical** | Either add school_id + check, or document that DB-per-school is the isolation mechanism |

**Top Finding:** No function in the payment or ledger path says "this should never happen" and halts. The most dangerous silent failure: a ledger auto-post error is caught and logged, but the payment is already committed. This means Cash/Income accounts in the ledger are permanently out of sync with receipts, and no automated reconciliation catches it.

---

## Rule 10 — Side-Effect-Free Assertions + Defined Recovery

**Score: 5/10** — Assertions don't mutate state, but recovery paths are vague.

**Violations:**

| File | Line(s) | Violation | Severity | Fix |
|------|---------|-----------|----------|-----|
| `services/fees.ts` | 182–183 | `logger.error(...)` is the ONLY recovery for a ledger auto-post failure. No rollback, no dead-letter queue, no alerting. | **Critical** | Enqueue to a `failed_ledger_posts` table for admin review |
| `services/fees.ts` | 118 | `catch { results.errors++ }` — silent catch with no logging or recovery. Bulk invoice creation errors are invisible. | Medium | Log the student ID and error |
| `middleware/errorHandler.ts` | 22–23 | Generic `500` for non-`AppError` exceptions — only logs. No compensating action (e.g., alert, circuit breaker) for repeated failures. | Medium | Acceptable for Express standard, but critical paths (M-Pesa) should have additional monitoring hooks |
| `services/fees.ts` | 388 | `onConflictDoNothing` — correct idempotency for M-Pesa webhook. Recovery path is defined (return `duplicate`). | — | — |
| `services/fees.ts` | 398 | `return db.transaction(...)` — the M-Pesa webhook uses a DB transaction. If the inner logic fails, the payment is rolled back. **This is correct.** | — | — |

**Top Finding:** The ledger post failure has no recovery path beyond a log line. If the Express process crashes between the receipt INSERT and the ledger INSERT (they're in separate queries not in a transaction), the money is lost in the accounting system. The M-Pesa webhook correctly uses a transaction for the payment/invoice/notification flow, but the ledger auto-post (`autoPostFeePayment`) is called inside a try/catch OUTSIDE that transaction (fees.ts:175–183), meaning it can fail independently.

---

## Overall Scoring

| Rule | Weight | Score | Weighted |
|------|--------|-------|----------|
| 1 — Simple control flow | 7 | 7 | 4.9 |
| 2 — Bounded loops | 7 | 6 | 4.2 |
| 3 — No resource growth | 12 | 8 | 9.6 |
| 4 — Function length | 7 | 5 | 3.5 |
| 5 — Assertion density | 7 | 7 | 4.9 |
| 6 — Smallest scope | 12 | 8 | 9.6 |
| 7 — Check return values | 12 | 6 | 7.2 |
| 8 — Validate all inputs | 12 | 5 | 6.0 |
| 9 — Assert impossibilities | 12 | 4 | 4.8 |
| 10 — Side-effect-free + recovery | 12 | 5 | 6.0 |
| **Total** | **100** | | **60.7** |

**Letter Grade: D (60.7)**

---

## "Fix First" — 5 Highest-Risk Issues

| # | Issue | Rule | Blast Radius | Fix |
|---|-------|------|-------------|-----|
| 1 | **No Zod validation on M-Pesa webhook input** — NaN/0 amounts can silently post | R5, R8 | Financial corruption, reconciliation nightmare | Add `z.object({ amount: z.number().positive().finite(), ... })` at the webhook boundary |
| 2 | **Ledger auto-post is not in the payment transaction** — payment succeeds even if ledger fails | R7, R9, R10 | Permanent ledger/receipt mismatch | Move `autoPostFeePayment` INSIDE the `db.transaction` in `applyMpesaWebhook` |
| 3 | **`applyPaymentToInvoice` doesn't validate amount** — webhook caller also doesn't validate | R5, R8 | Zero-amount payments applied to invoices | Add `if (!Number.isFinite(amount) || amount <= 0) throw` at top |
| 4 | **`matchInvoice` loads ALL invoices into memory** — no LIMIT, no scope guard | R2, R6 | Performance crash + potential tenant data leak | Replace with SQL `starts_with` or `LIKE` query with LIMIT |
| 5 | **`generateBulkInvoices` unbounded loop** — 5k students = 5k sequential INSERTs | R2 | Event-loop blockage, DB timeout, partial insert with `errors++` only | Chunk into batches of 50 with `Promise.all` |

**Worst single finding severity:** **Critical** — M-Pesa webhook input validation gap (Rules 5/8) and ledger auto-post not in transaction (Rules 7/9/10).

**Files not fully audited:** `services/timetable-engine.ts` (306 lines — slot allocation algorithm), `services/sms-provider.ts` (258 lines — provider abstraction layer). These should be separately reviewed for Rule 4 (length) and Rule 2 (loop bounds).
