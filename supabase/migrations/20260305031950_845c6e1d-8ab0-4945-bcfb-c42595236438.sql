
-- ==========================================
-- REVISED POINT ECONOMY (v2) — 2026-03-05
-- ==========================================

-- 1. Snapshot legacy points
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legacy_points_snapshot integer DEFAULT 0;
UPDATE profiles SET legacy_points_snapshot = COALESCE(cumulative_points, 0);

-- 2. Point events ledger
CREATE TABLE IF NOT EXISTS point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  points integer NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pe_user_created ON point_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pe_user_cat ON point_events(user_id, category, created_at);

-- 3. Daily point caps
CREATE TABLE IF NOT EXISTS daily_point_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  hours_points integer DEFAULT 0,
  chat_points integer DEFAULT 0,
  lesson_points integer DEFAULT 0,
  video_points integer DEFAULT 0,
  manual_points integer DEFAULT 0,
  reaction_received_points integer DEFAULT 0,
  reaction_given_points integer DEFAULT 0,
  lessons_completed_today integer DEFAULT 0,
  chat_messages_counted_this_hour integer DEFAULT 0,
  chat_hour_window_start timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 4. RLS
ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_point_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pe_select_own" ON point_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dpc_select_own" ON daily_point_caps FOR SELECT USING (auth.uid() = user_id);

-- 5. Core award function with cap enforcement
CREATE OR REPLACE FUNCTION public.award_points_v2(
  _user_id uuid, _category text, _points integer, _metadata jsonb DEFAULT '{}'
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _current integer; _max_cap integer; _actual integer;
BEGIN
  _max_cap := CASE _category
    WHEN 'hours' THEN 600 WHEN 'chat' THEN 600 WHEN 'lesson' THEN 300
    WHEN 'video' THEN 200 WHEN 'manual' THEN 470
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
END; $$;

-- 6. Chat message points with anti-spam
CREATE OR REPLACE FUNCTION public.award_chat_message_points(_user_id uuid, _content text, _message_id text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  IF COALESCE(_msg_count, 0) >= 10 THEN RETURN 0; END IF;
  UPDATE daily_point_caps SET chat_messages_counted_this_hour = COALESCE(chat_messages_counted_this_hour, 0) + 1
  WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  RETURN public.award_points_v2(_user_id, 'chat', 20, jsonb_build_object('content_hash', md5(_content), 'message_id', _message_id));
END; $$;

-- 7. Lesson completion with diminishing returns
CREATE OR REPLACE FUNCTION public.award_lesson_completion_points(_user_id uuid, _lesson_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _count integer; _pts integer;
BEGIN
  INSERT INTO daily_point_caps (user_id, date) VALUES (_user_id, _today) ON CONFLICT (user_id, date) DO NOTHING;
  SELECT COALESCE(lessons_completed_today, 0) INTO _count FROM daily_point_caps WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  IF _count < 3 THEN _pts := 60;
  ELSIF _count < 6 THEN _pts := 30;
  ELSE _pts := 10; END IF;
  UPDATE daily_point_caps SET lessons_completed_today = COALESCE(lessons_completed_today, 0) + 1
  WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  RETURN public.award_points_v2(_user_id, 'lesson', _pts, jsonb_build_object('lesson_id', _lesson_id));
END; $$;

-- 8. Quiz bonus points
CREATE OR REPLACE FUNCTION public.award_quiz_bonus_points(_user_id uuid, _lesson_id uuid, _score integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _pts integer := 0;
BEGIN
  IF _score >= 100 THEN _pts := 60;
  ELSIF _score >= 90 THEN _pts := 40;
  ELSIF _score >= 80 THEN _pts := 25; END IF;
  IF _pts = 0 THEN RETURN 0; END IF;
  RETURN public.award_points_v2(_user_id, 'quiz_bonus', _pts, jsonb_build_object('lesson_id', _lesson_id, 'score', _score));
END; $$;

-- 9. Reaction points
CREATE OR REPLACE FUNCTION public.award_reaction_points(_reactor_user_id uuid, _author_user_id uuid, _message_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _reactor_user_id = _author_user_id THEN RETURN; END IF;
  PERFORM public.award_points_v2(_reactor_user_id, 'reaction_given', 2, jsonb_build_object('message_id', _message_id));
  PERFORM public.award_points_v2(_author_user_id, 'reaction_received', 10, jsonb_build_object('message_id', _message_id));
END; $$;

-- 10. My points breakdown
CREATE OR REPLACE FUNCTION public.get_my_points_breakdown(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _week_start date := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
  _cutover date := '2026-03-05';
  _caps record; _streak record;
  _time_today integer; _time_week integer;
  _weekly_events jsonb; _weekly_hours integer; _weekly_threshold integer;
  _alltime_hours integer; _alltime_threshold integer; _alltime_events integer;
  _legacy integer; _weekly_rank integer;
BEGIN
  SELECT * INTO _caps FROM daily_point_caps WHERE daily_point_caps.user_id = _user_id AND daily_point_caps.date = _today;
  SELECT dls.current_streak, dls.longest_streak INTO _streak FROM daily_login_streaks dls WHERE dls.user_id = _user_id;
  SELECT COALESCE(SUM(total_minutes), 0) INTO _time_today FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date = _today;
  SELECT COALESCE(SUM(total_minutes), 0) INTO _time_week FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _week_start;
  SELECT COALESCE(SUM(LEAST(FLOOR(total_minutes / 60.0) * 100, 600)), 0)::integer INTO _weekly_hours FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _week_start;
  _weekly_threshold := CASE WHEN _time_week >= 900 THEN 2000 WHEN _time_week >= 600 THEN 1200 WHEN _time_week >= 300 THEN 500 ELSE 0 END;
  SELECT COALESCE(jsonb_object_agg(category, total), '{}') INTO _weekly_events FROM (
    SELECT pe.category, SUM(pe.points)::integer as total FROM point_events pe
    WHERE pe.user_id = _user_id AND pe.created_at >= (_week_start AT TIME ZONE 'America/Los_Angeles')
    GROUP BY pe.category
  ) sub;
  SELECT COALESCE(SUM(LEAST(FLOOR(total_minutes / 60.0) * 100, 600)), 0)::integer INTO _alltime_hours FROM daily_training_time WHERE daily_training_time.user_id = _user_id AND daily_training_time.date >= _cutover;
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
      'hours', jsonb_build_object('earned', LEAST(FLOOR(_time_today / 60.0) * 100, 600)::integer, 'max', 600),
      'chat', jsonb_build_object('earned', COALESCE(_caps.chat_points, 0), 'max', 600),
      'lesson', jsonb_build_object('earned', COALESCE(_caps.lesson_points, 0), 'max', 300),
      'video', jsonb_build_object('earned', COALESCE(_caps.video_points, 0), 'max', 200),
      'manual', jsonb_build_object('earned', COALESCE(_caps.manual_points, 0), 'max', 470)
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
END; $$;

-- 11. Drop old record_daily_login overloads and recreate
DROP FUNCTION IF EXISTS public.record_daily_login(uuid);
DROP FUNCTION IF EXISTS public.record_daily_login(uuid, text);

CREATE OR REPLACE FUNCTION public.record_daily_login(_user_id uuid, _timezone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rec daily_login_streaks%ROWTYPE;
  tz text; today date; yesterday date;
  old_streak integer; new_streak integer;
  login_pts integer := 75;
  streak_daily integer := 25;
  milestone_bonus integer := 0;
  milestone_hit text := null;
  had_qualifying boolean;
BEGIN
  IF _timezone IS NULL OR _timezone = '' THEN
    SELECT COALESCE(p.timezone, 'America/Los_Angeles') INTO tz FROM profiles p WHERE p.user_id = _user_id;
    tz := COALESCE(tz, 'America/Los_Angeles');
  ELSE tz := _timezone; END IF;
  today := (NOW() AT TIME ZONE tz)::date;
  yesterday := today - 1;
  SELECT * INTO rec FROM daily_login_streaks WHERE daily_login_streaks.user_id = _user_id;
  IF rec IS NULL THEN
    INSERT INTO daily_login_streaks (user_id, current_streak, longest_streak, last_login_date, total_days_active, streak_points_awarded)
    VALUES (_user_id, 1, 1, today, 1, login_pts + streak_daily) RETURNING * INTO rec;
    PERFORM award_points_v2(_user_id, 'daily_login', login_pts, '{}');
    PERFORM award_points_v2(_user_id, 'streak', streak_daily, jsonb_build_object('streak', 1));
    RETURN jsonb_build_object('current_streak', 1, 'longest_streak', 1, 'points_awarded', login_pts + streak_daily, 'milestone', null, 'already_recorded', false);
  END IF;
  IF rec.last_login_date = today THEN
    RETURN jsonb_build_object('current_streak', rec.current_streak, 'longest_streak', rec.longest_streak, 'points_awarded', 0, 'milestone', null, 'already_recorded', true);
  END IF;
  old_streak := rec.current_streak;
  SELECT EXISTS (
    SELECT 1 FROM daily_training_time dtt2 WHERE dtt2.user_id = _user_id AND dtt2.date = yesterday AND dtt2.total_minutes >= 20
    UNION ALL
    SELECT 1 FROM lesson_progress lp2 WHERE lp2.user_id = _user_id AND lp2.completed_at::date = yesterday
    UNION ALL
    SELECT 1 FROM lesson_progress lp3 WHERE lp3.user_id = _user_id AND lp3.last_attempt_at::date = yesterday
  ) INTO had_qualifying;
  IF rec.last_login_date = yesterday AND had_qualifying THEN new_streak := old_streak + 1;
  ELSE new_streak := 1; END IF;
  IF new_streak = 3 AND old_streak < 3 THEN milestone_bonus := 100; milestone_hit := '3-day streak! +100 bonus';
  ELSIF new_streak = 7 AND old_streak < 7 THEN milestone_bonus := 300; milestone_hit := '7-day streak! +300 bonus';
  ELSIF new_streak = 14 AND old_streak < 14 THEN milestone_bonus := 700; milestone_hit := '14-day streak! +700 bonus';
  ELSIF new_streak = 30 AND old_streak < 30 THEN milestone_bonus := 2000; milestone_hit := '30-day streak! +2000 bonus';
  END IF;
  UPDATE daily_login_streaks SET
    current_streak = new_streak, longest_streak = GREATEST(rec.longest_streak, new_streak),
    last_login_date = today, total_days_active = rec.total_days_active + 1,
    streak_points_awarded = rec.streak_points_awarded + login_pts + streak_daily + milestone_bonus,
    updated_at = now()
  WHERE daily_login_streaks.user_id = _user_id;
  PERFORM award_points_v2(_user_id, 'daily_login', login_pts, '{}');
  PERFORM award_points_v2(_user_id, 'streak', streak_daily + milestone_bonus, jsonb_build_object('streak', new_streak, 'milestone', milestone_hit));
  RETURN jsonb_build_object('current_streak', new_streak, 'longest_streak', GREATEST(rec.longest_streak, new_streak),
    'points_awarded', login_pts + streak_daily + milestone_bonus, 'milestone', milestone_hit, 'already_recorded', false);
END; $$;

-- 12. Drop and recreate weekly leaderboard
DROP FUNCTION IF EXISTS public.get_current_leaderboard();

CREATE OR REPLACE FUNCTION public.get_current_leaderboard()
RETURNS TABLE(
  user_id uuid, full_name text, nickname text, avatar_url text, team_name text,
  total_points integer, hours_points integer, threshold_bonus integer,
  login_points integer, streak_points integer, chat_points integer,
  lesson_points integer, video_points integer, manual_points integer,
  reaction_points integer, one_on_one_points integer,
  time_this_week_minutes integer, current_streak integer, rank bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ws date := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date;
BEGIN
  RETURN QUERY
  WITH hrs AS (
    SELECT dtt.user_id, SUM(LEAST(FLOOR(dtt.total_minutes / 60.0) * 100, 600))::integer as pts,
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
END; $$;

-- 13. Drop and recreate all-time leaderboard
DROP FUNCTION IF EXISTS public.get_all_time_leaderboard(integer);

CREATE OR REPLACE FUNCTION public.get_all_time_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid, full_name text, nickname text, avatar_url text, team_name text,
  total_points integer, current_streak integer,
  legacy_points integer, new_hours_points integer, new_event_points integer
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
    SELECT dtt.user_id, SUM(LEAST(FLOOR(dtt.total_minutes / 60.0) * 100, 600))::integer as pts
    FROM daily_training_time dtt WHERE dtt.date >= v_cutover GROUP BY dtt.user_id
  ),
  tp AS (
    SELECT sub.user_id, SUM(sub.bonus)::integer as pts FROM (
      SELECT dtt.user_id, CASE WHEN SUM(dtt.total_minutes) >= 900 THEN 2000
        WHEN SUM(dtt.total_minutes) >= 600 THEN 1200 WHEN SUM(dtt.total_minutes) >= 300 THEN 500 ELSE 0 END as bonus
      FROM daily_training_time dtt WHERE dtt.date >= v_cutover GROUP BY dtt.user_id, date_trunc('week', dtt.date)
    ) sub GROUP BY sub.user_id
  ),
  ep AS (SELECT pe2.user_id, SUM(pe2.points)::integer as pts FROM point_events pe2 GROUP BY pe2.user_id),
  stk AS (SELECT dls.user_id, dls.current_streak FROM daily_login_streaks dls),
  scored AS (
    SELECT a.user_id, a.full_name, a.nickname, a.avatar_url, a.team_name,
      (a.leg + COALESCE(h.pts,0) + COALESCE(t2.pts,0) + COALESCE(e.pts,0))::integer as total,
      COALESCE(s.current_streak, 0)::integer as streak,
      a.leg as leg_pts, COALESCE(h.pts,0) as h_pts, COALESCE(e.pts,0) as e_pts
    FROM au a LEFT JOIN hp h ON h.user_id = a.user_id LEFT JOIN tp t2 ON t2.user_id = a.user_id
    LEFT JOIN ep e ON e.user_id = a.user_id LEFT JOIN stk s ON s.user_id = a.user_id
  )
  SELECT sc.user_id, sc.full_name, sc.nickname, sc.avatar_url, sc.team_name,
    sc.total as total_points, sc.streak as current_streak,
    sc.leg_pts as legacy_points, sc.h_pts as new_hours_points, sc.e_pts as new_event_points
  FROM scored sc WHERE sc.total > 0
  ORDER BY sc.total DESC, sc.full_name ASC LIMIT _limit;
END; $$;

-- 14. Update validate_and_record_quiz to use new point system
CREATE OR REPLACE FUNCTION public.validate_and_record_quiz(_lesson_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  correct_count INT := 0; total_count INT; score INT; passed BOOLEAN;
  current_attempts INT; already_passed BOOLEAN := FALSE;
  q RECORD; question_results JSONB := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT quiz_passed INTO already_passed FROM lesson_progress WHERE user_id = auth.uid() AND lesson_id = _lesson_id;
  FOR q IN SELECT id, question_text, correct_answer, explanation FROM quiz_questions WHERE lesson_id = _lesson_id ORDER BY display_order
  LOOP
    DECLARE
      user_answer TEXT := _answers->>q.id::text;
      is_correct BOOLEAN := (user_answer = q.correct_answer);
    BEGIN
      IF is_correct THEN correct_count := correct_count + 1; END IF;
      question_results := question_results || jsonb_build_object(
        'question_id', q.id, 'question_text', q.question_text, 'user_answer', user_answer,
        'correct_answer', q.correct_answer, 'is_correct', is_correct, 'explanation', COALESCE(q.explanation, ''));
    END;
  END LOOP;
  SELECT COUNT(*) INTO total_count FROM quiz_questions WHERE lesson_id = _lesson_id;
  IF total_count = 0 THEN RETURN jsonb_build_object('error', 'No questions found for this lesson'); END IF;
  score := ROUND((correct_count::FLOAT / total_count) * 100);
  passed := (correct_count = total_count);
  SELECT COALESCE(quiz_attempts, 0) INTO current_attempts FROM lesson_progress WHERE user_id = auth.uid() AND lesson_id = _lesson_id;
  INSERT INTO lesson_progress (user_id, lesson_id, quiz_passed, quiz_score, quiz_attempts, last_attempt_at, completed_at)
  VALUES (auth.uid(), _lesson_id, passed, score, COALESCE(current_attempts, 0) + 1, NOW(), CASE WHEN passed THEN NOW() ELSE NULL END)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    quiz_passed = CASE WHEN passed OR lesson_progress.quiz_passed THEN true ELSE false END,
    quiz_score = GREATEST(EXCLUDED.quiz_score, COALESCE(lesson_progress.quiz_score, 0)),
    quiz_attempts = lesson_progress.quiz_attempts + 1, last_attempt_at = NOW(),
    completed_at = CASE WHEN passed OR lesson_progress.quiz_passed THEN COALESCE(lesson_progress.completed_at, NOW()) ELSE lesson_progress.completed_at END;
  IF passed AND NOT COALESCE(already_passed, FALSE) THEN
    PERFORM public.award_lesson_completion_points(auth.uid(), _lesson_id);
    PERFORM public.award_quiz_bonus_points(auth.uid(), _lesson_id, score);
  END IF;
  RETURN jsonb_build_object('passed', passed, 'score', score, 'correct', correct_count, 'total', total_count, 'results', question_results);
END; $$;

-- 15. Award video watch points
CREATE OR REPLACE FUNCTION public.award_video_watch_points(_user_id uuid, _video_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN public.award_points_v2(_user_id, 'video', 40, jsonb_build_object('video_id', _video_id));
END; $$;
