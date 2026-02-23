
-- Create daily_training_time table for tracking per-day training breakdown
CREATE TABLE public.daily_training_time (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  training_minutes INTEGER NOT NULL DEFAULT 0,
  video_minutes INTEGER NOT NULL DEFAULT 0,
  lesson_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_training_time ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own daily time"
  ON public.daily_training_time FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all daily time"
  ON public.daily_training_time FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert daily time"
  ON public.daily_training_time FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update daily time"
  ON public.daily_training_time FOR UPDATE
  USING (auth.uid() = user_id);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_training_time;

-- Create the record_daily_time RPC
CREATE OR REPLACE FUNCTION public.record_daily_time(_user_id UUID, _category TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
BEGIN
  -- Upsert daily training time row
  INSERT INTO public.daily_training_time (user_id, date, total_minutes, training_minutes, video_minutes, lesson_minutes)
  VALUES (_user_id, _today, 1, 
    CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_minutes = daily_training_time.total_minutes + 1,
    training_minutes = daily_training_time.training_minutes + CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    video_minutes = daily_training_time.video_minutes + CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    lesson_minutes = daily_training_time.lesson_minutes + CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END,
    updated_at = now();

  -- Also update profiles.time_this_week_minutes
  UPDATE public.profiles
  SET time_this_week_minutes = COALESCE(time_this_week_minutes, 0) + 1,
      updated_at = now()
  WHERE profiles.user_id = _user_id;
END;
$$;
