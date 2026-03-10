
-- Add streak restores column (3 lifetime restores)
ALTER TABLE public.daily_login_streaks
  ADD COLUMN IF NOT EXISTS streak_restores_remaining integer NOT NULL DEFAULT 3;

-- Add columns to track the streak before it was lost (for restore)
ALTER TABLE public.daily_login_streaks
  ADD COLUMN IF NOT EXISTS previous_streak integer NOT NULL DEFAULT 0;

-- Create restore_streak RPC
CREATE OR REPLACE FUNCTION public.restore_streak(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row daily_login_streaks%ROWTYPE;
  _today date;
  _tz text;
BEGIN
  _tz := 'America/Los_Angeles';
  _today := (now() AT TIME ZONE _tz)::date;

  SELECT * INTO _row FROM daily_login_streaks WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No streak data found');
  END IF;

  IF _row.streak_restores_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No restores remaining');
  END IF;

  IF _row.previous_streak <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No streak to restore');
  END IF;

  -- Restore the streak
  UPDATE daily_login_streaks
  SET current_streak = _row.previous_streak + 1,
      previous_streak = 0,
      streak_restores_remaining = _row.streak_restores_remaining - 1,
      last_login_date = _today,
      longest_streak = GREATEST(_row.longest_streak, _row.previous_streak + 1),
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'restored_streak', _row.previous_streak + 1,
    'restores_remaining', _row.streak_restores_remaining - 1
  );
END;
$$;

-- Update record_daily_login to save previous_streak when streak breaks
CREATE OR REPLACE FUNCTION public.record_daily_login(_user_id uuid, _timezone text DEFAULT 'America/Los_Angeles')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date;
  _row daily_login_streaks%ROWTYPE;
  _new_streak integer;
  _points integer := 0;
  _milestone text := NULL;
  _already boolean := false;
BEGIN
  _today := (now() AT TIME ZONE _timezone)::date;

  SELECT * INTO _row FROM daily_login_streaks WHERE user_id = _user_id;

  -- First ever login
  IF NOT FOUND THEN
    INSERT INTO daily_login_streaks (user_id, current_streak, longest_streak, last_login_date, total_days_active, streak_points_awarded)
    VALUES (_user_id, 1, 1, _today, 1, 10);

    INSERT INTO point_events (user_id, category, points, metadata)
    VALUES (_user_id, 'streak', 10, '{"reason":"daily_login","day":1}'::jsonb);

    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'points_awarded', 10,
      'milestone', '1 Day — Welcome!',
      'already_recorded', false
    );
  END IF;

  -- Already logged in today
  IF _row.last_login_date = _today THEN
    RETURN jsonb_build_object(
      'current_streak', _row.current_streak,
      'longest_streak', _row.longest_streak,
      'points_awarded', 0,
      'milestone', NULL,
      'already_recorded', true
    );
  END IF;

  -- Consecutive day
  IF _row.last_login_date = _today - 1 THEN
    _new_streak := _row.current_streak + 1;
  ELSE
    -- Streak broken — save the old streak for possible restore
    _new_streak := 1;
  END IF;

  -- Calculate points
  _points := 10; -- base daily login
  IF _new_streak = 3 THEN _points := _points + 50; _milestone := '3 Day Streak!';
  ELSIF _new_streak = 7 THEN _points := _points + 150; _milestone := '7 Day Streak!';
  ELSIF _new_streak = 14 THEN _points := _points + 300; _milestone := '14 Day Streak!';
  ELSIF _new_streak = 21 THEN _points := _points + 500; _milestone := '21 Day Streak!';
  ELSIF _new_streak = 30 THEN _points := _points + 1000; _milestone := '30 Day Streak!';
  ELSIF _new_streak = 60 THEN _points := _points + 2000; _milestone := '60 Day Streak!';
  ELSIF _new_streak = 90 THEN _points := _points + 3000; _milestone := '90 Day Streak!';
  END IF;

  UPDATE daily_login_streaks
  SET current_streak = _new_streak,
      longest_streak = GREATEST(_row.longest_streak, _new_streak),
      last_login_date = _today,
      total_days_active = _row.total_days_active + 1,
      streak_points_awarded = _row.streak_points_awarded + _points,
      previous_streak = CASE WHEN _new_streak = 1 AND _row.current_streak > 1 THEN _row.current_streak ELSE 0 END,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO point_events (user_id, category, points, metadata)
  VALUES (_user_id, 'streak', _points, jsonb_build_object('reason', 'daily_login', 'day', _new_streak));

  RETURN jsonb_build_object(
    'current_streak', _new_streak,
    'longest_streak', GREATEST(_row.longest_streak, _new_streak),
    'points_awarded', _points,
    'milestone', _milestone,
    'already_recorded', false
  );
END;
$$;
