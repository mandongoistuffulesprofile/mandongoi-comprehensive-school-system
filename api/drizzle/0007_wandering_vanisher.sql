CREATE TABLE "extra_duty_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"timetable_slot_id" uuid,
	"session_type" text NOT NULL,
	"date" timestamp NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payroll_run_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "school_settings" ADD COLUMN "morning_session_rate" numeric(10, 2) DEFAULT '200';--> statement-breakpoint
ALTER TABLE "school_settings" ADD COLUMN "evening_session_rate" numeric(10, 2) DEFAULT '300';--> statement-breakpoint
ALTER TABLE "school_settings" ADD COLUMN "weekend_session_rate" numeric(10, 2) DEFAULT '500';--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "teacher_type" text DEFAULT 'tsc' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "extra_session_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "subjects" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "extra_duty_payments" ADD CONSTRAINT "extra_duty_payments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_duty_payments" ADD CONSTRAINT "extra_duty_payments_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;