ALTER TABLE "students" DROP CONSTRAINT "students_admission_number_unique";--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "admission_number" DROP NOT NULL;