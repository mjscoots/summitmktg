
-- Add timezone column to profiles
ALTER TABLE public.profiles ADD COLUMN timezone text DEFAULT 'America/Los_Angeles';

-- Add timezone column to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN timezone text DEFAULT 'America/Los_Angeles';
