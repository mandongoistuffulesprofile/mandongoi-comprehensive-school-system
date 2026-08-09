# Status

## Current State: Data Wipe Complete ✅

All seeded mock data has been successfully wiped from the database. The system is in a **clean-slate-but-functional** state ready to receive real school data.

### What Was Done
1. Created `api/src/db/wipe-seed-data.ts` — a standalone, idempotent script that:
   - Preserves 11 configuration/reference tables (system config, user accounts, chart of accounts, SMS templates, paybill config, food presets, curriculum data)
   - Wipes 29 transactional/mock data tables (students, guardians, staff, fee structures, invoices, attendance, payroll, SMS campaigns/logs, notifications, audit logs, etc.)
   - Uses `TRUNCATE ... CASCADE` in a transaction for safety
   - Includes a production safety check (refuses to run in production env)
   - Verifies preserved tables still have data and wiped tables are empty after execution

2. Ran the wipe script twice (confirmed idempotency):
   - All 29 tables successfully emptied
   - All 11 preserved tables retain their data:
     - `school_settings`: 1 record
     - `users`: 3 records (admin/teacher/accountant accounts)
     - `ledger_accounts`: 7 records
     - `sms_templates`: 5 records
     - `paybills`: 1 record
     - `food_presets`: 5 records
     - `learning_areas`: 18 records
     - `curriculum_configs`: 4 records
     - `curriculum_subjects`: 29 records

3. Verified manual data entry works with empty database:
   - Admin login: ✅ Working (`admin@school.edu` / `Admin@1234`)
   - Student creation: ✅ Working via `POST /api/students`
   - Bulk guardian creation: ✅ Working via `POST /api/guardians/bulk`
   - Student list: ✅ Working via `GET /api/students`
   - Cleaned up test data by re-running wipe script

### Key Design Decisions
- **Admin accounts preserved**: The `/register` endpoint requires `schoolAdmin` role, creating a chicken-and-egg problem. The seeded admin account (`admin@school.edu`) is kept for login bootstrap. Real admin email update deferred (no profile update endpoint exists).
- **Staff records wiped**: 4 mock staff entries removed. Staff can be manually added via `POST /api/staff`.
- **Fee structures wiped**: 17 rows of placeholder mock KES amounts removed. School will enter real amounts via Fees/Settings UI.
- **Food presets preserved**: Generic food items kept as reference data (editable/expandable).
- **No admission numbers**: The `admissionNumber` field is plain text, not auto-generated. Manual entry works naturally.

### NEXT ACTION
Proceed with **Phase 2: Admin & Staff Setup** — waiting on school-provided data:
1. School provides real staff list → create via `POST /api/staff`
2. School provides real fee structure amounts → create via Fees/Settings UI  
3. School confirms Paybill details → verify `paybills` table config
4. School provides student roster → manual entry via `/students/create`

### Development Environment
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:4000 (Express + tsx watch)
- PostgreSQL: port 5434 (local), database `neondb`

### Run Commands
```bash
# Wipe mock data (idempotent, development only)
cd api && npx tsx src/db/wipe-seed-data.ts

# Re-seed mock data (after wipe)
cd api && npx tsx src/db/seed.ts

# Start backend (dev)
cd api && npm run dev

# Start frontend (dev)
cd frontend && npm run dev
```
