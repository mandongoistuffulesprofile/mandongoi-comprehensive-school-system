CREATE TABLE "leave_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"leave_date" timestamp NOT NULL,
	"expected_return_date" timestamp NOT NULL,
	"actual_return_date" timestamp,
	"status" text DEFAULT 'pending',
	"noted_by" uuid,
	"printed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "leave_notes" ADD CONSTRAINT "leave_notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_notes" ADD CONSTRAINT "leave_notes_noted_by_users_id_fk" FOREIGN KEY ("noted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;