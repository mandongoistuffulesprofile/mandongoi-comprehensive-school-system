CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"learning_area_id" uuid NOT NULL,
	"strand_id" uuid,
	"term" smallint NOT NULL,
	"academic_year" smallint NOT NULL,
	"type" text NOT NULL,
	"performance_level" smallint,
	"score" numeric(5, 2),
	"remarks" text,
	"assessed_by" uuid,
	"assessed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"sessions_taught" smallint DEFAULT 0,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_student" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"status" text NOT NULL,
	"marked_by" uuid
);
--> statement-breakpoint
CREATE TABLE "automated_sms_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"template_id" uuid,
	"is_active" boolean DEFAULT true,
	"last_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fee_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"fee_structure_id" uuid NOT NULL,
	"term" smallint NOT NULL,
	"academic_year" smallint NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT 0 NOT NULL,
	"balance" numeric(10, 2) DEFAULT 0 NOT NULL,
	"due_date" timestamp,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"last_reminder_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grade" text NOT NULL,
	"term" smallint NOT NULL,
	"academic_year" smallint NOT NULL,
	"items" jsonb NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"relationship" text,
	"is_primary" boolean DEFAULT false,
	"preferred_language" text DEFAULT 'en',
	"sms_opt_out" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learning_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade_levels" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "ledger_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" timestamp NOT NULL,
	"description" text,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ledger_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(10, 2) DEFAULT 0 NOT NULL,
	"credit" numeric(10, 2) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mpesa_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paybill_id" uuid NOT NULL,
	"transaction_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"phone_number" text NOT NULL,
	"account_reference" text NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"matched_student_id" uuid,
	"matched_invoice_id" uuid,
	"match_status" text DEFAULT 'unmatched' NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "mpesa_transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "paybills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"shortcode" text NOT NULL,
	"account_reference_format" text NOT NULL,
	"purpose" text NOT NULL,
	"daraja_consumer_key_ref" text NOT NULL,
	"daraja_consumer_secret_ref" text NOT NULL,
	"daraja_passkey_ref" text NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "paybills_shortcode_unique" UNIQUE("shortcode")
);
--> statement-breakpoint
CREATE TABLE "payroll_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_entry_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"base_rate" numeric(10, 2) NOT NULL,
	"sessions_counted" smallint,
	"days_present" smallint,
	"gross_pay" numeric(10, 2) NOT NULL,
	"net_pay" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" smallint NOT NULL,
	"year" smallint NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"mpesa_transaction_id" uuid,
	"receipt_number" numeric(10, 0) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now(),
	"issued_by" uuid,
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"term" smallint NOT NULL,
	"academic_year" smallint NOT NULL,
	"compiled_results" jsonb NOT NULL,
	"teacher_comments" text,
	"head_teacher_comments" text,
	"generated_at" timestamp with time zone DEFAULT now(),
	"generated_by" uuid,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sms_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"target_filter" jsonb NOT NULL,
	"template_id" uuid,
	"message" text,
	"recipient_count" smallint,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"sent_by" uuid,
	"cost" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"recipient_id" uuid,
	"recipient_type" text NOT NULL,
	"phone_number" text NOT NULL,
	"message" text NOT NULL,
	"template_id" uuid,
	"provider_message_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cost" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"variables" text[] DEFAULT '{}',
	"language" text DEFAULT 'en',
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"role" text NOT NULL,
	"employment_type" text NOT NULL,
	"base_rate" numeric(10, 2) NOT NULL,
	"payout_ref" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "strands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_area_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admission_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"grade" text NOT NULL,
	"class" text NOT NULL,
	"enrollment_date" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "students_admission_number_unique" UNIQUE("admission_number")
);
--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grade" text NOT NULL,
	"class" text NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"learning_area_id" uuid,
	"staff_id" uuid,
	"room" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"permissions" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"must_reset_password" boolean DEFAULT false,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_learning_area_id_learning_areas_id_fk" FOREIGN KEY ("learning_area_id") REFERENCES "public"."learning_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_strand_id_strands_id_fk" FOREIGN KEY ("strand_id") REFERENCES "public"."strands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_staff" ADD CONSTRAINT "attendance_staff_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_student" ADD CONSTRAINT "attendance_student_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_student" ADD CONSTRAINT "attendance_student_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automated_sms_rules" ADD CONSTRAINT "automated_sms_rules_template_id_sms_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."sms_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_fee_structure_id_fee_structures_id_fk" FOREIGN KEY ("fee_structure_id") REFERENCES "public"."fee_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_paybill_id_paybills_id_fk" FOREIGN KEY ("paybill_id") REFERENCES "public"."paybills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_matched_student_id_students_id_fk" FOREIGN KEY ("matched_student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_matched_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("matched_invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_payroll_entry_id_payroll_entries_id_fk" FOREIGN KEY ("payroll_entry_id") REFERENCES "public"."payroll_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_mpesa_transaction_id_mpesa_transactions_id_fk" FOREIGN KEY ("mpesa_transaction_id") REFERENCES "public"."mpesa_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_template_id_sms_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."sms_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_campaign_id_sms_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."sms_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_template_id_sms_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."sms_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strands" ADD CONSTRAINT "strands_learning_area_id_learning_areas_id_fk" FOREIGN KEY ("learning_area_id") REFERENCES "public"."learning_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_learning_area_id_learning_areas_id_fk" FOREIGN KEY ("learning_area_id") REFERENCES "public"."learning_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assessments_student_term" ON "assessments" USING btree ("student_id","term","academic_year");--> statement-breakpoint
CREATE INDEX "idx_guardians_student" ON "guardians" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_guardians_phone" ON "guardians" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_report_card_unique" ON "report_cards" USING btree ("student_id","term","academic_year");