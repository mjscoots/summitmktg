-- Add recurrence fields to calendar_events table
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_day_of_month INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE DEFAULT NULL;

-- Add team targeting to announcements
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS team_ids UUID[] DEFAULT NULL;

-- Add interview booking URL setting (can be managed by admin)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Anyone can read app_settings" ON public.app_settings
    FOR SELECT TO authenticated USING (true);

-- Only admins can modify settings
CREATE POLICY "Only admins can modify app_settings" ON public.app_settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default interview booking URL
INSERT INTO public.app_settings (key, value) 
VALUES ('interview_booking_url', 'https://calendly.com')
ON CONFLICT (key) DO NOTHING;

-- Add pillar/team field to track which pillar interviewed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pillar_slug TEXT DEFAULT NULL;