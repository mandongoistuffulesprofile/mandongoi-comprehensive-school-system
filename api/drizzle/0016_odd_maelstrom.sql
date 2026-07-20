CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"description" text NOT NULL,
	"performed_by" uuid,
	"performed_by_name" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "choice_group_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"class" text,
	"signature_url" text,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "uq_class_teacher_grade" UNIQUE("grade","class")
);
--> statement-breakpoint
CREATE TABLE "curriculum_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grade_band" text NOT NULL,
	"effective_from" timestamp NOT NULL,
	"lesson_duration_minutes" smallint NOT NULL,
	"break_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "curriculum_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_config_id" uuid NOT NULL,
	"learning_area_id" uuid,
	"name" text NOT NULL,
	"weekly_lessons" smallint NOT NULL,
	"allows_double_lesson" boolean DEFAULT false NOT NULL,
	"is_choice_group" boolean DEFAULT false NOT NULL,
	"requires_room_type" text,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "level" SET DEFAULT 'comprehensive';--> statement-breakpoint
ALTER TABLE "fee_structures" ADD COLUMN "student_type" text DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "student_type" text DEFAULT 'day' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "boarding_house" text;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD COLUMN "lesson_duration_minutes" smallint;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choice_group_options" ADD CONSTRAINT "choice_group_options_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_curriculum_config_id_curriculum_configs_id_fk" FOREIGN KEY ("curriculum_config_id") REFERENCES "public"."curriculum_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_learning_area_id_learning_areas_id_fk" FOREIGN KEY ("learning_area_id") REFERENCES "public"."learning_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attendance_staff_staff_id" ON "attendance_staff" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_student_student_id" ON "attendance_student" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoices_student_id" ON "fee_invoices" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoices_fee_structure_id" ON "fee_invoices" USING btree ("fee_structure_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_lines_entry_id" ON "ledger_lines" USING btree ("ledger_entry_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_lines_account_id" ON "ledger_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_mpesa_transactions_paybill_id" ON "mpesa_transactions" USING btree ("paybill_id");--> statement-breakpoint
CREATE INDEX "idx_mpesa_transactions_matched_student_id" ON "mpesa_transactions" USING btree ("matched_student_id");--> statement-breakpoint
CREATE INDEX "idx_mpesa_transactions_matched_invoice_id" ON "mpesa_transactions" USING btree ("matched_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_run_id" ON "payroll_entries" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_staff_id" ON "payroll_entries" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_invoice_id" ON "receipts" USING btree ("invoice_id");