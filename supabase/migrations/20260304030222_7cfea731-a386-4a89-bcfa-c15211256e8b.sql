
-- Fix 1: update_user_activity should ONLY update presence, NOT increment time
-- (record_daily_time already handles time tracking)
CREATE OR REPLACE FUNCTION public.update_user_activity(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET 
    last_active_at = NOW(),
    is_active_now = true
  WHERE user_id = _user_id;
END;
$$;

-- Fix 2: get_current_leaderboard should use daily_training_time for this week,
-- same source as all-time, ensuring consistency
CREATE OR REPLACE FUNCTION public.get_current_leaderboard()
RETURNS TABLE(
  user_id uuid, full_name text, nickname text, avatar_url text, team_name text,
  total_points integer, training_points integer, current_streak integer,
  lessons_completed bigint, videos_watched bigint, time_this_week_minutes integer,
  rank bigint, hours_points integer, threshold_bonus integer, lesson_points integer,
  video_points integer, streak_points integer, manual_points integer, one_on_one_points integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_week_start DATE;
BEGIN
  v_current_week_start := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;

  RETURN QUERY
  WITH weekly_time AS (
    -- Single source of truth for time: daily_training_time table
    SELECT dtt.user_id, SUM(dtt.total_minutes)::integer as mins
    FROM daily_training_time dtt
    WHERE dtt.date >= v_current_week_start
    GROUP BY dtt.user_id
  ),
  user_stats AS (
    SELECT
      p.user_id, p.full_name, p.nickname, p.avatar_url, t.name as team_name,
      COALESCE(wt.mins, 0) as twm,
      (FLOOR(COALESCE(wt.mins, 0) / 60.0) * 40)::integer as base_hours,
      (CASE WHEN COALESCE(wt.mins, 0) >= 420 THEN 1500 WHEN COALESCE(wt.mins, 0) >= 315 THEN 1000 WHEN COALESCE(wt.mins, 0) >= 210 THEN 500 ELSE 0 END)::integer as threshold_bonus,
      (SELECT COUNT(*) * 100 FROM lesson_progress lp WHERE lp.user_id = p.user_id AND lp.completed_at >= v_current_week_start AND lp.completed_at IS NOT NULL)::integer as lesson_pts,
      (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = p.user_id AND lp.completed_at >= v_current_week_start AND lp.completed_at IS NOT NULL) as lesson_cnt,
      (SELECT COUNT(*) * 40 FROM video_watch_log vwl WHERE vwl.user_id = p.user_id AND vwl.watched_at >= v_current_week_start)::integer as video_pts,
      (SELECT COUNT(*) FROM video_watch_log vwl WHERE vwl.user_id = p.user_id AND vwl.watched_at >= v_current_week_start) as video_cnt,
      (CASE WHEN COALESCE(s.current_streak, 0) >= 30 THEN (COALESCE(s.current_streak, 0) * 15) + 1950 WHEN COALESCE(s.current_streak, 0) >= 21 THEN (COALESCE(s.current_streak, 0) * 15) + 950 WHEN COALESCE(s.current_streak, 0) >= 14 THEN (COALESCE(s.current_streak, 0) * 15) + 450 WHEN COALESCE(s.current_streak, 0) >= 7 THEN (COALESCE(s.current_streak, 0) * 15) + 150 ELSE COALESCE(s.current_streak, 0) * 15 END)::integer as streak_pts,
      COALESCE(s.current_streak, 0)::integer as cur_streak,
      (SELECT COUNT(*) * 30 FROM manual_chapter_progress mcp WHERE mcp.user_id = p.user_id AND mcp.completed_at >= v_current_week_start)::integer as manual_pts,
      ((SELECT COUNT(*) FROM weekly_one_on_ones_rookie w1 WHERE w1.rookie_user_id = p.user_id AND w1.created_at >= v_current_week_start) + (SELECT COUNT(*) FROM weekly_one_on_ones_manager w2 WHERE w2.manager_user_id = p.user_id AND w2.created_at >= v_current_week_start))::integer * 50 as oo_pts,
      COALESCE(lp_stored.training_points, 0)::integer as stored_training_pts
    FROM profiles p
    LEFT JOIN teams t ON t.id = p.team_id
    LEFT JOIN daily_login_streaks s ON s.user_id = p.user_id
    LEFT JOIN leaderboard_points lp_stored ON lp_stored.user_id = p.user_id AND lp_stored.week_start = v_current_week_start
    LEFT JOIN weekly_time wt ON wt.user_id = p.user_id
    WHERE p.status = 'active' AND p.approved = true
  )
  SELECT us.user_id, us.full_name, us.nickname, us.avatar_url, us.team_name,
    (us.base_hours + us.threshold_bonus + us.lesson_pts + us.video_pts + us.streak_pts + us.manual_pts + us.oo_pts)::integer as total_points,
    us.stored_training_pts as training_points, us.cur_streak as current_streak,
    us.lesson_cnt as lessons_completed, us.video_cnt as videos_watched,
    us.twm as time_this_week_minutes,
    ROW_NUMBER() OVER (ORDER BY (us.base_hours + us.threshold_bonus + us.lesson_pts + us.video_pts + us.streak_pts + us.manual_pts + us.oo_pts) DESC, us.lesson_pts DESC, us.full_name ASC)::bigint as rank,
    us.base_hours as hours_points, us.threshold_bonus, us.lesson_pts as lesson_points,
    us.video_pts as video_points, us.streak_pts as streak_points,
    us.manual_pts as manual_points, us.oo_pts as one_on_one_points
  FROM user_stats us;
END;
$$;

-- Fix 3: Sync profiles.time_this_week_minutes to match daily_training_time for current users
-- Also fix record_daily_time to manage week resets properly
CREATE OR REPLACE FUNCTION public.record_daily_time(_user_id uuid, _category text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today DATE := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _week_start DATE := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
  _current_week_total INTEGER;
BEGIN
  -- Upsert daily training time row
  INSERT INTO public.daily_training_time (user_id, date, total_minutes, training_minutes, video_minutes, lesson_minutes)
  VALUES (_user_id, _today, 1, 
    CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_minutes = daily_training_time.total_minutes + 1,
    training_minutes = daily_training_time.training_minutes + CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    video_minutes = daily_training_time.video_minutes + CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    lesson_minutes = daily_training_time.lesson_minutes + CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END,
    updated_at = now();

  -- Recalculate weekly total from daily_training_time (single source of truth)
  SELECT COALESCE(SUM(total_minutes), 0) INTO _current_week_total
  FROM daily_training_time
  WHERE user_id = _user_id AND date >= _week_start;

  -- Sync profiles.time_this_week_minutes to match
  UPDATE public.profiles
  SET time_this_week_minutes = _current_week_total,
      week_start = _week_start,
      updated_at = now()
  WHERE profiles.user_id = _user_id;
END;
$$;
