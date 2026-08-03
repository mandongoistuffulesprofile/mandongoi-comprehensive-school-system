CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'supper')),
  preset_id UUID NOT NULL REFERENCES food_presets(id),
  fixed_quantity NUMERIC(8, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  term SMALLINT NOT NULL,
  academic_year SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_meal_template UNIQUE (day_of_week, meal_type, preset_id, term, academic_year)
);
