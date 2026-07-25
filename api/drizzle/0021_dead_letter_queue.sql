CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id text,
  payload jsonb NOT NULL,
  error_message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  retry_count smallint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue (status, created_at DESC);
