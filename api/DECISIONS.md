# DECISIONS — CBC School Management System

## ADR-001: Neon Postgres with Physical Isolation (Per-School DB)
- **Date:** 2026-07-10
- **Context:** Original plan used shared MongoDB with `tenantId` row-level isolation. Switch to Neon Postgres was requested.
- **Decision:** One Neon project per school. Database boundary IS the tenant boundary. No `tenantId` columns.
- **Consequences:** Stronger isolation guarantee. Simpler queries (no tenant scoping). Control-plane and multi-school routing deferred to Phase 2.
- **Source:** CBC-School-Management-Addendum-Neon-Postgres.md Section A

## ADR-002: Drizzle ORM Over Prisma
- **Date:** 2026-07-10
- **Context:** Two viable ORMs for Node + Neon. Drizzle has lighter cold-start footprint, which matters for Neon's scale-to-zero behavior.
- **Decision:** Use Drizzle ORM with `@neondatabase/serverless` or pooled connection string.
- **Consequences:** Slightly less tooling/UX than Prisma, but better serverless performance and direct SQL-like syntax.
- **Source:** CBC-School-Management-Addendum-Neon-Postgres.md Section C

## ADR-003: Neon Pooled Connection Only (No Double Pooling)
- **Date:** 2026-07-10
- **Context:** Neon free tier provides a pooled endpoint. Traditional `pg` pooling on top of an already-pooled endpoint causes issues.
- **Decision:** Use Neon's pooled connection string exclusively. Do not layer additional pooling libraries on top.
- **Consequences:** No `pg.Pool` in application code. Connection management is handled by Neon.
- **Source:** CBC-School-Management-Addendum-Neon-Postgres.md Section B

## ADR-004: Postgres Constraints Over App-Level Checks
- **Date:** 2026-07-10
- **Context:** The addendum emphasizes using Postgres-native features for data integrity.
- **Decision:** Use `EXCLUDE` constraints for timetable overlaps, `GENERATED ALWAYS AS` for invoice balances, `UNIQUE + ON CONFLICT DO NOTHING` for M-Pesa idempotency, and deferred triggers for ledger balance enforcement.
- **Consequences:** Stronger data guarantees. Some logic moves from application code to database schema.
- **Source:** CBC-School-Management-Addendum-Neon-Postgres.md Section D

## ADR-005: Secrets Stored as References, Not Raw Values
- **Date:** 2026-07-10
- **Context:** M-Pesa Daraja credentials and SMS provider credentials must not be hardcoded.
- **Decision:** Store secrets in environment variables (or secrets manager references). Database columns like `daraja_consumer_key_ref` store references, never raw secrets.
- **Consequences:** Requires secrets manager or env var infrastructure. Safer for deployment and rotation.
- **Source:** CBC-School-Management-Addendum-Neon-Postgres.md Section D

## ADR-006: No Super Admin or Multi-School in Phase 1
- **Date:** 2026-07-10
- **Context:** Multi-school architecture requires a control-plane table and per-request DB resolution.
- **Decision:** Build single-tenant app fully configured via env vars. Control-plane is a Phase 2 concern.
- **Consequences:** Faster Phase 1 delivery. Config structured so school #2 is a copy-deploy, not a redesign.
- **Source:** CBC-School-Management-Addendum-Neon-Postgres.md Sections A & E
