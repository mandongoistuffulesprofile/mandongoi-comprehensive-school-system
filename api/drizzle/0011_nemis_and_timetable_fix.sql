ALTER TABLE "timetable_slots" ALTER COLUMN "start_time" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "timetable_slots" ALTER COLUMN "end_time" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "nemis_id" text;--> statement-breakpoint
ALTER TABLE "timetable_slots" DROP COLUMN "session_type";--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "uq_timetable_no_overlap_staff" UNIQUE("staff_id","day_of_week","start_time");--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "uq_timetable_no_overlap_room" UNIQUE("room","day_of_week","start_time");