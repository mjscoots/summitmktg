-- Update get_downline_from_edges to exclude non-approved (non-in-app) users
CREATE OR REPLACE FUNCTION public.get_downline_from_edges(_manager_user_id uuid)
 RETURNS TABLE(profile_id uuid, user_id uuid, full_name text, email text, avatar_url text, role app_role, direct_manager text, team_name text, status user_status, last_active_at timestamp with time zone, is_active_now boolean, time_this_week_minutes integer, depth integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline AS (
    SELECT e.child_user_id AS uid, 1 AS lvl
    FROM downline_edges e
    WHERE e.parent_user_id = _manager_user_id AND e.edge_type = 'manages'
    UNION ALL
    SELECT e.child_user_id AS uid, d.lvl + 1 AS lvl
    FROM downline_edges e
    INNER JOIN downline d ON e.parent_user_id = d.uid
    WHERE e.edge_type = 'manages' AND d.lvl < 10
  )
  SELECT
    p.id AS profile_id, p.user_id, p.full_name, p.email, p.avatar_url,
    COALESCE(get_user_role(p.user_id), 'rookie') AS role,
    p.direct_manager, t.name AS team_name, p.status, p.last_active_at, p.is_active_now,
    COALESCE(p.time_this_week_minutes, 0) AS time_this_week_minutes, dl.lvl AS depth
  FROM downline dl
  INNER JOIN profiles p ON p.user_id = dl.uid
  LEFT JOIN teams t ON p.team_id = t.id
  WHERE p.status <> 'nlc'
    AND (p.approved = true OR get_user_role(p.user_id) IN ('manager', 'admin', 'owner'))
  ORDER BY dl.lvl, p.full_name;
END;
$function$;

-- Update get_all_time_leaderboard to only include approved (in-app) users
CREATE OR REPLACE FUNCTION public.get_all_time_leaderboard(_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, team_name text, total_points bigint, current_streak integer, legacy_points bigint, new_hours_points bigint, new_event_points bigint, login_points bigint, streak_points bigint, chat_points bigint, lesson_points bigint, video_points bigint, manual_points bigint, reaction_points bigint, one_on_one_points bigint, threshold_bonus bigint, total_time_minutes bigint, lessons_completed bigint, videos_watched bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cutover date := '2026-03-05';
BEGIN
  RETURN QUERY
  WITH au AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url, t.name as team_name,
      COALESCE(p.legacy_points_snapshot, 0)::bigint as leg
    FROM profiles p LEFT JOIN teams t ON t.id = p.team_id
    WHERE p.status = 'active' AND p.approved = true
  ),
  hp AS (
    SELECT dtt.user_id, SUM(LEAST(FLOOR(dtt.total_minutes / 60.0) * 120, 600))::bigint as pts,
      SUM(dtt.total_minutes)::bigint as total_mins
    FROM daily_training_time dtt WHERE dtt.date >= v_cutover GROUP BY dtt.user_id
  ),
  tp AS (
    SELECT sub.user_id, SUM(sub.bonus)::bigint as pts FROM (
      SELECT dtt.user_id, CASE WHEN SUM(dtt.total_minutes) >= 900 THEN 2000
        WHEN SUM(dtt.total_minutes) >= 600 THEN 1200 WHEN SUM(dtt.total_minutes) >= 300 THEN 500 ELSE 0 END as bonus
      FROM daily_training_time dtt WHERE dtt.date >= v_cutover GROUP BY dtt.user_id, date_trunc('week', dtt.date)
    ) sub GROUP BY sub.user_id
  ),
  ep AS (
    SELECT pe2.user_id, SUM(pe2.points)::bigint as pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'daily_login'), 0)::bigint as login_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'streak'), 0)::bigint as streak_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'chat'), 0)::bigint as chat_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category IN ('lesson','quiz_bonus')), 0)::bigint as lesson_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'video'), 0)::bigint as video_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'manual'), 0)::bigint as manual_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category IN ('reaction_received','reaction_given')), 0)::bigint as reaction_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'one_on_one'), 0)::bigint as oo_pts
    FROM point_events pe2 GROUP BY pe2.user_id
  ),
  stk AS (SELECT dls.user_id, dls.current_streak FROM daily_login_streaks dls),
  lc AS (SELECT lp.user_id, COUNT(*)::bigint as cnt FROM lesson_progress lp WHERE lp.completed_at IS NOT NULL GROUP BY lp.user_id),
  vw AS (SELECT vp.user_id, COUNT(*)::bigint as cnt FROM video_progress vp WHERE vp.watched = true GROUP BY vp.user_id),
  scored AS (
    SELECT a.user_id, a.full_name, a.nickname, a.avatar_url, a.team_name,
      (a.leg + COALESCE(h.pts,0) + COALESCE(t2.pts,0) + COALESCE(e.pts,0))::bigint as total,
      COALESCE(s.current_streak, 0)::integer as streak,
      a.leg as leg_pts, COALESCE(h.pts,0)::bigint as h_pts, COALESCE(e.pts,0)::bigint as e_pts,
      COALESCE(e.login_pts, 0)::bigint as lo_pts, COALESCE(e.streak_pts, 0)::bigint as st_pts,
      COALESCE(e.chat_pts, 0)::bigint as ch_pts, COALESCE(e.lesson_pts, 0)::bigint as le_pts,
      COALESCE(e.video_pts, 0)::bigint as vi_pts, COALESCE(e.manual_pts, 0)::bigint as ma_pts,
      COALESCE(e.reaction_pts, 0)::bigint as re_pts, COALESCE(e.oo_pts, 0)::bigint as oo_pts,
      COALESCE(t2.pts, 0)::bigint as thr_pts,
      COALESCE(h.total_mins, 0)::bigint as t_mins,
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
$function$;

-- Update get_streak_leaderboard to only include approved (in-app) users  
CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(_limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, current_streak integer, longest_streak integer, total_days_active integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH active_profiles AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url
    FROM profiles p
    WHERE p.status <> 'nlc' AND p.approved = true
  )
  SELECT ap.user_id, ap.full_name, ap.nickname, ap.avatar_url,
    dls.current_streak::integer, dls.longest_streak::integer, dls.total_days_active::integer
  FROM active_profiles ap
  JOIN daily_login_streaks dls ON ap.user_id = dls.user_id
  WHERE dls.current_streak > 0
  ORDER BY dls.current_streak DESC
  LIMIT _limit;
END;
$function$;