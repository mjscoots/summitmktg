-- Daily training time tracking table
CREATE TABLE public.daily_training_time (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  training_minutes INTEGER DEFAULT 0,
  video_minutes INTEGER DEFAULT 0,
  lesson_minutes INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_daily_training_time_user_date ON public.daily_training_time(user_id, date);
CREATE INDEX idx_daily_training_time_date ON public.daily_training_time(date);

-- Enable RLS
ALTER TABLE public.daily_training_time ENABLE ROW LEVEL SECURITY;

-- Users can read their own rows
CREATE POLICY "Users can read own daily training time"
  ON public.daily_training_time
  FOR SELECT
  USING (auth.uid() = user_id);

-- Managers and admins can read all rows
CREATE POLICY "Managers and admins can read all daily training time"
  ON public.daily_training_time
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('manager', 'admin')
    )
  );

-- No direct INSERT/UPDATE from client — only via RPC
-- (No INSERT/UPDATE/DELETE policies for client)

-- RPC: record_daily_time
-- Upserts into daily_training_time for today, increments total + category column
-- Also updates profiles.time_this_week_minutes
CREATE OR REPLACE FUNCTION public.record_daily_time(_user_id UUID, _category TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_week_start date;
BEGIN
  -- Upsert daily_training_time for today
  INSERT INTO daily_training_time (user_id, date, total_minutes,
    training_minutes, video_minutes, lesson_minutes)
  VALUES (
    _user_id,
    CURRENT_DATE,
    1,
    CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_minutes = daily_training_time.total_minutes + 1,
    training_minutes = daily_training_time.training_minutes + CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    video_minutes = daily_training_time.video_minutes + CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    lesson_minutes = daily_training_time.lesson_minutes + CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END,
    updated_at = now();

  -- Also update profiles.time_this_week_minutes (with week reset logic)
  current_week_start := date_trunc('week', CURRENT_DATE)::date;

  UPDATE profiles
  SET
    time_this_week_minutes = CASE
      WHEN week_start < current_week_start THEN 1
      ELSE COALESCE(time_this_week_minutes, 0) + 1
    END,
    week_start = CASE
      WHEN week_start < current_week_start THEN current_week_start
      ELSE week_start
    END
  WHERE user_id = _user_id;
END;
$$;

-- Replace update_user_activity: no longer increments time_this_week_minutes
-- Only updates last_active_at, is_active_now, and week_start reset
CREATE OR REPLACE FUNCTION public.update_user_activity(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_week_start date;
BEGIN
  current_week_start := date_trunc('week', CURRENT_DATE)::date;

  UPDATE profiles
  SET
    last_active_at = NOW(),
    is_active_now = true,
    -- Reset week_start if new week (but don't touch time_this_week_minutes here)
    week_start = CASE
      WHEN week_start < current_week_start THEN current_week_start
      ELSE week_start
    END
  WHERE user_id = _user_id;
END;
$$;
