CREATE TABLE "school_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_name" text DEFAULT 'My School' NOT NULL,
	"school_motto" text DEFAULT '',
	"school_address" text DEFAULT '',
	"school_phone" text DEFAULT '',
	"school_email" text DEFAULT '',
	"logo_url" text DEFAULT '',
	"current_term" text DEFAULT 'Term 1',
	"current_academic_year" text DEFAULT '2026',
	"term_start_date" timestamp,
	"term_end_date" timestamp,
	"next_term_start_date" timestamp,
	"grading_system" text DEFAULT 'CBC',
	"currency" text DEFAULT 'KES',
	"timezone" text DEFAULT 'Africa/Nairobi',
	"sms_sender_id" text DEFAULT 'School',
	"updated_at" timestamp with time zone DEFAULT now()
);
