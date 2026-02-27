CREATE OR REPLACE FUNCTION public.award_training_points(_user_id uuid, _points integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week date;
BEGIN
  current_week := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
  
  INSERT INTO public.leaderboard_points (user_id, week_start, training_points)
  VALUES (_user_id, current_week, _points)
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET 
    training_points = leaderboard_points.training_points + _points,
    updated_at = now();
END;
$$;