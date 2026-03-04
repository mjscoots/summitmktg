
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
  WITH active_users AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url, t.name as team_name
    FROM profiles p
    LEFT JOIN teams t ON t.id = p.team_id
    WHERE p.status = 'active' AND p.approved = true
  ),
  -- Hours logged: floor(total_hours) * 40
  hours_pts AS (
    SELECT dtt.user_id, FLOOR(SUM(dtt.total_minutes) / 60.0)::integer * 40 as pts
    FROM daily_training_time dtt
    GROUP BY dtt.user_id
  ),
  -- Weekly threshold bonuses: per-week 210m=500, 315m=1000, 420m=1500 (non-cumulative, best tier only)
  threshold_pts AS (
    SELECT sub.user_id, SUM(sub.bonus)::integer as pts
    FROM (
      SELECT dtt.user_id,
        CASE
          WHEN SUM(dtt.total_minutes) >= 420 THEN 1500
          WHEN SUM(dtt.total_minutes) >= 315 THEN 1000
          WHEN SUM(dtt.total_minutes) >= 210 THEN 500
          ELSE 0
        END as bonus
      FROM daily_training_time dtt
      GROUP BY dtt.user_id, date_trunc('week', dtt.date)
    ) sub
    GROUP BY sub.user_id
  ),
  -- Lessons: count * 100
  lesson_pts AS (
    SELECT lp.user_id, (COUNT(*) * 100)::integer as pts
    FROM lesson_progress lp
    WHERE lp.completed_at IS NOT NULL
    GROUP BY lp.user_id
  ),
  -- Videos watched (from watch log, includes rewatches): count * 40
  video_pts AS (
    SELECT vwl.user_id, (COUNT(*) * 40)::integer as pts
    FROM video_watch_log vwl
    GROUP BY vwl.user_id
  ),
  -- Streak points (current streak with milestone bonuses)
  streak_data AS (
    SELECT dls.user_id, dls.current_streak,
      CASE
        WHEN dls.current_streak >= 30 THEN (dls.current_streak * 15) + 1950
        WHEN dls.current_streak >= 21 THEN (dls.current_streak * 15) + 950
        WHEN dls.current_streak >= 14 THEN (dls.current_streak * 15) + 450
        WHEN dls.current_streak >= 7  THEN (dls.current_streak * 15) + 150
        ELSE dls.current_streak * 15
      END as pts
    FROM daily_login_streaks dls
  ),
  -- Manual chapters: count * 30
  manual_pts AS (
    SELECT mcp.user_id, (COUNT(*) * 30)::integer as pts
    FROM manual_chapter_progress mcp
    GROUP BY mcp.user_id
  ),
  -- 1:1 completions: count * 50 (both sides)
  oo_pts AS (
    SELECT sub.user_id, (SUM(sub.cnt) * 50)::integer as pts
    FROM (
      SELECT w.rookie_user_id as user_id, COUNT(*) as cnt FROM weekly_one_on_ones_rookie w GROUP BY w.rookie_user_id
      UNION ALL
      SELECT w.manager_user_id as user_id, COUNT(*) as cnt FROM weekly_one_on_ones_manager w GROUP BY w.manager_user_id
    ) sub
    GROUP BY sub.user_id
  ),
  scored AS (
    SELECT
      au.user_id, au.full_name, au.nickname, au.avatar_url, au.team_name,
      (
        COALESCE(hp.pts, 0) + COALESCE(tp.pts, 0) + COALESCE(lp.pts, 0) +
        COALESCE(vp.pts, 0) + COALESCE(sd.pts, 0)::integer + COALESCE(mp.pts, 0) +
        COALESCE(op.pts, 0)
      )::integer as total_pts,
      COALESCE(sd.current_streak, 0)::integer as cur_streak
    FROM active_users au
    LEFT JOIN hours_pts hp ON hp.user_id = au.user_id
    LEFT JOIN threshold_pts tp ON tp.user_id = au.user_id
    LEFT JOIN lesson_pts lp ON lp.user_id = au.user_id
    LEFT JOIN video_pts vp ON vp.user_id = au.user_id
    LEFT JOIN streak_data sd ON sd.user_id = au.user_id
    LEFT JOIN manual_pts mp ON mp.user_id = au.user_id
    LEFT JOIN oo_pts op ON op.user_id = au.user_id
  )
  SELECT s.user_id, s.full_name, s.nickname, s.avatar_url, s.team_name,
    s.total_pts as cumulative_points,
    s.cur_streak as current_streak
  FROM scored s
  WHERE s.total_pts > 0
  ORDER BY s.total_pts DESC, s.full_name ASC
  LIMIT _limit;
END;
$$;

-- Also keep cumulative_points in sync by updating recalculate function
-- and ensure it writes to profiles for other uses
CREATE OR REPLACE FUNCTION public.recalculate_all_time_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user record;
  v_total_pts INTEGER;
  v_hours_pts INTEGER;
  v_threshold_pts INTEGER;
  v_lesson_pts INTEGER;
  v_video_pts INTEGER;
  v_streak_pts INTEGER;
  v_manual_pts INTEGER;
  v_oo_pts INTEGER;
BEGIN
  FOR v_user IN
    SELECT user_id FROM profiles WHERE status = 'active' AND approved = true
  LOOP
    SELECT COALESCE(FLOOR(SUM(total_minutes) / 60.0) * 40, 0)::integer
    INTO v_hours_pts FROM daily_training_time WHERE user_id = v_user.user_id;

    SELECT COALESCE(SUM(CASE WHEN week_mins >= 420 THEN 1500 WHEN week_mins >= 315 THEN 1000 WHEN week_mins >= 210 THEN 500 ELSE 0 END), 0)::integer
    INTO v_threshold_pts FROM (SELECT SUM(total_minutes) as week_mins FROM daily_training_time WHERE user_id = v_user.user_id GROUP BY date_trunc('week', date)) weeks;

    SELECT COALESCE(COUNT(*) * 100, 0)::integer INTO v_lesson_pts FROM lesson_progress WHERE user_id = v_user.user_id AND completed_at IS NOT NULL;

    SELECT COALESCE(COUNT(*) * 40, 0)::integer INTO v_video_pts FROM video_watch_log WHERE user_id = v_user.user_id;

    SELECT COALESCE(CASE WHEN current_streak >= 30 THEN (current_streak * 15) + 1950 WHEN current_streak >= 21 THEN (current_streak * 15) + 950 WHEN current_streak >= 14 THEN (current_streak * 15) + 450 WHEN current_streak >= 7 THEN (current_streak * 15) + 150 ELSE current_streak * 15 END, 0)::integer
    INTO v_streak_pts FROM daily_login_streaks WHERE user_id = v_user.user_id;
    IF v_streak_pts IS NULL THEN v_streak_pts := 0; END IF;

    SELECT COALESCE(COUNT(*) * 30, 0)::integer INTO v_manual_pts FROM manual_chapter_progress WHERE user_id = v_user.user_id;

    SELECT (
      COALESCE((SELECT COUNT(*) FROM weekly_one_on_ones_rookie WHERE rookie_user_id = v_user.user_id), 0) +
      COALESCE((SELECT COUNT(*) FROM weekly_one_on_ones_manager WHERE manager_user_id = v_user.user_id), 0)
    )::integer * 50
    INTO v_oo_pts;

    v_total_pts := COALESCE(v_hours_pts,0) + COALESCE(v_threshold_pts,0) + COALESCE(v_lesson_pts,0) + COALESCE(v_video_pts,0) + COALESCE(v_streak_pts,0) + COALESCE(v_manual_pts,0) + COALESCE(v_oo_pts,0);

    UPDATE profiles SET cumulative_points = v_total_pts WHERE user_id = v_user.user_id;
  END LOOP;
END;
$$;
