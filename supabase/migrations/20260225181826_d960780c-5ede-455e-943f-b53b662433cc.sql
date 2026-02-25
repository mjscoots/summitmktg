
CREATE OR REPLACE FUNCTION public.record_daily_login(_user_id uuid, _timezone text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec daily_login_streaks%ROWTYPE;
  tz text;
  today date;
  yesterday date;
  old_streak integer;
  new_streak integer;
  bonus_points integer := 0;
  milestone_hit text := null;
  daily_points integer := 10;
BEGIN
  -- Use user's timezone from profile if not provided
  IF _timezone IS NULL OR _timezone = '' THEN
    SELECT COALESCE(p.timezone, 'America/Los_Angeles') INTO tz
    FROM profiles p WHERE p.user_id = _user_id;
    tz := COALESCE(tz, 'America/Los_Angeles');
  ELSE
    tz := _timezone;
  END IF;

  -- Calculate today/yesterday in user's local timezone
  today := (NOW() AT TIME ZONE tz)::date;
  yesterday := today - 1;

  -- Get or create streak record
  SELECT * INTO rec FROM daily_login_streaks WHERE user_id = _user_id;
  
  IF rec IS NULL THEN
    INSERT INTO daily_login_streaks (user_id, current_streak, longest_streak, last_login_date, total_days_active, streak_points_awarded)
    VALUES (_user_id, 1, 1, today, 1, daily_points)
    RETURNING * INTO rec;
    
    PERFORM award_training_points(_user_id, daily_points);
    
    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'points_awarded', daily_points,
      'milestone', null,
      'already_recorded', false
    );
  END IF;
  
  -- Already logged in today (in user's timezone)
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
  
  -- Check if continuing streak (logged in yesterday in user's tz)
  IF rec.last_login_date = yesterday THEN
    new_streak := old_streak + 1;
  ELSE
    new_streak := 1;
  END IF;
  
  -- Calculate bonus points for milestones
  bonus_points := daily_points;
  
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
  
  UPDATE daily_login_streaks
  SET 
    current_streak = new_streak,
    longest_streak = GREATEST(rec.longest_streak, new_streak),
    last_login_date = today,
    total_days_active = rec.total_days_active + 1,
    streak_points_awarded = rec.streak_points_awarded + bonus_points,
    updated_at = now()
  WHERE user_id = _user_id;
  
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
$function$;
