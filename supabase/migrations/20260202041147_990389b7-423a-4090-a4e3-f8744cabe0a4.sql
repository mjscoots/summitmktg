-- Create avatars storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Create policy for users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create calendar_events table for attendance tracking
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_events
CREATE POLICY "Authenticated users can view calendar events"
ON public.calendar_events FOR SELECT
USING (true);

CREATE POLICY "Managers can create calendar events"
ON public.calendar_events FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can update calendar events"
ON public.calendar_events FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can delete calendar events"
ON public.calendar_events FOR DELETE
USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Create calendar_attendance table
CREATE TABLE public.calendar_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attending', 'not_attending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on calendar_attendance
ALTER TABLE public.calendar_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_attendance
CREATE POLICY "Users can view their own attendance"
ON public.calendar_attendance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all attendance"
ON public.calendar_attendance FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage their own attendance"
ON public.calendar_attendance FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
ON public.calendar_attendance FOR UPDATE
USING (auth.uid() = user_id);

-- Update announcement policies to allow all managers to pin/unpin
DROP POLICY IF EXISTS "Managers can update announcements" ON public.announcements;

CREATE POLICY "Managers can update announcements"
ON public.announcements FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));