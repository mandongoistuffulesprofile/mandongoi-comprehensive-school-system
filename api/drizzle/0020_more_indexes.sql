CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created ON audit_logs (category, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs (status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_students_grade_class ON students (grade, class);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_food_logs_type ON food_logs (type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);
