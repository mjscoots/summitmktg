-- Pass 156: the manager day screen.

-- Carried lock from Pass 155: this helper is only called inside
-- accept_into_industry (SECURITY DEFINER), never from the client.
REVOKE ALL ON FUNCTION public.tick_training_done_from_day_one(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tick_training_done_from_day_one(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.tick_training_done_from_day_one(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.manager_day(_vertical text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _monday timestamptz;
  _radar integer := 0;
  _owed integer := 0;
  _stuck integer := 0;
  _stuck_ids jsonb := '[]'::jsonb;
  _blitz_id uuid;
  _blitz_title text;
  _blitz_open integer := 0;
  _blitz_names jsonb := '[]'::jsonb;
  _awaiting integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  _staff := public.has_role(_uid, 'admin') OR public.has_role(_uid, 'owner');
  IF NOT _staff AND NOT public.is_manager_tier(_uid) THEN
    RETURN '{}'::jsonb;
  END IF;

  -- 1 Call today: the radar, quiet a week or more or never opened the app.
  SELECT count(*) INTO _radar
  FROM jsonb_array_elements(
    COALESCE(public.dark_rep_radar(NULL, _vertical) -> 'rows', '[]'::jsonb)
  ) r
  WHERE (r ->> 'days_quiet') IS NULL OR (r ->> 'days_quiet')::int >= 7;

  -- 2 One on ones owed this week, Monday to now.
  _monday := date_trunc('week', now());
  SELECT count(*) INTO _owed
  FROM public.prep_roster(_vertical) p
  WHERE p.role IN ('rookie', 'recruiter')
    AND NOT EXISTS (
      SELECT 1 FROM public.weekly_one_on_ones_rookie w
      WHERE w.rookie_user_id = p.user_id AND w.created_at >= _monday
    );

  -- 3 Stuck on onboarding: no step movement for 7 days and not fully onboarded.
  WITH mine AS (
    SELECT p.user_id,
           GREATEST(
             p.created_at,
             COALESCE((SELECT max(o.checked_at) FROM public.onboarding_steps o
                       WHERE o.user_id = p.user_id), p.created_at)
           ) AS moved_at
    FROM public.profiles p
    WHERE COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text, '') <> 'nlc'
      AND p.user_id <> _uid
      AND public.is_in_my_system(_uid, p.user_id)
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
      AND NOT ((public.onboarding_state(p.user_id) ->> 'fully_onboarded')::boolean)
  )
  SELECT count(*), COALESCE(jsonb_agg(user_id), '[]'::jsonb)
  INTO _stuck, _stuck_ids
  FROM mine
  WHERE moved_at <= now() - interval '7 days';

  -- 4 The nearest upcoming blitz and who has not answered it.
  SELECT e.id, e.title INTO _blitz_id, _blitz_title
  FROM public.calendar_events e
  WHERE e.event_kind = 'blitz'
    AND COALESCE(e.is_cancelled, false) = false
    AND e.event_date >= now()
    AND (_vertical IS NULL OR e.vertical IS NULL OR e.vertical = _vertical)
  ORDER BY e.event_date
  LIMIT 1;

  IF _blitz_id IS NOT NULL THEN
    WITH people AS (
      SELECT p.user_id, p.full_name
      FROM public.profiles p
      WHERE COALESCE(p.archived, false) = false
        AND COALESCE(p.status::text, '') <> 'nlc'
        AND p.status = 'active'
        AND p.user_id <> _uid
        AND public.is_in_my_system(_uid, p.user_id)
        AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
        AND NOT EXISTS (
          SELECT 1 FROM public.calendar_attendance a
          WHERE a.event_id = _blitz_id AND a.user_id = p.user_id
            AND a.status IN ('attending', 'not_attending')
        )
    )
    SELECT count(*), COALESCE(jsonb_agg(full_name ORDER BY full_name), '[]'::jsonb)
    INTO _blitz_open, _blitz_names
    FROM people;
  END IF;

  -- 5 Waiting to be placed.
  SELECT jsonb_array_length(COALESCE(public.people_awaiting_industry(), '[]'::jsonb))
  INTO _awaiting;

  RETURN jsonb_build_object(
    'is_manager', true,
    'radar_count', _radar,
    'owed_count', _owed,
    'stuck_count', _stuck,
    'stuck_ids', _stuck_ids,
    'blitz_event_id', _blitz_id,
    'blitz_title', _blitz_title,
    'blitz_open_count', _blitz_open,
    'blitz_names', _blitz_names,
    'awaiting_count', _awaiting
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.manager_day(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_day(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.manager_day(text) TO authenticated;