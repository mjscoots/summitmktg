
CREATE OR REPLACE FUNCTION get_current_leaderboard()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  nickname TEXT,
  avatar_url TEXT,
  team_name TEXT,
  total_points INTEGER,
  training_points INTEGER,
  current_streak INTEGER,
  lessons_completed BIGINT,
  videos_watched BIGINT,
  time_this_week_minutes INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_week_start DATE;
BEGIN
  -- Calculate current PST Monday (single source of truth)
  v_current_week_start := date_trunc('week',
    (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;

  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      p.user_id,
      p.full_name,
      p.nickname,
      p.avatar_url,
      t.name as team_name,
      COALESCE(lp.total_points, 0)::integer as total_points,
      COALESCE(lp.training_points, 0)::integer as training_points,
      COALESCE(s.current_streak, 0)::integer as current_streak,
      (SELECT COUNT(*) FROM lesson_progress lpr
       WHERE lpr.user_id = p.user_id
       AND lpr.completed_at >= v_current_week_start
       AND lpr.completed_at IS NOT NULL) as lessons_completed,
      (SELECT COUNT(*) FROM video_progress vp
       WHERE vp.user_id = p.user_id
       AND vp.watched_at >= v_current_week_start
       AND vp.watched = true) as videos_watched,
      COALESCE(p.time_this_week_minutes, 0)::integer as time_this_week_minutes
    FROM profiles p
    LEFT JOIN teams t ON t.id = p.team_id
    LEFT JOIN leaderboard_points lp ON lp.user_id = p.user_id
      AND lp.week_start = v_current_week_start
    LEFT JOIN daily_login_streaks s ON s.user_id = p.user_id
    WHERE p.status = 'active'
    AND p.approved = true
    ORDER BY COALESCE(lp.total_points, 0) DESC
  )
  SELECT
    ru.*,
    ROW_NUMBER() OVER (ORDER BY ru.total_points DESC, ru.lessons_completed DESC, ru.full_name ASC)::bigint as rank
  FROM ranked_users ru;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_leaderboard() TO authenticated;
