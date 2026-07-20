ALTER TABLE "fee_invoices" ALTER COLUMN "amount_paid" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "fee_invoices" ALTER COLUMN "balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ledger_lines" ALTER COLUMN "debit" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ledger_lines" ALTER COLUMN "credit" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();