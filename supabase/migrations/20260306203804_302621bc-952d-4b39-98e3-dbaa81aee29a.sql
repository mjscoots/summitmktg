
-- Update award_points_v2: chat cap 600→400, manual cap 470→300
CREATE OR REPLACE FUNCTION public.award_points_v2(_user_id uuid, _category text, _points integer, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _current integer; _max_cap integer; _actual integer;
BEGIN
  _max_cap := CASE _category
    WHEN 'hours' THEN 600 WHEN 'chat' THEN 400 WHEN 'lesson' THEN 300
    WHEN 'video' THEN 200 WHEN 'manual' THEN 300
    WHEN 'reaction_received' THEN 100 WHEN 'reaction_given' THEN 50
    ELSE NULL END;
  INSERT INTO daily_point_caps (user_id, date) VALUES (_user_id, _today) ON CONFLICT (user_id, date) DO NOTHING;
  IF _max_cap IS NOT NULL THEN
    SELECT CASE _category
      WHEN 'hours' THEN dpc.hours_points WHEN 'chat' THEN dpc.chat_points
      WHEN 'lesson' THEN dpc.lesson_points WHEN 'video' THEN dpc.video_points
      WHEN 'manual' THEN dpc.manual_points
      WHEN 'reaction_received' THEN dpc.reaction_received_points
      WHEN 'reaction_given' THEN dpc.reaction_given_points END
    INTO _current FROM daily_point_caps dpc WHERE dpc.user_id = _user_id AND dpc.date = _today;
    _actual := LEAST(_points, GREATEST(0, _max_cap - COALESCE(_current, 0)));
    IF _actual <= 0 THEN RETURN 0; END IF;
    UPDATE daily_point_caps SET
      hours_points = CASE WHEN _category='hours' THEN hours_points+_actual ELSE hours_points END,
      chat_points = CASE WHEN _category='chat' THEN chat_points+_actual ELSE chat_points END,
      lesson_points = CASE WHEN _category='lesson' THEN lesson_points+_actual ELSE lesson_points END,
      video_points = CASE WHEN _category='video' THEN video_points+_actual ELSE video_points END,
      manual_points = CASE WHEN _category='manual' THEN manual_points+_actual ELSE manual_points END,
      reaction_received_points = CASE WHEN _category='reaction_received' THEN reaction_received_points+_actual ELSE reaction_received_points END,
      reaction_given_points = CASE WHEN _category='reaction_given' THEN reaction_given_points+_actual ELSE reaction_given_points END
    WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  ELSE
    _actual := _points;
  END IF;
  INSERT INTO point_events (user_id, category, points, metadata) VALUES (_user_id, _category, _actual, _metadata);
  RETURN _actual;
END; $function$;

-- Update award_chat_message_points: 20→15 pts, hourly cap 13 msgs (≈200 pts/hr)
CREATE OR REPLACE FUNCTION public.award_chat_message_points(_user_id uuid, _content text, _message_id text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _now timestamptz := now();
  _msg_count integer; _hour_start timestamptz;
BEGIN
  IF length(trim(_content)) < 10 THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM point_events WHERE user_id = _user_id AND category = 'chat'
    AND metadata->>'content_hash' = md5(_content) AND created_at > _now - interval '5 minutes') THEN RETURN 0; END IF;
  INSERT INTO daily_point_caps (user_id, date) VALUES (_user_id, _today) ON CONFLICT (user_id, date) DO NOTHING;
  SELECT chat_messages_counted_this_hour, chat_hour_window_start INTO _msg_count, _hour_start
  FROM daily_point_caps WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  IF _hour_start IS NULL OR _now - _hour_start > interval '1 hour' THEN
    UPDATE daily_point_caps SET chat_messages_counted_this_hour = 0, chat_hour_window_start = _now
    WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
    _msg_count := 0;
  END IF;
  IF COALESCE(_msg_count, 0) >= 13 THEN RETURN 0; END IF;
  UPDATE daily_point_caps SET chat_messages_counted_this_hour = COALESCE(chat_messages_counted_this_hour, 0) + 1
  WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  RETURN public.award_points_v2(_user_id, 'chat', 15, jsonb_build_object('content_hash', md5(_content), 'message_id', _message_id));
END; $function$;

-- Update award_quiz_bonus_points: 80%→+20, 90%→+40, 100%→+75
CREATE OR REPLACE FUNCTION public.award_quiz_bonus_points(_user_id uuid, _lesson_id uuid, _score integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _pts integer := 0;
BEGIN
  IF _score >= 100 THEN _pts := 75;
  ELSIF _score >= 90 THEN _pts := 40;
  ELSIF _score >= 80 THEN _pts := 20; END IF;
  IF _pts = 0 THEN RETURN 0; END IF;
  RETURN public.award_points_v2(_user_id, 'quiz_bonus', _pts, jsonb_build_object('lesson_id', _lesson_id, 'score', _score));
END; $function$;

-- Update get_my_points_breakdown: hours 100→120/hr, chat cap 400, manual cap 300
CREATE OR REPLACE FUNCTION public.get_my_points_breakdown(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _week_start date := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
  _cutover date := '2026-03-05';
  _caps record; _streak record;
  _time_today integer; _time_week integer;
  _weekly_events jsonb; _weekly_hours integer; _weekly_threshold integer;
  _alltime_hours integer; _alltime_threshold integer; _alltime_events integer;
  _legacy integer;
BEGIN
  SELECT * INTO _caps FROM daily_point_caps WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  SELECT dls.current_streak, dls.longest_streak INTO _streak FROM daily_login_streaks dls WHERE dls.user_id = _user_id;
  SELECT COALESCE(SUM(total_minutes), 0) INTO _time_today FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date = _today;
  SELECT COALESCE(SUM(total_minutes), 0) INTO _time_week FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _week_start;
  SELECT COALESCE(SUM(LEAST(FLOOR(total_minutes / 60.0) * 120, 600)), 0)::integer INTO _weekly_hours FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _week_start;
  _weekly_threshold := CASE WHEN _time_week >= 900 THEN 2000 WHEN _time_week >= 600 THEN 1200 WHEN _time_week >= 300 THEN 500 ELSE 0 END;
  SELECT COALESCE(jsonb_object_agg(category, total), '{}') INTO _weekly_events FROM (
    SELECT pe.category, SUM(pe.points)::integer as total FROM point_events pe
    WHERE pe.user_id = _user_id AND pe.created_at >= (_week_start AT TIME ZONE 'America/Los_Angeles')
    GROUP BY pe.category
  ) sub;
  SELECT COALESCE(SUM(LEAST(FLOOR(total_minutes / 60.0) * 120, 600)), 0)::integer INTO _alltime_hours FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _cutover;
  SELECT COALESCE(SUM(sub.bonus), 0)::integer INTO _alltime_threshold FROM (
    SELECT CASE WHEN SUM(total_minutes) >= 900 THEN 2000 WHEN SUM(total_minutes) >= 600 THEN 1200 WHEN SUM(total_minutes) >= 300 THEN 500 ELSE 0 END as bonus
    FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _cutover GROUP BY date_trunc('week', daily_training_time.date)
  ) sub;
  SELECT COALESCE(SUM(points), 0)::integer INTO _alltime_events FROM point_events WHERE point_events.user_id = _user_id;
  SELECT COALESCE(legacy_points_snapshot, 0) INTO _legacy FROM profiles WHERE profiles.user_id = _user_id;

  RETURN jsonb_build_object(
    'weekly_events', _weekly_events,
    'weekly_hours_points', _weekly_hours,
    'weekly_threshold_bonus', _weekly_threshold,
    'weekly_total', _weekly_hours + _weekly_threshold + COALESCE((SELECT SUM(value::integer) FROM jsonb_each_text(_weekly_events)), 0)::integer,
    'all_time_total', _legacy + _alltime_hours + _alltime_threshold + _alltime_events,
    'legacy_points', _legacy,
    'caps_today', jsonb_build_object(
      'hours', jsonb_build_object('earned', LEAST(FLOOR(_time_today / 60.0) * 120, 600)::integer, 'max', 600),
      'chat', jsonb_build_object('earned', COALESCE(_caps.chat_points, 0), 'max', 400),
      'lesson', jsonb_build_object('earned', COALESCE(_caps.lesson_points, 0), 'max', 300),
      'video', jsonb_build_object('earned', COALESCE(_caps.video_points, 0), 'max', 200),
      'manual', jsonb_build_object('earned', COALESCE(_caps.manual_points, 0), 'max', 300)
    ),
    'time_today_minutes', _time_today,
    'time_week_minutes', _time_week,
    'current_streak', COALESCE(_streak.current_streak, 0),
    'longest_streak', COALESCE(_streak.longest_streak, 0),
    'next_threshold', jsonb_build_object(
      'target_minutes', CASE WHEN _time_week < 300 THEN 300 WHEN _time_week < 600 THEN 600 WHEN _time_week < 900 THEN 900 ELSE NULL END,
      'bonus', CASE WHEN _time_week < 300 THEN 500 WHEN _time_week < 600 THEN 1200 WHEN _time_week < 900 THEN 2000 ELSE 0 END,
      'remaining_minutes', CASE WHEN _time_week < 300 THEN 300 - _time_week WHEN _time_week < 600 THEN 600 - _time_week WHEN _time_week < 900 THEN 900 - _time_week ELSE 0 END
    )
  );
END; $function$;

-- Update get_current_leaderboard: hours 100→120/hr
CREATE OR REPLACE FUNCTION public.get_current_leaderboard()
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, team_name text, total_points integer, hours_points integer, threshold_bonus integer, login_points integer, streak_points integer, chat_points integer, lesson_points integer, video_points integer, manual_points integer, reaction_points integer, one_on_one_points integer, time_this_week_minutes integer, current_streak integer, rank bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ws date := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
BEGIN
  RETURN QUERY
  WITH hrs AS (
    SELECT dtt.user_id, SUM(LEAST(FLOOR(dtt.total_minutes / 60.0) * 120, 600))::integer as pts,
      SUM(dtt.total_minutes)::integer as mins
    FROM daily_training_time dtt WHERE dtt.date >= v_ws GROUP BY dtt.user_id
  ),
  thr AS (
    SELECT h.user_id, (CASE WHEN h.mins >= 900 THEN 2000 WHEN h.mins >= 600 THEN 1200 WHEN h.mins >= 300 THEN 500 ELSE 0 END)::integer as pts
    FROM hrs h
  ),
  pe AS (
    SELECT pe2.user_id,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'daily_login'), 0)::integer as login_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'streak'), 0)::integer as streak_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'chat'), 0)::integer as chat_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category IN ('lesson','quiz_bonus')), 0)::integer as lesson_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'video'), 0)::integer as video_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'manual'), 0)::integer as manual_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category IN ('reaction_received','reaction_given')), 0)::integer as reaction_pts,
      COALESCE(SUM(pe2.points) FILTER (WHERE pe2.category = 'one_on_one'), 0)::integer as oo_pts
    FROM point_events pe2
    WHERE pe2.created_at >= (v_ws AT TIME ZONE 'America/Los_Angeles')
    GROUP BY pe2.user_id
  ),
  stk AS (SELECT dls.user_id, dls.current_streak FROM daily_login_streaks dls),
  scored AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url, t.name as team_name,
      COALESCE(h.pts, 0) as h_pts, COALESCE(th.pts, 0) as th_pts,
      COALESCE(pv.login_pts, 0) as lo_pts, COALESCE(pv.streak_pts, 0) as st_pts,
      COALESCE(pv.chat_pts, 0) as ch_pts, COALESCE(pv.lesson_pts, 0) as le_pts,
      COALESCE(pv.video_pts, 0) as vi_pts, COALESCE(pv.manual_pts, 0) as ma_pts,
      COALESCE(pv.reaction_pts, 0) as re_pts, COALESCE(pv.oo_pts, 0) as oo_pts,
      COALESCE(h.mins, 0) as twm, COALESCE(s.current_streak, 0) as cs,
      (COALESCE(h.pts,0)+COALESCE(th.pts,0)+COALESCE(pv.login_pts,0)+COALESCE(pv.streak_pts,0)+
       COALESCE(pv.chat_pts,0)+COALESCE(pv.lesson_pts,0)+COALESCE(pv.video_pts,0)+
       COALESCE(pv.manual_pts,0)+COALESCE(pv.reaction_pts,0)+COALESCE(pv.oo_pts,0))::integer as total
    FROM profiles p
    LEFT JOIN teams t ON t.id = p.team_id
    LEFT JOIN hrs h ON h.user_id = p.user_id
    LEFT JOIN thr th ON th.user_id = p.user_id
    LEFT JOIN pe pv ON pv.user_id = p.user_id
    LEFT JOIN stk s ON s.user_id = p.user_id
    WHERE p.status = 'active' AND p.approved = true
  )
  SELECT sc.user_id, sc.full_name, sc.nickname, sc.avatar_url, sc.team_name,
    sc.total as total_points, sc.h_pts as hours_points, sc.th_pts as threshold_bonus,
    sc.lo_pts as login_points, sc.st_pts as streak_points, sc.ch_pts as chat_points,
    sc.le_pts as lesson_points, sc.vi_pts as video_points, sc.ma_pts as manual_points,
    sc.re_pts as reaction_points, sc.oo_pts as one_on_one_points,
    sc.twm as time_this_week_minutes, sc.cs as current_streak,
    ROW_NUMBER() OVER (ORDER BY sc.total DESC, sc.full_name ASC)::bigint as rank
  FROM scored sc WHERE sc.total > 0;
END; $function$;

-- Update get_all_time_leaderboard: hours 100→120/hr
CREATE OR REPLACE FUNCTION public.get_all_time_leaderboard(_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, team_name text, total_points integer, current_streak integer, legacy_points integer, new_hours_points integer, new_event_points integer, login_points integer, streak_points integer, chat_points integer, lesson_points integer, video_points integer, manual_points integer, reaction_points integer, one_on_one_points integer, threshold_bonus integer, total_time_minutes integer, lessons_completed bigint, videos_watched bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cutover date := '2026-03-05';
BEGIN
  RETURN QUERY
  WITH au AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url, t.name as team_name,
      COALESCE(p.legacy_points_snapshot, 0) as leg
    FROM profiles p LEFT JOIN teams t ON t.id = p.team_id
    WHERE p.status = 'active' AND p.approved = true
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
END; $function$;
