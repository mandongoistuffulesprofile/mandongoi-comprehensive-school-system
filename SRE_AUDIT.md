# Site Reliability Engineering Audit — Mandongoi Comprehensive School System

**Date:** 2026-07-20
**Auditor:** SRE Review
**System:** Node/Express/Drizzle/PostgreSQL school management system with M-Pesa integration

---

## 1. ARCHITECTURE & DESIGN

**Readiness: CONDITIONAL**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Single points of failure | ⚠️ Single Express process — no clustering, no HA. DB is single PostgreSQL instance. | `src/index.ts` runs one process on one port |
| Failure domain isolation | ❌ No circuit breakers. No bulkheads between fee processing, SMS, and ledger. A runaway SMS campaign could starve the event loop. | No `async-bull` or queue system — everything runs in-process |
| Statelessness | ✅ Backend is stateless (sessions use JWT, no local state). Frontend is fully static. | No `req.session`, JWT-based auth |
| Graceful degradation | ❌ M-Pesa webhook failure → payment is rolled back (good). But ledger auto-post failure is caught and silently logged — no degradation path defined. | `fees.ts:175-183` try/catch with no compensating action |
| Resource limits | ❌ No CPU/memory limits defined. No Node `--max-old-space-size` in start command. | `package.json` scripts have no memory flags |
| Backpressure | ❌ No message queue. Express JSON body limit is set (1mb) but no connection throttling beyond rate limiter. | `express.json({ limit: '1mb' })` |

**Gaps:**
- P0: Ledger auto-post failure has no compensating action (discovered in Power of 10 audit but not yet fixed — post is now inside the webhook transaction but manual payment path still swallows errors)
- P1: Single-process architecture — if the process dies, all background schedulers (SMS, payment reminders, overdue checkers) die with it. No supervisor process (PM2, systemd) in the Dockerfile.
- P2: No circuit breaker for external dependencies (M-Pesa API, Advanta SMS API) — if either is down, requests hang until timeout.

**Remediation:**
1. Add PM2 or `--max-old-space-size` to start command in Dockerfile and render.yaml (P1, 1 day)
2. Create a dead-letter queue table for failed ledger posts + admin review screen (P0, 2 days)
3. Add `Promise.race` with timeout wrapper for M-Pesa/SMS API calls (P2, 1 day)

---

## 2. DEPLOYMENT & RELEASE

**Readiness: CONDITIONAL**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| CI/CD pipeline | ❌ No CI/CD configured. `render.yaml` exists but only defines the service — no automated pipeline with test gates. | No `.github/workflows/` or build scripts |
| Rollback capability | ❌ Render supports manual rollback to previous deploy, but no automated rollback trigger on health check failure. | No `rollbackOnHealthCheckFailure` in render.yaml |
| DB schema changes | ⚠️ Custom `migrate.ts` runs all `.sql` files unconditionally. No `down` migrations for rollback. | `migrate.ts` has no tracking table — re-runs would attempt to re-apply all migrations |
| Feature flags | ❌ No feature flag system. Code is either deployed or not. | — |
| Artifact immutability | ⚠️ `npm install && npm run build` runs at deploy time — not pre-built in CI. Render builds the image each time. | `render.yaml` buildCommand |
| Health checks | ✅ `GET /health` endpoint exists. Render uses it. But no staged rollout. | `healthCheckPath: /health` |

**Gaps:**
- P1: No pre-deployment test gate — broken code can be deployed if `tsc --noEmit` passes (but tests could still fail)
- P1: Custom migration runner has no "already applied" tracking. If the deploy re-runs, it will attempt to create tables that already exist and crash
- P2: No staging environment — deployment goes directly from PR to production

**Remediation:**
1. Add a `__drizzle_migrations` tracking table to `migrate.ts` — only apply unapplied migrations (P1, 1 day)
2. Add a simple GitHub Actions workflow: `tsc --noEmit` → `vitest run` → deploy to Render (P1, 1 day)
3. Set `NODE_OPTIONS="--max-old-space-size=512"` in render.yaml (P2, 30 min)

---

## 3. OBSERVABILITY & MONITORING

**Readiness: CONDITIONAL**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| RED metrics | ❌ No Rate/Errors/Duration metrics collected. No Prometheus, no custom metrics. | No metrics endpoint or instrumentation |
| USE metrics | ❌ No infrastructure metrics (CPU, memory, DB connections). Render provides basic graphs but no alerting. | No Datadog/Grafana/CloudWatch |
| Distributed tracing | ❌ No tracing at all. No Sentry performance tracing configured (Sentry SDK installed but `tracesSampleRate: 0.1` is low and has no spans). | `index.ts` Sentry config |
| Structured logging | ✅ Winston with JSON format in production, correlation IDs per request. | `logger.ts`, `crypto.randomUUID()` per request |
| Alerting | ⚠️ Sentry captures errors but has no alert rules configured. No PagerDuty/Opsgenie. | Sentry DSN set but no alerting configured |
| Dashboards | ❌ No dashboards exist. No Grafana, no business metrics. | — |
| Log retention | ⚠️ Winston file rotation at 10MB x 5 files = 50MB max. No external log shipping. | `logger.ts` |

**Gaps:**
- P1: No alerting on critical failures (ledger post failure, M-Pesa webhook errors, SMS send failures). If the system silently loses money, you won't know until reconciliation.
- P2: No business metrics (payments processed today, invoices created, SMS sent — these are the metrics the school head actually cares about)
- P2: Sentry `tracesSampleRate: 0.1` captures only 10% of requests — fine for error monitoring but too low for performance troubleshooting

**Remediation:**
1. Add Sentry alert rules for: `MpesaWebhookError`, `LedgerPostFailed`, `UnhandledRejection` (P1, 2 hours in Sentry UI)
2. Create a `/api/admin/metrics` endpoint exposing basic business counters (payments today, pending matches, ledger balance) (P2, 1 day)
3. Bump `tracesSampleRate` to `0.5` in development, `0.1` in production (P2, 5 min)

---

## 4. RELIABILITY & RESILIENCE

**Readiness: NOT READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SLOs/SLIs | ❌ No SLOs defined. No error budgets. | — |
| Chaos testing | ❌ No failure injection testing performed. | — |
| Retry policies | ❌ No retry with exponential backoff for external API calls (M-Pesa STK Push, Advanta SMS). Single attempt, fail. | `services/mpesa.ts`, `services/sms-provider.ts` |
| Timeouts | ⚠️ DB connection timeout is set (10s). No HTTP timeout for M-Pesa/SMS API calls. | `db/index.ts` has `connectionTimeoutMillis: 10000` |
| Autoscaling | ❌ Render free tier has no autoscaling. Single instance. | `render.yaml` plan: free |
| Data durability | ⚠️ PostgreSQL provides ACID, but no backup/restore procedure is documented or tested. | No `pg_dump` script or backup schedule |

**Gaps:**
- P1: No retry logic for external API calls. If Safaricom's STK Push endpoint returns a 503 (which happens), the parent sees "payment failed" even though it might have worked. A retry with backoff would catch transient failures.
- P1: No backup strategy. The entire school's financial data lives in one PostgreSQL instance with no backup schedule.
- P2: Single-instance deployment — zero redundancy. Render's free tier is sufficient for launch but has no SLA.

**Remediation:**
1. Add retry with exponential backoff to `initiateStkPush` and `sendSmsMessages` (P1, 1 day)
2. Set up weekly `pg_dump` backup to cloud storage (Render provides this in paid tier — or use a cron job) (P1, 2 hours)
3. Document backup restore procedure (P2, 1 hour)

---

## 5. SECURITY & COMPLIANCE

**Readiness: CONDITIONAL**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Secrets management | ⚠️ `.env` is in `.gitignore` — good. But no secrets rotation policy. Render supports `generateValue` for JWT_SECRET. | `render.yaml` has `generateValue: true` |
| Input validation | ✅ Zod-like runtime validation on critical paths. `assertFinite`/`assertPositive` guards on all money operations. | Added in Power of 10 fixes |
| Auth | ✅ JWT + role-based access control on all routes. Parent-scoped access for own students. | `auth.ts`, `rbac.ts` |
| Dependency scanning | ❌ No `npm audit` in CI. No SBOM maintained. | — |
| Encryption at rest | ✅ PostgreSQL (Render provides encryption at rest). In-transit: Helmet + HTTPS. | — |
| Encryption in transit | ✅ Helmet headers set. Trust proxy configured. | `src/index.ts` |
| Audit logging | ✅ `auditLogs` table tracks all sensitive operations (invoice creation, payments, leave notes). | `services/audit.ts` |
| Compliance | ❌ No compliance mapping. Not GDPR/SOC2 mapped — acceptable for a Kenyan school system at this stage. | — |

**Gaps:**
- P2: No dependency vulnerability scanning. A `npm audit` could catch critical CVEs in the 50+ npm dependencies.
- P2: No rate limiting on auth endpoints beyond the 10 req/min global limit — brute-force login protection is minimal.
- P2: M-Pesa webhook HMAC verification is implemented but disabled in sandbox (by design). Must be verified working before production flip.

**Remediation:**
1. Add `npm audit` to the CI pipeline (P2, 30 min)
2. Add login attempt tracking (lockout after 5 failed attempts per IP) (P2, 1 day)
3. Flip `MPESA_ENVIRONMENT=production` and verify HMAC verification works with a test callback (P1, before go-live)

---

## 6. PERFORMANCE & SCALABILITY

**Readiness: NOT READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Load testing | ❌ No load testing performed. Unknown how the system behaves under 100+ concurrent requests. | No k6/artillery scripts |
| Latency SLAs | ❌ No latency measurements collected. No p50/p95/p99 data. | — |
| DB query optimization | ⚠️ No index review performed. Some queries load all rows (`listAllPayments` was fixed to limit 200). But `listInvoices` has proper pagination. | `fees.ts` |
| Caching | ❌ No caching at any layer. Every page load hits the database. | No Redis, no in-memory cache |
| Connection pooling | ✅ pg Pool configured with max 5 (dev) / 10 (prod). Connection timeout 10s. | `db/index.ts` |

**Gaps:**
- P1: No load testing before launch. The system might work fine with 200 students but choke at 500 concurrent parents checking results on results day.
- P1: No caching. The dashboard (which aggregates stats across 6+ tables) rebuilds on every page load — this will be the first bottleneck.
- P2: No CDN for static assets. Vercel provides one by default for the frontend, but uploaded files (signatures, photos) are served from the Express backend.

**Remediation:**
1. Run a simple load test with `k6` or `autocannon`: 50 concurrent users hitting `/api/dashboard` and `/api/fees/invoices` (P1, 1 day)
2. Add a simple in-memory cache with TTL for the dashboard endpoint (P1, 1 day)
3. Add database indexes on common query patterns: `fee_invoices(student_id, status)`, `attendance_student(student_id, date)` (P2, 1 day)

---

## 7. OPERATIONAL EXCELLENCE

**Readiness: NOT READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Runbooks | ❌ No runbooks exist. No documented procedure for common incidents (M-Pesa webhook failure, DB down, SMS provider failure). | — |
| On-call | ❌ No on-call rotation. The developer is the only responder. | — |
| Disaster recovery | ❌ No DR plan. If the DB is corrupted, there's no documented restore procedure. | — |
| Config management | ✅ Environment variables via `.env`. Render dashboard for production env vars. No config drift between environments (both use same schema/code). | `render.yaml` |
| Documentation | ⚠️ `BACKEND_API_DOC.md` exists. `AGENTS.md` for AI context. Architecture notes in `STATUS.md`. No formal architecture diagram. | Partial |
| Post-mortem process | ❌ No post-mortem culture established. | — |

**Gaps:**
- P1: No incident response plan. If the system goes down on a fee payment deadline day, there's no documented procedure for who to call or what to do.
- P2: No runbooks. If an alert fires at 2 AM, the responder has to reverse-engineer the code to understand what to check.
- P2: No architectural diagram. A new developer would need to read all 40+ route files to understand the system.

**Remediation:**
1. Create a one-page incident response document: who to call, where to check logs, how to restart, who to escalate to (P1, 1 day)
2. Create runbooks for the top 3 failure scenarios: M-Pesa webhook down, DB connection lost, SMS provider not sending (P2, 2 days)
3. Generate a simple architecture diagram using Mermaid in the README (P2, 1 hour)

---

## 8. DATA MANAGEMENT

**Readiness: NOT READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Backup/restore | ❌ No backup schedule. No tested restore procedure. | — |
| Data retention | ❌ No retention policy defined. Audit logs, SMS logs, and food logs grow indefinitely. | No cleanup job |
| Schema evolution | ⚠️ Drizzle ORM provides schema generation. Migration files are hand-written. No `down` migrations. | `drizzle/` migrations are forward-only |
| Data quality | ❌ No anomaly detection. If a payment is applied to the wrong invoice, there's no automated check. | — |
| Right-to-deletion | ❌ No procedure for deleting a student's data (GDPR-like request). Currently possible via admin panel but no documented process. | — |

**Gaps:**
- P1: No backup strategy. This is the highest-risk operational gap. If the database is lost, all fee records, invoices, payment history, and student data are gone.
- P2: No data retention cleanup. SMS logs will accumulate indefinitely on Render's free 1 GB database.
- P2: No data quality monitoring. If `matchInvoice` incorrectly matches a payment, it could go unnoticed until end-of-term reconciliation.

**Remediation:**
1. Set up weekly automated `pg_dump` backup (Render paid tier) or manual backup script (P1, 2 hours)
2. Add a cleanup job that archives/deletes logs older than 2 years (P2, 1 day)
3. Add a daily reconciliation report: sum of receipts issued vs sum of ledger entries for the day (P2, 2 days)

---

## 9. COST & EFFICIENCY

**Readiness: READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Resource right-sizing | ✅ Render free tier is appropriate for launch. No over-provisioning. | — |
| Cost attribution | ✅ Single application, single team. No complex cost allocation needed. | — |
| Spot instances | N/A | Not applicable at this scale |
| Data transfer costs | ✅ Vercel provides 100 GB/month free. Backend API responses are small JSON payloads. | — |

**Gaps:** None at current scale. If the school grows to 5,000+ students, the free tier database (1 GB) will run out of space and Render will require a $7/month upgrade.

**Remediation:** Monitor database size. When it exceeds 800 MB, upgrade to Render's $7/month PostgreSQL plan.

---

## 10. TESTING & QUALITY

**Readiness: NOT READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Unit test coverage | ❌ ~13 tests across 7 files, covering ~10% of the codebase. Critical paths (matchInvoice, applyMpesaWebhook) have zero test coverage. | `tests/` — 366 total lines of tests vs ~6,000 lines of source code |
| Integration tests | ⚠️ 1 integration test for webhook idempotency exists (95 lines). Only covers the `ON CONFLICT DO NOTHING` path. | `tests/integration/webhook-idempotency.test.ts` |
| Contract tests | ❌ No contract tests. Backend API changes could break the frontend silently. | — |
| E2E tests | ❌ No end-to-end tests. No Playwright/Cypress tests for the frontend. | Frontend has no test framework at all |
| Performance regression | ❌ No performance tests in CI. | — |
| **Test result** | **3 of 7 test files FAIL** — tests were written against older code and haven't been updated | `vitest run`: 3 failed, 4 passed |

**Gaps:**
- P0: 3 tests are failing. Tests that were valid before our changes (Power of 10 fixes, timetable removal) now fail because mocks don't match the updated code. This means no one has run `npm test` recently.
- P1: Zero test coverage on the most critical code paths: `matchInvoice`, `applyMpesaWebhook`, `applyPaymentToInvoice`, `postJournalEntry`, `calculateExtraDutyPayments`.
- P1: Frontend has zero tests — no test framework installed, no test files.

**Remediation:**
1. Fix the 3 failing tests to match the updated codebase (P0, 1 day)
2. Add unit tests for `matchInvoice` and `applyMpesaWebhook` — these are the two functions that handle money (P1, 2 days)
3. Add Vitest to the frontend and create at least one smoke test (P2, 1 day)
4. Run `npm test` in CI pipeline (P1, already covered by CI remediation above)

---

## Overall Verdict

# GO WITH CONDITIONS

The system has a solid foundation (good architecture patterns, security basics, structured logging, audit trail, runtime validation on money paths) but is missing critical operational infrastructure around testing, backup, monitoring, and incident response.

---

## Top 3 Risks That Could Cause Production Incidents

| Rank | Risk | Scenario | Blast Radius |
|------|------|----------|-------------|
| **1** | **No backup strategy** | Database corruption or accidental deletion | Complete loss of all fee records, invoices, payment history, student data, and payroll data |
| **2** | **Untested money-handling code** | `matchInvoice` or `applyMpesaWebhook` has a bug in production that wasn't caught because there are no tests | Wrong invoice credited, payment lost, reconciliation nightmare |
| **3** | **Single-process architecture with silent failures** | Background scheduler crashes → SMS reminders, payment processing, and overdue checks stop. No one notices until parents complain about missing SMS or late fees go uncollected | Revenue loss, parent dissatisfaction, missed deadlines |

---

## 30/60/90-Day Improvement Roadmap

### First 30 Days — Launch Blockers (P0/P1)

| Week | Task | Impact |
|------|------|--------|
| 1 | Fix 3 failing tests | Restores test suite integrity |
| 1 | Add `__drizzle_migrations` tracking table to migrate.ts | Prevents deployment failures on migration re-run |
| 2 | Add backup cron job (`pg_dump` weekly) | Data durability — critical |
| 2 | Add retry with exponential backoff to M-Pesa STK Push | Prevents transient payment failures |
| 3 | Create incident response one-pager | Team knows what to do when things break |
| 3 | Run load test (k6) against top 5 API endpoints | Identifies bottlenecks before launch |
| 4 | Add Sentry alert rules for critical errors | No more flying blind in production |

### 30–60 Days — Hardening (P1/P2)

| Task | Impact |
|------|--------|
| Add unit tests for `matchInvoice`, `applyMpesaWebhook` | Covers money-handling paths |
| Add GitHub Actions CI (tsc → test → deploy) | Prevents broken deployments |
| Add in-memory cache for dashboard endpoint | Improves load time by 5-10x |
| Create runbooks for top 3 failure scenarios | Reduces MTTR from hours to minutes |
| Add indexes on fee_invoices and attendance_student | Prevents slow queries at scale |

### 60–90 Days — Operational Maturity (P2)

| Task | Impact |
|------|--------|
| Add business metrics dashboard (payments, SMS, invoices) | School head can see live data |
| Set up staging environment | Safe testing before production deploys |
| Add data retention cleanup job | Prevents DB from filling up |
| Add login rate limiting (account lockout) | Security hardening |
| Document architecture with diagrams | Faster onboarding for new developers |
