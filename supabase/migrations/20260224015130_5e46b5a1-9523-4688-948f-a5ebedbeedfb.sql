CREATE OR REPLACE FUNCTION public.award_training_points(_user_id uuid, _points integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_week date;
BEGIN
  -- Use PST Monday as week boundary for consistency
  current_week := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
  
  INSERT INTO public.leaderboard_points (user_id, week_start, training_points, total_points)
  VALUES (_user_id, current_week, _points, _points)
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET 
    training_points = leaderboard_points.training_points + _points,
    total_points = COALESCE(leaderboard_points.training_points, 0) + _points 
                 + COALESCE(leaderboard_points.call_attendance_points, 0) 
                 + COALESCE(leaderboard_points.roleplay_points, 0) 
                 + COALESCE(leaderboard_points.quiz_points, 0),
    updated_at = now();
END;
$function$;