ALTER TABLE "food_presets" ADD COLUMN IF NOT EXISTS "stock_quantity" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "food_presets" ADD COLUMN IF NOT EXISTS "reorder_level" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "food_logs" ALTER COLUMN "student_id" DROP NOT NULL;
ALTER TABLE "food_logs" ADD COLUMN "type" text DEFAULT 'consumption' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "ledger_entries_source_type_check";
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_source_type_check" CHECK ("source_type" IN ('feePayment', 'payroll', 'expense', 'smsCost', 'manual', 'foodPurchase', 'foodContribution'));
