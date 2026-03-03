
CREATE OR REPLACE FUNCTION public.get_all_time_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  nickname text,
  avatar_url text,
  team_name text,
  cumulative_points integer,
  current_streak integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.nickname,
    p.avatar_url,
    t.name as team_name,
    COALESCE(p.cumulative_points, 0)::integer as cumulative_points,
    COALESCE(dls.current_streak, 0)::integer as current_streak
  FROM profiles p
  LEFT JOIN teams t ON t.id = p.team_id
  LEFT JOIN daily_login_streaks dls ON dls.user_id = p.user_id
  WHERE p.status = 'active' AND p.approved = true
    AND COALESCE(p.cumulative_points, 0) > 0
  ORDER BY COALESCE(p.cumulative_points, 0) DESC, p.full_name ASC
  LIMIT _limit;
END;
$$;
