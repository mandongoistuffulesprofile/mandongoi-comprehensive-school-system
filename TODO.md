# TODO

## Phase 1: System Preparation (COMPLETE)
- [x] Verify frontend TypeScript compiles cleanly
- [x] Verify backend TypeScript compiles cleanly
- [x] Configure Vite proxy (frontend → backend `/api`)
- [x] Update frontend `.env` (remove `VITE_API_BASE_URL`)
- [x] Add `collectiveFoodCost` field to schema, types, routes
- [x] Update `food-presets.tsx` for collective pricing
- [x] Rewrite `FoodLogs.tsx` (Parent Contributions page)
- [x] Update sidebar label: "Food Logs" → "Parent Contributions"
- [x] Create `wipe-seed-data.ts` script
- [x] Run wipe script — cleared all mocked transactional data
- [x] Verify wipe script is idempotent (re-runnable)
- [x] Preserve system config: `school_settings`, `users`, `ledger_accounts`, `sms_templates`, `paybills`, `food_presets`
- [x] Preserve curriculum reference: `learning_areas`, `strands`, `curriculum_configs`, `curriculum_subjects`, `choice_group_options`
- [x] Wipe mock student data: `students`, `guardians`, `parent_student_links`
- [x] Wipe mock fee data: `fee_structures`, `fee_invoices`
- [x] Wipe mock staff data: `staff`, `class_teachers`, `session_assignments`, `teacher_preferences`
- [x] Wipe mock payroll: `payroll_runs`, `payroll_entries`, `payroll_adjustments`, `attendance_staff`, `extra_duty_payments`
- [x] Wipe mock SMS data: `sms_campaigns`, `sms_logs`, `automated_sms_rules`
- [x] Wipe mock transactional data: `assessments`, `report_cards`, `attendance_student`, `leave_notes`
- [x] Wipe mock payment data: `mpesa_transactions`, `receipts`
- [x] Wipe mock food program data: `food_logs`, `meal_templates`
- [x] Wipe system data: `ledger_entries`, `ledger_lines`, `notifications`, `audit_logs`, `exit_notifications`
- [x] Test admin login works after wipe
- [x] Test student creation works after wipe (manual entry flow)
- [x] Test bulk guardian creation works after wipe
- [x] Verify no auto-increment/admission-number logic breaks on empty tables

## Phase 2: Admin & Staff Setup (Awaiting school data)
- [ ] Admin updates profile (email/name/phone) — currently `admin@school.edu`
- [ ] School provides real staff list → create via `POST /api/staff`
- [ ] School provides real fee structure amounts → create via Fees/Settings UI
- [ ] School provides Paybill details → verify `paybills` table config

## Phase 3: Student Data Entry (Awaiting school data)
- [ ] School provides student roster → manual entry via `/students/create`
- [ ] Guard each student with primary + secondary guardian via "+ Bulk Add"
- [ ] Assign fee structures per grade/student type (after real amounts entered)
- [ ] Generate invoices (after fee structures exist)

## Phase 4: Go-Live
- [ ] Submit M-Pesa Go-Live via Safaricom Developer Portal
- [ ] Test fee payment auto-matching
- [ ] Train staff on system
