CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_status ON fee_invoices (student_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_attendance_student_student_date ON attendance_student (student_id, date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts (invoice_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_match ON mpesa_transactions (match_status, created_at);
