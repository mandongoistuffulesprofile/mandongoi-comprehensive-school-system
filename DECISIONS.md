# Decisions

## 1. Wipe Script Approach — TRUNCATE CASCADE (2026-08-09)

**Decision:** Created `api/src/db/wipe-seed-data.ts` using `TRUNCATE ... CASCADE` wrapped in a transaction, rather than deleting rows individually or using ORM operations.

**Rationale:**
- `TRUNCATE CASCADE` is faster than row-by-row deletes and handles all foreign key chains automatically
- Wrapped in a transaction so partial failures roll back completely
- Explicit table lists make it clear what is preserved vs wiped (no surprises)
- Production safety check prevents accidental runs on live data
- Idempotent — can be re-run safely (TRUNCATE on already-empty tables is a no-op)

**Alternatives considered:**
- `DELETE FROM` with individual table calls — slower, doesn't reset sequences (though all IDs are UUIDs, so sequence reset isn't relevant)
- ORM-based deletion — adds unnecessary overhead and risk of partial states
- Separate API endpoint — decided against; a CLI script is safer for a destructive operation (no risk of accidental HTTP calls)

## 2. Admin Account Preservation (2026-08-09)

**Decision:** Preserve the seeded `users` table (3 accounts: admin, teacher, accountant) rather than wiping entirely.

**Rationale:**
- The `/register` endpoint (`auth.ts:43`) requires `requireRole('schoolAdmin')` — it cannot create the first admin
- Wiping all users creates an impossible bootstrap scenario: no login → no registration → no system access
- Admin can log in with `mustResetPassword: true` and the school can use this single admin to register other users

**Trade-off:** The admin email remains `admin@school.edu` (generic). Updating to real school email deferred since no profile update endpoint exists.

## 3. Staff Records Wipe (2026-08-09)

**Decision:** Wipe the `staff` table (4 mock entries) along with all staff-management tables.

**Rationale:**
- Staff members are separate from user accounts and are tied to mock teacher data
- Staff creation is possible via `POST /api/staff` (schoolAdmin only)
- All dependent tables (`attendance_staff`, `payroll_*`, `class_teachers`, etc.) are cleared together to avoid orphaned FKs

## 4. Fee Structures Wipe (2026-08-09)

**Decision:** Wipe `fee_structures` and `fee_invoices` tables.

**Rationale:**
- 17 rows contain placeholder mock KES amounts that would produce wrong invoices
- Fee structures must be entered with real school amounts before invoices can be generated correctly
- Decoupling fee structure entry from student creation prevents bad pricing corrupting all invoices

## 5. Food Presets Preservation (2026-08-09)

**Decision:** Preserve `food_presets` (5 generic items: Maize Flour, Rice, Beans, Cooking Oil, Sugar).

**Rationale:**
- These are reusable reference data, not mock transactional records
- The school can edit quantities/prices or add new items via the food presets UI
- Wiping and re-adding the same 5 items adds no value

## 6. No Bulk Student Import (2026-08-09)

**Decision:** Do not create a bulk student import endpoint. Manual entry only via the Create Student form.

**Rationale:**
- The user explicitly requested manual entry only ("preparing for manual student record entry")
- The existing `guardians-bulk.ts` endpoint provides bulk guardian entry (useful for siblings sharing guardians)
- Manual entry via `CreateStudent.tsx` is sufficient for the expected student count at this school

## 7. Admission Numbers — No Auto-Generation (2026-08-09)

**Decision:** No changes to admission number logic — the field remains plain text, not auto-generated.

**Rationale:**
- The `admissionNumber` field in the schema is `text('admission_number')` with no sequence or generation logic
- `CreateStudent.tsx` form does not set `admissionNumber` — it remains `null`
- No `MAX(admissionNumber)` + 1 logic exists that would break on empty tables
- Schools can manually assign admission numbers if desired
