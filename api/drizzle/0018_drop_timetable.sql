ALTER TABLE "extra_duty_payments" DROP CONSTRAINT IF EXISTS "extra_duty_payments_timetable_slot_id_timetable_slots_id_fk";
ALTER TABLE "extra_duty_payments" DROP COLUMN IF EXISTS "timetable_slot_id";
--> statement-breakpoint
ALTER TABLE "timetable_alternatives" DROP CONSTRAINT IF EXISTS "timetable_alternatives_version_id_timetable_versions_id_fk";
DROP TABLE IF EXISTS "timetable_alternatives";
--> statement-breakpoint
ALTER TABLE "timetable_slots" DROP CONSTRAINT IF EXISTS "timetable_slots_learning_area_id_learning_areas_id_fk";
ALTER TABLE "timetable_slots" DROP CONSTRAINT IF EXISTS "timetable_slots_staff_id_staff_id_fk";
ALTER TABLE "timetable_slots" DROP CONSTRAINT IF EXISTS "timetable_slots_version_id_timetable_versions_id_fk";
DROP TABLE IF EXISTS "timetable_slots";
--> statement-breakpoint
DROP TABLE IF EXISTS "timetable_versions";
--> statement-breakpoint
ALTER TABLE "exit_notifications" ALTER COLUMN "affected_slot_ids" TYPE text[] USING "affected_slot_ids"::text[];
--> statement-breakpoint
CREATE TABLE "session_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "staff_id" uuid NOT NULL,
  "session_type" text NOT NULL,
  "day_of_week" smallint NOT NULL,
  "is_active" boolean DEFAULT true,
  "assigned_at" timestamp with time zone DEFAULT now(),
  "assigned_by" uuid,
  CONSTRAINT "uq_session_assignment_staff_day" UNIQUE("staff_id", "day_of_week")
);
--> statement-breakpoint
ALTER TABLE "session_assignments" ADD CONSTRAINT "session_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session_assignments" ADD CONSTRAINT "session_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
