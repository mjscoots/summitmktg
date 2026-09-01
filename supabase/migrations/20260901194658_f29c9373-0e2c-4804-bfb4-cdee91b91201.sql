-- 1. member id helper
CREATE OR REPLACE FUNCTION public.vertical_member_ids(_vertical text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.user_id FROM public.profiles p
  WHERE p.archived IS NOT TRUE
    AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical));
$$;
REVOKE EXECUTE ON FUNCTION public.vertical_member_ids(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vertical_member_ids(text) TO authenticated;

-- 2. events feed with explicit vertical
DROP FUNCTION IF EXISTS public.get_events_feed(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.get_events_feed(
  p_from timestamptz DEFAULT (now() - interval '60 days'),
  p_to timestamptz DEFAULT (now() + interval '60 days'),
  p_vertical text DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, description text, event_date timestamptz, end_date timestamptz,
  location text, event_kind text, scope text, team_id uuid, team_name text, created_by uuid,
  is_series boolean, my_rsvp text, going_count integer, present_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT e.id, e.title, e.description, e.event_date, e.end_date, e.location,
         coalesce(e.event_kind,'other'), coalesce(e.scope,'everyone'), e.team_id, t.name, e.created_by,
         (e.parent_event_id IS NOT NULL OR e.recurrence_type = 'weekly'),
         (SELECT a.status FROM public.calendar_attendance a WHERE a.event_id = e.id AND a.user_id = auth.uid()),
         (SELECT count(*)::int FROM public.calendar_attendance a WHERE a.event_id = e.id AND a.status = 'attending'),
         (SELECT count(*)::int FROM public.calendar_attendance a WHERE a.event_id = e.id AND a.present = true)
  FROM public.calendar_events e
  LEFT JOIN public.teams t ON t.id = e.team_id
  WHERE e.event_date BETWEEN p_from AND p_to
    AND e.is_cancelled = false
    AND public.can_view_event(e.scope, e.team_id, auth.uid())
    AND (e.vertical IS NULL OR e.vertical = coalesce(p_vertical, public.my_active_vertical()))
  ORDER BY e.event_date;
$$;
REVOKE EXECUTE ON FUNCTION public.get_events_feed(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_events_feed(timestamptz, timestamptz, text) TO authenticated;

-- 3. leaderboard scoped
DROP FUNCTION IF EXISTS public.get_current_leaderboard();
CREATE OR REPLACE FUNCTION public.get_current_leaderboard(_vertical text DEFAULT NULL)
 RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, team_name text, total_points integer, hours_points integer, threshold_bonus integer, login_points integer, streak_points integer, chat_points integer, lesson_points integer, video_points integer, manual_points integer, reaction_points integer, one_on_one_points integer, time_this_week_minutes integer, current_streak integer, rank bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    WHERE (p.status = 'active' AND p.archived = false) AND p.approved = true
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
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
REVOKE EXECUTE ON FUNCTION public.get_current_leaderboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_leaderboard(text) TO authenticated;

-- 4. incomplete profiles scoped
DROP FUNCTION IF EXISTS public.get_incomplete_profiles();
CREATE OR REPLACE FUNCTION public.get_incomplete_profiles(_vertical text DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, missing text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.full_name,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(p.avatar_url,'') = '' THEN 'photo' END,
      CASE WHEN COALESCE(p.phone,'') = '' THEN 'phone' END,
      CASE WHEN COALESCE(p.emergency_contact_phone,'') = '' THEN 'emergency contact' END,
      CASE WHEN COALESCE(p.shirt_size,'') = '' THEN 'shirt size' END
    ], NULL)
  FROM public.profiles p
  WHERE p.archived = false AND p.alumni = false
    AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
    AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
    AND (COALESCE(p.avatar_url,'') = '' OR COALESCE(p.phone,'') = ''
         OR COALESCE(p.emergency_contact_phone,'') = '' OR COALESCE(p.shirt_size,'') = '');
$$;
REVOKE EXECUTE ON FUNCTION public.get_incomplete_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_incomplete_profiles(text) TO authenticated;

-- 5. attendance flags scoped
DROP FUNCTION IF EXISTS public.get_attendance_flags();
CREATE OR REPLACE FUNCTION public.get_attendance_flags(_vertical text DEFAULT NULL)
 RETURNS TABLE(user_id uuid, missed_streak integer, pct integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  WITH meetings AS (
    SELECT e.id, e.event_date
    FROM public.calendar_events e
    WHERE e.event_kind = 'meeting'
      AND e.event_date >= now() - interval '30 days'
      AND e.event_date <= now()
      AND (_vertical IS NULL OR e.vertical IS NULL OR e.vertical = _vertical)
  ),
  rows AS (
    SELECT a.user_id,
           m.event_date,
           coalesce(a.present, false) AS present,
           row_number() OVER (PARTITION BY a.user_id ORDER BY m.event_date DESC) AS rn
    FROM public.calendar_attendance a
    JOIN meetings m ON m.id = a.event_id
    JOIN public.profiles p ON p.user_id = a.user_id AND p.archived = false
    WHERE (_vertical IS NULL OR public.is_vertical_member(a.user_id, _vertical))
  ),
  streaks AS (
    SELECT r.user_id,
           coalesce((
             SELECT min(r2.rn) - 1
             FROM rows r2
             WHERE r2.user_id = r.user_id AND r2.present
           ), (SELECT max(r3.rn) FROM rows r3 WHERE r3.user_id = r.user_id)) AS missed_streak
    FROM rows r
    GROUP BY r.user_id
  ),
  pcts AS (
    SELECT r.user_id,
           count(*) AS expected,
           count(*) FILTER (WHERE r.present) AS present_count
    FROM rows r
    GROUP BY r.user_id
  )
  SELECT s.user_id,
         s.missed_streak::integer,
         CASE WHEN p.expected > 0 THEN round((p.present_count::numeric / p.expected) * 100)::integer ELSE 0 END
  FROM streaks s
  JOIN pcts p ON p.user_id = s.user_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_attendance_flags(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_flags(text) TO authenticated;

-- 6. finishing soon scoped
DROP FUNCTION IF EXISTS public.get_finishing_soon(integer);
CREATE OR REPLACE FUNCTION public.get_finishing_soon(_days integer DEFAULT 14, _vertical text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _soon jsonb;
  _gap int;
  _gap_list jsonb;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error', 'Managers only');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.committed_last_day), '[]'::jsonb) INTO _soon
  FROM (
    SELECT p.user_id, p.full_name, p.avatar_url, p.direct_manager,
           p.committed_last_day, p.commitment_terms, p.next_year_status
    FROM profiles p
    WHERE p.archived IS NOT TRUE AND p.approved IS TRUE
      AND p.committed_last_day IS NOT NULL
      AND p.committed_last_day >= current_date
      AND p.committed_last_day <= current_date + COALESCE(_days,14)
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
  ) x;

  SELECT count(*)::int INTO _gap
  FROM profiles p
  WHERE p.archived IS NOT TRUE AND p.approved IS TRUE AND p.committed_last_day IS NULL
    AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical));

  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.full_name), '[]'::jsonb) INTO _gap_list
  FROM (
    SELECT p.user_id, p.full_name, p.direct_manager
    FROM profiles p
    WHERE p.archived IS NOT TRUE AND p.approved IS TRUE AND p.committed_last_day IS NULL
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
    LIMIT 300
  ) y;

  RETURN jsonb_build_object('soon', _soon, 'no_date_count', _gap, 'no_date', _gap_list);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_finishing_soon(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finishing_soon(integer, text) TO authenticated;

-- 7. weekly digest names the industry on an event line
CREATE OR REPLACE FUNCTION public.post_weekly_digest()
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _week timestamp;
  _sender uuid;
  _signed int := 0;
  _new_ct int := 0;
  _names text;
  _events text;
  _lines text[] := '{}';
  _content text;
BEGIN
  _week := date_trunc('week', timezone('America/New_York', now()));

  IF EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE kind = 'system'
      AND meta->>'source' = 'weekly_digest'
      AND date_trunc('week', timezone('America/New_York', created_at)) = _week
  ) THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'already posted this week');
  END IF;

  SELECT user_id INTO _sender
  FROM public.user_roles WHERE role = 'owner' ORDER BY created_at LIMIT 1;
  IF _sender IS NULL THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'no owner');
  END IF;

  SELECT count(*) INTO _signed FROM public.people_leads WHERE signed_2027;

  SELECT count(*),
         string_agg(nullif(split_part(coalesce(full_name, ''), ' ', 1), ''), ', ' ORDER BY created_at)
    INTO _new_ct, _names
  FROM public.profiles
  WHERE created_at > now() - interval '7 days'
    AND coalesce(archived, false) = false;

  SELECT string_agg(
           title
           || CASE WHEN vertical IS NOT NULL THEN ' (' || vertical || ')' ELSE '' END
           || ' on ' || trim(to_char(event_date, 'FMDay')),
           ', ' ORDER BY event_date)
    INTO _events
  FROM public.calendar_events
  WHERE scope = 'everyone'
    AND coalesce(is_cancelled, false) = false
    AND event_date >= now()
    AND event_date < now() + interval '7 days';

  IF _signed > 0 THEN
    _lines := _lines || format(
      '%s %s signed for 2027 so far.',
      _signed, CASE WHEN _signed = 1 THEN 'person is' ELSE 'people are' END);
  END IF;

  IF _new_ct > 0 THEN
    IF _new_ct <= 5 AND _names IS NOT NULL THEN
      _lines := _lines || format('%s %s joined the app this week: %s.',
        _new_ct, CASE WHEN _new_ct = 1 THEN 'person' ELSE 'people' END, _names);
    ELSE
      _lines := _lines || format('%s people joined the app this week.', _new_ct);
    END IF;
  END IF;

  IF _events IS NOT NULL THEN
    _lines := _lines || format('Coming up in the next seven days: %s.', _events);
  END IF;

  IF array_length(_lines, 1) IS NULL THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'nothing to say');
  END IF;

  _content := array_to_string(_lines, ' ');

  INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, meta)
  VALUES (_sender, _content, true, 'general', 'system',
          jsonb_build_object('source', 'weekly_digest', 'label', 'Summit HQ'));

  RETURN jsonb_build_object('posted', true, 'content', _content);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.post_weekly_digest() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_weekly_digest() TO authenticated;