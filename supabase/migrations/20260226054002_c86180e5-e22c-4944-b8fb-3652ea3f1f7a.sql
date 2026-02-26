CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(_limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, current_streak integer, longest_streak integer, total_days_active integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_users AS (
    SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('rookie', 'manager', 'admin', 'owner')
  ),
  active_profiles AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url
    FROM profiles p
    JOIN all_users au ON p.user_id = au.user_id
    WHERE p.status <> 'nlc'
  )
  SELECT
    ap.user_id,
    ap.full_name,
    ap.nickname,
    ap.avatar_url,
    dls.current_streak::integer,
    dls.longest_streak::integer,
    dls.total_days_active::integer
  FROM active_profiles ap
  JOIN daily_login_streaks dls ON ap.user_id = dls.user_id
  WHERE dls.current_streak > 0
  ORDER BY dls.current_streak DESC
  LIMIT _limit;
END;
$function$;