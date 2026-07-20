# AGENTS.md — CBC School Management System

## Purpose
This file provides persistent, never-compacted instructions for any AI agent working on this project. It is the primary "memory anchor" — read this first, always.

## Project Overview
CBC School Management System: one Neon Postgres database per school, Node/Express backend, Drizzle ORM. See `.kilo/rules/database_architecture.md` for the compressed architectural guardrails.

## Tech Stack
- Runtime: Node.js + Express
- ORM: Drizzle (with `@neondatabase/serverless` or Neon pooled connection string)
- Database: Neon Postgres (one project per school)
- Auth: JWT + RBAC
- Integrations: M-Pesa Daraja, SMS provider
- Deployment: Serverless-friendly (Vercel/Render/Railway)

## How to Resume After Context Reset / Accidental Stop
1. Read this file (`AGENTS.md`) first.
2. Read `STATUS.md` — find the "NEXT ACTION" section at the bottom.
3. Read `TODO.md` — find the next unchecked task.
4. Read `PROJECT_PLAN.md` for phase context.
5. Read `.kilo/rules/database_architecture.md` for schema/connection constraints.
6. Do NOT re-read the full `CBC-School-Management-Addendum-Neon-Postgres.md` unless you need details not covered by the above.

## Anti-Hallucination & Truncation Guardrails
- **Do not invent features.** Only build what is specified in the addendum, PROJECT_PLAN.md, or TODO.md.
- **Do not hardcode assumptions** (e.g., school names, test data sizes, specific SMS provider APIs) unless the spec requires it.
- **Truncation protocol:** If you run out of output tokens mid-task, stop at a logical boundary (end of a file, end of a module), update `TODO.md` to mark partial progress, update `STATUS.md` with the exact cutoff point, and stop. Do NOT continue silently — let the user resume.
- **Schema fidelity:** All table definitions, constraints, indexes, and triggers must match the addendum Section D exactly. Do not "improve" or "simplify" schema unless the user explicitly asks.
- **No tenantId anywhere.** If you see yourself writing `tenantId` in a migration, schema, or query, stop and reconsider — it violates the per-school isolation model.
- **Monetary values:** Always `NUMERIC(10,2)` or `NUMERIC(5,2)`. Never `FLOAT` or `DOUBLE`.
- **Secrets:** Never write raw API keys, consumer secrets, or passkeys to files. Use references/secrets manager patterns from the addendum.
- **File size discipline:** Prefer many small, focused files over large monoliths. This makes it easier to resume after truncation.

## Workflow Rules
- Update `TODO.md` checkboxes as you complete tasks.
- Update `STATUS.md` after completing each significant unit (module, endpoint group, migration).
- Log key decisions in `DECISIONS.md` immediately after making them.
- If you are unsure about a spec detail, check the addendum first. If still unclear, ask the user rather than guessing.

## File Tree Reference
```
school_system/
├── AGENTS.md                    ← You are here
├── TODO.md                      ← Task checklist
├── PROJECT_PLAN.md              ← Phase roadmap
├── STATUS.md                    ← Current state + next action
├── DECISIONS.md                 ← Decision log
├── CBC-School-Management-Addendum-Neon-Postgres.md  ← Source of truth (do not modify)
├── .kilo/rules/
│   └── database_architecture.md ← Compressed schema/connection rules
├── src/
│   ├── config/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── controllers/
│   ├── models/
│   └── utils/
├── drizzle/
│   └── (migrations)
├── tests/
└── .env.example
```

## Module Boundaries (Do Not Cross-Couple)
- `routes/` — HTTP layer only (parse request, call service, return response)
- `services/` — Business logic, transaction orchestration
- `controllers/` — Thin wrappers if needed (or inline in routes)
- `models/` — Drizzle schema definitions + TypeScript types
- `db/` — Connection setup, migrations runner
- `middleware/` — Auth, RBAC, validation, error handling
- `config/` — Environment variable loading, ONE central place for DB URL and credentials

## Critical Reminders
- Neon free tier: pooled connection string only, no double-pooling, accept scale-to-zero.
- Webhook handlers: must be idempotent (`ON CONFLICT DO NOTHING`).
- Timetable: use EXCLUDE constraints, not app-level checks.
- Ledger: use the deferred trigger for balance enforcement.
- No Super Admin or multi-school routing in Phase 1.
