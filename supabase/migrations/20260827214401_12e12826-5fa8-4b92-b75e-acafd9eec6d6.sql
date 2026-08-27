-- 1. Ask Summit roster with per-person contact visibility -------------------
CREATE OR REPLACE FUNCTION public.ask_summit_roster(_uid uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'full_name'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'team_id', p.team_id,
      'direct_manager', p.direct_manager,
      'phone', CASE WHEN v.ok THEN p.phone ELSE NULL END,
      'email', CASE WHEN v.ok THEN p.email ELSE NULL END
    ) AS x
    FROM public.profiles p
    CROSS JOIN LATERAL (
      SELECT (
        p.user_id = _uid
        OR public.is_chat_staff(_uid)
        OR CASE COALESCE(p.phone_visibility::text, 'team')
             WHEN 'everyone' THEN true
             WHEN 'staff' THEN false
             ELSE (
               (p.team_id IS NOT NULL
                 AND p.team_id = (SELECT team_id FROM public.profiles WHERE user_id = _uid))
               OR public.is_leader_of(_uid, p.user_id)
               OR public.is_leader_of(p.user_id, _uid)
             )
           END
      ) AS ok
    ) v
    WHERE p.archived = false AND p.status <> 'nlc'
    LIMIT 300
  ) s;
$$;

REVOKE ALL ON FUNCTION public.ask_summit_roster(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ask_summit_roster(uuid) TO service_role;

-- 2. One chat card per recurring event series -------------------------------
CREATE OR REPLACE FUNCTION public.event_series_cadence(_e public.calendar_events)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_e.recurrence_type, 'none') IN ('none', '') THEN NULL
    WHEN _e.recurrence_type = 'daily' THEN
      CASE WHEN COALESCE(_e.recurrence_interval, 1) > 1
        THEN 'repeats every ' || _e.recurrence_interval || ' days' ELSE 'repeats daily' END
    WHEN _e.recurrence_type = 'weekly' THEN
      CASE WHEN COALESCE(_e.recurrence_interval, 1) > 1
        THEN 'repeats every ' || _e.recurrence_interval || ' weeks' ELSE 'repeats weekly' END
    WHEN _e.recurrence_type = 'biweekly' THEN 'repeats every 2 weeks'
    WHEN _e.recurrence_type = 'monthly' THEN
      CASE WHEN COALESCE(_e.recurrence_interval, 1) > 1
        THEN 'repeats every ' || _e.recurrence_interval || ' months' ELSE 'repeats monthly' END
    ELSE 'repeats'
  END
$$;
REVOKE ALL ON FUNCTION public.event_series_cadence(public.calendar_events) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.event_card_meta(_e public.calendar_events)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'title', _e.title,
    'event_date', _e.event_date,
    'end_date', _e.end_date,
    'location', _e.location,
    'event_kind', COALESCE(_e.event_kind,'other'),
    'scope', COALESCE(_e.scope,'everyone'),
    'team_id', _e.team_id,
    'rsvp_deadline', _e.rsvp_deadline,
    'questions', COALESCE(_e.questions,'[]'::jsonb),
    'cancelled', COALESCE(_e.is_cancelled,false),
    'series_root', COALESCE(_e.parent_event_id, _e.id),
    'repeats', public.event_series_cadence(_e)
  )
$$;

-- Points the series' single card at the next upcoming occurrence (or the last
-- one when the series is over).
CREATE OR REPLACE FUNCTION public.refresh_series_card(_root uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _next public.calendar_events; _msg uuid;
BEGIN
  SELECT m.id INTO _msg
  FROM public.chat_messages m
  WHERE m.kind = 'event'
    AND m.ref_id IN (
      SELECT e.id FROM public.calendar_events e
      WHERE COALESCE(e.parent_event_id, e.id) = _root
    )
  ORDER BY m.created_at
  LIMIT 1;
  IF _msg IS NULL THEN RETURN; END IF;

  SELECT e.* INTO _next FROM public.calendar_events e
  WHERE COALESCE(e.parent_event_id, e.id) = _root
    AND COALESCE(e.is_cancelled, false) = false
    AND e.event_date >= now()
  ORDER BY e.event_date
  LIMIT 1;

  IF _next.id IS NULL THEN
    SELECT e.* INTO _next FROM public.calendar_events e
    WHERE COALESCE(e.parent_event_id, e.id) = _root
    ORDER BY e.event_date DESC
    LIMIT 1;
  END IF;
  IF _next.id IS NULL THEN RETURN; END IF;

  UPDATE public.chat_messages
     SET content = _next.title, ref_id = _next.id, meta = public.event_card_meta(_next)
   WHERE id = _msg;
END $$;
REVOKE ALL ON FUNCTION public.refresh_series_card(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.post_event_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _author uuid; _chan text; _root uuid; _exists boolean;
BEGIN
  _author := COALESCE(NEW.created_by, NEW.manager_id);
  IF _author IS NULL THEN RETURN NEW; END IF;
  _root := COALESCE(NEW.parent_event_id, NEW.id);

  SELECT EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.kind = 'event'
      AND m.ref_id IN (
        SELECT e.id FROM public.calendar_events e
        WHERE COALESCE(e.parent_event_id, e.id) = _root
      )
  ) INTO _exists;

  IF _exists THEN
    PERFORM public.refresh_series_card(_root);
    RETURN NEW;
  END IF;

  _chan := public.event_target_channel(NEW.scope, NEW.team_id);
  IF NOT EXISTS (SELECT 1 FROM public.chat_channels WHERE slug = _chan AND is_active) THEN
    _chan := 'general';
  END IF;
  INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, ref_id, meta)
  VALUES (_author, NEW.title, true, _chan, 'event', NEW.id, public.event_card_meta(NEW));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_event_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.chat_messages
     SET content = NEW.title, meta = public.event_card_meta(NEW)
   WHERE kind = 'event' AND ref_id = NEW.id;
  PERFORM public.refresh_series_card(COALESCE(NEW.parent_event_id, NEW.id));
  RETURN NEW;
END $$;

-- Clean up existing duplicate cards: keep the oldest card per series.
WITH ranked AS (
  SELECT m.id,
         COALESCE(e.parent_event_id, e.id) AS root,
         row_number() OVER (
           PARTITION BY COALESCE(e.parent_event_id, e.id) ORDER BY m.created_at, m.id
         ) AS rn
  FROM public.chat_messages m
  JOIN public.calendar_events e ON e.id = m.ref_id
  WHERE m.kind = 'event'
)
DELETE FROM public.chat_messages c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Refresh the surviving cards so they carry the cadence and next occurrence.
DO $$
DECLARE _r uuid;
BEGIN
  FOR _r IN
    SELECT DISTINCT COALESCE(e.parent_event_id, e.id)
    FROM public.chat_messages m
    JOIN public.calendar_events e ON e.id = m.ref_id
    WHERE m.kind = 'event'
  LOOP
    PERFORM public.refresh_series_card(_r);
  END LOOP;
END $$;