
-- Table to track daily login streaks per user
CREATE TABLE public.daily_login_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  total_days_active integer NOT NULL DEFAULT 0,
  streak_points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_login_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
CREATE POLICY "Users can view own streak"
  ON public.daily_login_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own streak
CREATE POLICY "Users can insert own streak"
  ON public.daily_login_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own streak
CREATE POLICY "Users can update own streak"
  ON public.daily_login_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Managers/admins can view all streaks (for leaderboard)
CREATE POLICY "Managers can view all streaks"
  ON public.daily_login_streaks FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Rookies can view other rookies' streaks (for leaderboard)
CREATE POLICY "Rookies can view rookie streaks"
  ON public.daily_login_streaks FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'rookie'::app_role 
    AND get_user_role(user_id) = 'rookie'::app_role
  );

-- Streak bonus points schedule:
-- 3 days = 50 pts, 7 days = 150 pts, 14 days = 300 pts, 21 days = 500 pts, 30 days = 1000 pts
-- Plus 10 pts per day for maintaining any streak

-- Function to record daily login and update streak
CREATE OR REPLACE FUNCTION public.record_daily_login(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec daily_login_streaks%ROWTYPE;
  today date := CURRENT_DATE;
  yesterday date := CURRENT_DATE - 1;
  old_streak integer;
  new_streak integer;
  bonus_points integer := 0;
  milestone_hit text := null;
  daily_points integer := 10;
BEGIN
  -- Get or create streak record
  SELECT * INTO rec FROM daily_login_streaks WHERE user_id = _user_id;
  
  IF rec IS NULL THEN
    -- First login ever
    INSERT INTO daily_login_streaks (user_id, current_streak, longest_streak, last_login_date, total_days_active, streak_points_awarded)
    VALUES (_user_id, 1, 1, today, 1, daily_points)
    RETURNING * INTO rec;
    
    -- Award daily streak points
    PERFORM award_training_points(_user_id, daily_points);
    
    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'points_awarded', daily_points,
      'milestone', null,
      'already_recorded', false
    );
  END IF;
  
  -- Already logged in today
  IF rec.last_login_date = today THEN
    RETURN jsonb_build_object(
      'current_streak', rec.current_streak,
      'longest_streak', rec.longest_streak,
      'points_awarded', 0,
      'milestone', null,
      'already_recorded', true
    );
  END IF;
  
  old_streak := rec.current_streak;
  
  -- Check if continuing streak (logged in yesterday)
  IF rec.last_login_date = yesterday THEN
    new_streak := old_streak + 1;
  ELSE
    -- Streak broken, restart
    new_streak := 1;
  END IF;
  
  -- Calculate bonus points for milestones
  bonus_points := daily_points; -- base daily points
  
  IF new_streak = 3 AND old_streak < 3 THEN
    bonus_points := bonus_points + 50;
    milestone_hit := '3-day streak! +50 bonus pts';
  ELSIF new_streak = 7 AND old_streak < 7 THEN
    bonus_points := bonus_points + 150;
    milestone_hit := '7-day streak! +150 bonus pts';
  ELSIF new_streak = 14 AND old_streak < 14 THEN
    bonus_points := bonus_points + 300;
    milestone_hit := '14-day streak! +300 bonus pts';
  ELSIF new_streak = 21 AND old_streak < 21 THEN
    bonus_points := bonus_points + 500;
    milestone_hit := '21-day streak! +500 bonus pts';
  ELSIF new_streak = 30 AND old_streak < 30 THEN
    bonus_points := bonus_points + 1000;
    milestone_hit := '30-day streak! +1000 bonus pts';
  END IF;
  
  -- Update streak record
  UPDATE daily_login_streaks
  SET 
    current_streak = new_streak,
    longest_streak = GREATEST(rec.longest_streak, new_streak),
    last_login_date = today,
    total_days_active = rec.total_days_active + 1,
    streak_points_awarded = rec.streak_points_awarded + bonus_points,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Award points
  IF bonus_points > 0 THEN
    PERFORM award_training_points(_user_id, bonus_points);
  END IF;
  
  RETURN jsonb_build_object(
    'current_streak', new_streak,
    'longest_streak', GREATEST(rec.longest_streak, new_streak),
    'points_awarded', bonus_points,
    'milestone', milestone_hit,
    'already_recorded', false
  );
END;
$$;
