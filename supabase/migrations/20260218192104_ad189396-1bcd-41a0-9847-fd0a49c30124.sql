
-- Add reminder tracking columns to bootcamp_progress
ALTER TABLE public.bootcamp_progress
ADD COLUMN IF NOT EXISTS last_rep_reminder_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_manager_reminder_at timestamptz DEFAULT NULL;
