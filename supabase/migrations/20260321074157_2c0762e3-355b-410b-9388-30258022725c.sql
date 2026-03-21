
-- Fix all-time leaderboard: include users with approved IS NULL (imported users)
CREATE OR REPLACE FUNCTION public.get_all_time_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, team_name text, total_points integer, current_streak integer, legacy_points integer, new_hours_points integer, new_event_points integer, login_points integer, streak_points integer, chat_points integer, lesson_points integer, video_points integer, manual_points integer, reaction_points integer, one_on_one_points integer, threshold_bonus integer, total_time_minutes integer, lessons_completed bigint, videos_watched bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cutover date := '2026-03-05';
BEGIN
  RETURN QUERY
  WITH au AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url, t.name as team_name,
      COALESCE(p.legacy_points_snapshot, 0) as leg
    FROM profiles p LEFT JOIN teams t ON t.id = p.team_id
    WHERE p.status = 'active' AND (p.approved = true OR p.approved IS NULL)
  ),
  hp AS (
    SELECT dtt.user_id, SUM(LEAST(FLOOR(dtt.total_minutes / 60.0) * 120, 600))::integer as pts,
      SUM(dtt.total_minutes)::integer as total_mins
    FROM daily_training_time dtt WHERE dtt.date >= v_cutover GROUP BY dtt.user_id
  ),
  tp AS (
    SELECT sub.user_id, SUM(sub.bonus)::integer as pts FROM (
      SELECT dtt.user_id, CASE WHEN SUM(dtt.total_minutes) >= 900 THEN 2000
        WHEN SUM(dtt.total_minutes) >= 600 THEN 1200 WHEN SUM(dtt.total_minutes) >= 300 THEN 500 ELSE 0 END as bonus
      FROM daily_training_time dtt WHERE dtt.date >= v_cutover GROUP BY dtt.user_id, date_trunc('week', dtt.date)
    ) sub GROUP BY sub.user_id
  ),
  ep AS (
    SELECT pe2.user_id,
      SUM(pe2.points)::integer as pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'daily_login'), 0)::integer as login_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'streak'), 0)::integer as streak_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'chat'), 0)::integer as chat_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category IN ('lesson','quiz_bonus')), 0)::integer as lesson_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'video'), 0)::integer as video_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'manual'), 0)::integer as manual_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category IN ('reaction_received','reaction_given')), 0)::integer as reaction_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'one_on_one'), 0)::integer as oo_pts
    FROM point_events pe2 GROUP BY pe2.user_id
  ),
  stk AS (SELECT dls.user_id, dls.current_streak FROM daily_login_streaks dls),
  lc AS (SELECT lp.user_id, COUNT(*)::bigint as cnt FROM lesson_progress lp WHERE lp.completed_at IS NOT NULL GROUP BY lp.user_id),
  vw AS (SELECT vp.user_id, COUNT(*)::bigint as cnt FROM video_progress vp WHERE vp.watched = true GROUP BY vp.user_id),
  scored AS (
    SELECT a.user_id, a.full_name, a.nickname, a.avatar_url, a.team_name,
      (a.leg + COALESCE(h.pts,0) + COALESCE(t2.pts,0) + COALESCE(e.pts,0))::integer as total,
      COALESCE(s.current_streak, 0)::integer as streak,
      a.leg as leg_pts, COALESCE(h.pts,0) as h_pts, COALESCE(e.pts,0) as e_pts,
      COALESCE(e.login_pts, 0) as lo_pts, COALESCE(e.streak_pts, 0) as st_pts,
      COALESCE(e.chat_pts, 0) as ch_pts, COALESCE(e.lesson_pts, 0) as le_pts,
      COALESCE(e.video_pts, 0) as vi_pts, COALESCE(e.manual_pts, 0) as ma_pts,
      COALESCE(e.reaction_pts, 0) as re_pts, COALESCE(e.oo_pts, 0) as oo_pts,
      COALESCE(t2.pts, 0) as thr_pts,
      COALESCE(h.total_mins, 0) as t_mins,
      COALESCE(l.cnt, 0) as l_cnt, COALESCE(v.cnt, 0) as v_cnt
    FROM au a LEFT JOIN hp h ON h.user_id = a.user_id LEFT JOIN tp t2 ON t2.user_id = a.user_id
    LEFT JOIN ep e ON e.user_id = a.user_id LEFT JOIN stk s ON s.user_id = a.user_id
    LEFT JOIN lc l ON l.user_id = a.user_id LEFT JOIN vw v ON v.user_id = a.user_id
  )
  SELECT sc.user_id, sc.full_name, sc.nickname, sc.avatar_url, sc.team_name,
    sc.total as total_points, sc.streak as current_streak,
    sc.leg_pts as legacy_points, sc.h_pts as new_hours_points, sc.e_pts as new_event_points,
    sc.lo_pts as login_points, sc.st_pts as streak_points, sc.ch_pts as chat_points,
    sc.le_pts as lesson_points, sc.vi_pts as video_points, sc.ma_pts as manual_points,
    sc.re_pts as reaction_points, sc.oo_pts as one_on_one_points, sc.thr_pts as threshold_bonus,
    sc.t_mins as total_time_minutes, sc.l_cnt as lessons_completed, sc.v_cnt as videos_watched
  FROM scored sc WHERE sc.total > 0
  ORDER BY sc.total DESC, sc.full_name ASC LIMIT _limit;
END;
$$;
