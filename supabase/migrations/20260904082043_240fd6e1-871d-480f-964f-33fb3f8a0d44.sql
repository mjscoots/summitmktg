ALTER TABLE public.chat_prefs
  ADD COLUMN IF NOT EXISTS pinned_channel_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.set_channel_pin(_channel_id uuid, _pinned boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;

  INSERT INTO public.chat_prefs (user_id, pinned_channel_ids)
  VALUES (_uid, CASE WHEN _pinned THEN ARRAY[_channel_id]::uuid[] ELSE '{}'::uuid[] END)
  ON CONFLICT (user_id) DO UPDATE
  SET pinned_channel_ids = CASE
        WHEN _pinned THEN (
          SELECT ARRAY(SELECT DISTINCT u FROM unnest(public.chat_prefs.pinned_channel_ids || _channel_id) u)
        )
        ELSE (
          SELECT ARRAY(SELECT u FROM unnest(public.chat_prefs.pinned_channel_ids) u WHERE u <> _channel_id)
        )
      END,
      updated_at = now();

  RETURN jsonb_build_object('ok', true, 'pinned', _pinned);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_channel_pin(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_channel_pin(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_channel_pin(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_conversations()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _rows jsonb;
  _dms jsonb;
  _pins uuid[];
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT COALESCE(cp.pinned_channel_ids, '{}'::uuid[]) INTO _pins
  FROM public.chat_prefs cp WHERE cp.user_id = _uid;
  _pins := COALESCE(_pins, '{}'::uuid[]);

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.is_pinned DESC, x.display_order, x.label), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT v.slug,
           v.label,
           v.icon,
           v.color,
           v.display_order,
           CASE WHEN v.slug LIKE 'team-%' THEN 'team' ELSE 'channel' END AS kind,
           COALESCE((SELECT c5.id FROM public.chat_channels c5 WHERE c5.slug = v.slug) = ANY (_pins), false) AS is_pinned,
           (SELECT c5.id FROM public.chat_channels c5 WHERE c5.slug = v.slug) AS channel_id,
           false AS other_is_active,
           NULL::text AS avatar_url,
           NULL::uuid AS other_user_id,
           (SELECT c3.cover_image_path FROM public.chat_channels c3 WHERE c3.slug = v.slug) AS cover_image_path,
           (SELECT c4.vertical FROM public.chat_channels c4 WHERE c4.slug = v.slug) AS vertical,
           EXISTS (SELECT 1 FROM public.chat_channel_mutes mu WHERE mu.user_id = _uid AND mu.channel = v.slug) AS is_muted,
           lm.content AS last_content,
           lm.created_at AS last_at,
           CASE WHEN lm.is_ai THEN 'Summit AI' ELSE lp.full_name END AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = v.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = v.slug),
                     (SELECT r2.last_read_at FROM public.chat_read_state r2
                      WHERE r2.user_id = _uid AND r2.channel = 'general'),
                     now())
           ) AS unread
    FROM public.visible_chat_channels(_uid) v
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id, m.is_ai
      FROM public.chat_messages m
      WHERE m.channel = v.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.is_pinned DESC, d.last_at DESC NULLS LAST, d.label), '[]'::jsonb)
  INTO _dms
  FROM (
    SELECT c.slug,
           COALESCE(op.full_name, c.label) AS label,
           'MessageSquare'::text AS icon,
           'text-foreground'::text AS color,
           900 AS display_order,
           'dm'::text AS kind,
           COALESCE(c.id = ANY (_pins), false) AS is_pinned,
           c.id AS channel_id,
           COALESCE(op.is_active_now, false) AS other_is_active,
           op.avatar_url,
           other.uid AS other_user_id,
           NULL::text AS cover_image_path,
           NULL::text AS vertical,
           EXISTS (SELECT 1 FROM public.chat_channel_mutes mu WHERE mu.user_id = _uid AND mu.channel = c.slug) AS is_muted,
           lm.content AS last_content,
           lm.created_at AS last_at,
           lp.full_name AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = c.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = c.slug),
                     '-infinity'::timestamptz)
           ) AS unread
    FROM public.chat_channels c
    CROSS JOIN LATERAL (
      SELECT (SELECT u FROM unnest(c.member_ids) u WHERE u <> _uid LIMIT 1) AS uid
    ) other
    LEFT JOIN public.profiles op ON op.user_id = other.uid
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id
      FROM public.chat_messages m
      WHERE m.channel = c.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
    WHERE c.kind = 'dm'
      AND c.is_active = true
      AND (_uid = ANY (c.member_ids) OR public.is_chat_staff(_uid))
  ) d;

  _rows := _rows || _dms;

  RETURN jsonb_build_object(
    'conversations', _rows,
    'total_unread', (
      SELECT COALESCE(sum((c->>'unread')::int), 0)
      FROM jsonb_array_elements(_rows) c
      WHERE COALESCE((c->>'is_muted')::boolean, false) = false
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_daily_login(_user_id uuid, _timezone text DEFAULT 'America/Los_Angeles'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today date;
  _row daily_login_streaks%ROWTYPE;
  _new_streak integer;
  _points integer := 0;
  _milestone text := NULL;
  _already boolean := false;
BEGIN
  _today := (now() AT TIME ZONE _timezone)::date;

  SELECT * INTO _row FROM daily_login_streaks WHERE user_id = _user_id;

  -- First ever login
  IF NOT FOUND THEN
    INSERT INTO daily_login_streaks (user_id, current_streak, longest_streak, last_login_date, total_days_active, streak_points_awarded)
    VALUES (_user_id, 1, 1, _today, 1, 10);

    INSERT INTO point_events (user_id, category, points, metadata)
    VALUES (_user_id, 'streak', 10, '{"reason":"daily_login","day":1}'::jsonb);

    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'points_awarded', 10,
      'milestone', 'Day 1',
      'already_recorded', false
    );
  END IF;

  -- Already logged in today
  IF _row.last_login_date = _today THEN
    RETURN jsonb_build_object(
      'current_streak', _row.current_streak,
      'longest_streak', _row.longest_streak,
      'points_awarded', 0,
      'milestone', NULL,
      'already_recorded', true
    );
  END IF;

  -- Consecutive day
  IF _row.last_login_date = _today - 1 THEN
    _new_streak := _row.current_streak + 1;
  ELSE
    _new_streak := 1;
  END IF;

  _points := 10; -- base daily login
  IF _new_streak = 3 THEN _points := _points + 50; _milestone := '3 Day Streak!';
  ELSIF _new_streak = 7 THEN _points := _points + 150; _milestone := '7 Day Streak!';
  ELSIF _new_streak = 14 THEN _points := _points + 300; _milestone := '14 Day Streak!';
  ELSIF _new_streak = 21 THEN _points := _points + 500; _milestone := '21 Day Streak!';
  ELSIF _new_streak = 30 THEN _points := _points + 1000; _milestone := '30 Day Streak!';
  ELSIF _new_streak = 60 THEN _points := _points + 2000; _milestone := '60 Day Streak!';
  ELSIF _new_streak = 90 THEN _points := _points + 3000; _milestone := '90 Day Streak!';
  END IF;

  UPDATE daily_login_streaks
  SET current_streak = _new_streak,
      longest_streak = GREATEST(_row.longest_streak, _new_streak),
      last_login_date = _today,
      total_days_active = _row.total_days_active + 1,
      streak_points_awarded = _row.streak_points_awarded + _points,
      previous_streak = CASE WHEN _new_streak = 1 AND _row.current_streak > 1 THEN _row.current_streak ELSE 0 END,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO point_events (user_id, category, points, metadata)
  VALUES (_user_id, 'streak', _points, jsonb_build_object('reason', 'daily_login', 'day', _new_streak));

  RETURN jsonb_build_object(
    'current_streak', _new_streak,
    'longest_streak', GREATEST(_row.longest_streak, _new_streak),
    'points_awarded', _points,
    'milestone', _milestone,
    'already_recorded', false
  );
END;
$function$;