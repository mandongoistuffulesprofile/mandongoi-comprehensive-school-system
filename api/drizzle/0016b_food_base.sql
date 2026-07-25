CREATE TABLE IF NOT EXISTS "food_presets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_name" text NOT NULL,
  "unit_price" numeric(10, 2) NOT NULL,
  "unit" text NOT NULL DEFAULT 'kg',
  "stock_quantity" numeric(10, 2) NOT NULL DEFAULT '0',
  "reorder_level" numeric(10, 2) NOT NULL DEFAULT '0',
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "food_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid REFERENCES "students"("id") ON DELETE CASCADE,
  "preset_id" uuid REFERENCES "food_presets"("id"),
  "item_name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'consumption',
  "quantity" numeric(8, 2) NOT NULL DEFAULT '1',
  "unit" text NOT NULL DEFAULT 'kg',
  "estimated_value" numeric(10, 2) NOT NULL DEFAULT '0',
  "logged_at" timestamptz DEFAULT now(),
  "logged_by" uuid REFERENCES "users"("id"),
  "notes" text,
  "term" smallint NOT NULL,
  "academic_year" smallint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_food_logs_student" ON "food_logs" ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_food_logs_term" ON "food_logs" ("term", "academic_year");
