
-- Drop and recreate get_current_leaderboard with new return type
DROP FUNCTION IF EXISTS public.get_current_leaderboard();

CREATE OR REPLACE FUNCTION public.get_current_leaderboard()
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, team_name text, total_points integer, training_points integer, current_streak integer, lessons_completed bigint, videos_watched bigint, time_this_week_minutes integer, rank bigint, hours_points integer, threshold_bonus integer, lesson_points integer, video_points integer, streak_points integer, manual_points integer, one_on_one_points integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_current_week_start DATE;
BEGIN
  v_current_week_start := date_trunc('week',
    (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;

  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.user_id,
      p.full_name,
      p.nickname,
      p.avatar_url,
      t.name as team_name,
      COALESCE(p.time_this_week_minutes, 0) as twm,
      (FLOOR(COALESCE(p.time_this_week_minutes, 0) / 60.0) * 40)::integer as base_hours,
      (CASE
        WHEN COALESCE(p.time_this_week_minutes, 0) >= 420 THEN 1500
        WHEN COALESCE(p.time_this_week_minutes, 0) >= 315 THEN 1000
        WHEN COALESCE(p.time_this_week_minutes, 0) >= 210 THEN 500
        ELSE 0
      END)::integer as threshold_bonus,
      (SELECT COUNT(*) * 100 FROM lesson_progress lp
       WHERE lp.user_id = p.user_id
       AND lp.completed_at >= v_current_week_start
       AND lp.completed_at IS NOT NULL)::integer as lesson_pts,
      (SELECT COUNT(*) FROM lesson_progress lp
       WHERE lp.user_id = p.user_id
       AND lp.completed_at >= v_current_week_start
       AND lp.completed_at IS NOT NULL) as lesson_cnt,
      (SELECT COUNT(*) * 40 FROM video_watch_log vwl
       WHERE vwl.user_id = p.user_id
       AND vwl.watched_at >= v_current_week_start)::integer as video_pts,
      (SELECT COUNT(*) FROM video_watch_log vwl
       WHERE vwl.user_id = p.user_id
       AND vwl.watched_at >= v_current_week_start) as video_cnt,
      (CASE
        WHEN COALESCE(s.current_streak, 0) >= 30 THEN (COALESCE(s.current_streak, 0) * 15) + 1950
        WHEN COALESCE(s.current_streak, 0) >= 21 THEN (COALESCE(s.current_streak, 0) * 15) + 950
        WHEN COALESCE(s.current_streak, 0) >= 14 THEN (COALESCE(s.current_streak, 0) * 15) + 450
        WHEN COALESCE(s.current_streak, 0) >= 7 THEN (COALESCE(s.current_streak, 0) * 15) + 150
        ELSE COALESCE(s.current_streak, 0) * 15
      END)::integer as streak_pts,
      COALESCE(s.current_streak, 0)::integer as cur_streak,
      (SELECT COUNT(*) * 30 FROM manual_chapter_progress mcp
       WHERE mcp.user_id = p.user_id
       AND mcp.completed_at >= v_current_week_start)::integer as manual_pts,
      (
        (SELECT COUNT(*) FROM weekly_one_on_ones_rookie w1
         WHERE w1.user_id = p.user_id
         AND w1.created_at >= v_current_week_start)
        +
        (SELECT COUNT(*) FROM weekly_one_on_ones_manager w2
         WHERE w2.manager_id = p.user_id
         AND w2.created_at >= v_current_week_start)
      )::integer * 50 as oo_pts,
      COALESCE(lp_stored.training_points, 0)::integer as stored_training_pts
    FROM profiles p
    LEFT JOIN teams t ON t.id = p.team_id
    LEFT JOIN daily_login_streaks s ON s.user_id = p.user_id
    LEFT JOIN leaderboard_points lp_stored ON lp_stored.user_id = p.user_id
      AND lp_stored.week_start = v_current_week_start
    WHERE p.status = 'active'
    AND p.approved = true
  )
  SELECT
    us.user_id,
    us.full_name,
    us.nickname,
    us.avatar_url,
    us.team_name,
    (us.base_hours + us.threshold_bonus + us.lesson_pts + us.video_pts +
     us.streak_pts + us.manual_pts + us.oo_pts)::integer as total_points,
    us.stored_training_pts as training_points,
    us.cur_streak as current_streak,
    us.lesson_cnt as lessons_completed,
    us.video_cnt as videos_watched,
    us.twm as time_this_week_minutes,
    ROW_NUMBER() OVER (ORDER BY
      (us.base_hours + us.threshold_bonus + us.lesson_pts + us.video_pts +
       us.streak_pts + us.manual_pts + us.oo_pts) DESC,
      us.lesson_pts DESC,
      us.full_name ASC
    )::bigint as rank,
    us.base_hours as hours_points,
    us.threshold_bonus,
    us.lesson_pts as lesson_points,
    us.video_pts as video_points,
    us.streak_pts as streak_points,
    us.manual_pts as manual_points,
    us.oo_pts as one_on_one_points
  FROM user_stats us;
END;
$$;
