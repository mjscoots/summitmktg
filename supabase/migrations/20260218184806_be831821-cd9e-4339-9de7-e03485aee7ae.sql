
-- Add column to track if manager was notified about overdue bootcamp
ALTER TABLE public.bootcamp_progress 
ADD COLUMN IF NOT EXISTS manager_notified_at timestamp with time zone DEFAULT NULL;

-- Enable pg_cron and pg_net for scheduled function calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
