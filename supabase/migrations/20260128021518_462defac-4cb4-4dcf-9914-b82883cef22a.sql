-- Add column to store dashboard highlights order per user
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS dashboard_order jsonb DEFAULT '["matrix_alert", "goal_alert", "campaign", "reminder", "order", "vehicle_expiry", "document_expiry", "sling_inspection", "dds", "equipment", "stats", "matrix_chart"]'::jsonb;