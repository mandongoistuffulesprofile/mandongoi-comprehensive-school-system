# STATUS — CBC School Management System

## Current State
All 26 tables implemented and migrated. Server stack verified end-to-end: auth, CRUD, ledger, payroll, attendance, timetable, SMS, and webhook paths are functional locally. Tests pass. Code committed and pushed. Ready for staging deployment on Render.

## Completed
- [x] Full schema + migrations
- [x] Neon connection resolution for constrained environments
- [x] Seed data populated
- [x] Auth + RBAC verified
- [x] CRUD endpoints verified: students, guardians, fees/invoices, staff, ledger, attendance, timetable, SMS
- [x] Date serialization fixes applied to students and attendance
- [x] 13 unit/integration tests passing
- [x] `render.yaml` created for staging
- [x] Code committed and pushed to GitHub

## In Progress
- Staging deployment on Render
- Scale-to-zero verification on staging

## Blockers
- None

## Key Decisions
- `drizzle-orm/node-postgres` + `pg` Pool for local compatibility; production relies on standard `DATABASE_URL`
- Local IPv4/SNI workaround only applies in `development`
- No connection polling; scale-to-zero tolerance built in

## Next Action
1. Complete Render staging deployment
2. Run staging smoke tests
3. Run scale-to-zero cold-start timing test on staging
4. Production deployment

See `TODO.md` for full checklist.

## Post-blueprint hardening (frontend blueprint follow-ups)
- [x] Added `sms-templates` CRUD routes (`src/routes/sms-templates.ts`) + mounted `/api/sms-templates` (schoolAdmin write, schoolAdmin+accountant read) — closes blueprint Gap 1.
- [x] Added `parentStudentLinks` table + `unique(user_id, student_id)` + FKs; migration `drizzle/0002_freezing_xavin.sql` generated (run `npm run db:migrate` to apply).
- [x] Added record-scoped ownership middleware `requireOwnStudent` / `requireOwnInvoice` in `src/middleware/rbac.ts`; wired into the 5 parent-accessible GET routes — closes blueprint Gap 2 (Option B).
- [x] Enforced `guardians.smsOptOut` server-side in `services/sms.ts sendSmsMessages`.
- [ ] Add admin endpoint to manage `parentStudentLinks` (assign parent ↔ student) for the parent portal.
- [ ] Decide v1 pagination strategy for unbounded list endpoints (students/invoices/sms-logs).
- [ ] Add DB-level atomic guards for payroll/journal state transitions (currently app-level only).
