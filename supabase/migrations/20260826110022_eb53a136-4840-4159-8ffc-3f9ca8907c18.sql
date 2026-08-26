CREATE OR REPLACE FUNCTION public.get_person_time_split(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _screens jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.can_view_person(_user_id) = 'none' THEN
    RETURN jsonb_build_object('error','No access');
  END IF;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO _screens
  FROM (
    SELECT s.key AS k, sum((s.value)::int) AS v
    FROM public.activity_days a, jsonb_each_text(a.screens) s
    WHERE a.user_id = _user_id AND a.day >= CURRENT_DATE - 6
    GROUP BY s.key
    ORDER BY sum((s.value)::int) DESC
    LIMIT 12
  ) q;

  RETURN jsonb_build_object(
    'app_7d', COALESCE((SELECT sum(app_minutes) FROM public.daily_training_time WHERE user_id=_user_id AND date >= CURRENT_DATE - 6), 0),
    'training_7d', COALESCE((SELECT sum(training_minutes) FROM public.daily_training_time WHERE user_id=_user_id AND date >= CURRENT_DATE - 6), 0),
    'app_30d', COALESCE((SELECT sum(app_minutes) FROM public.daily_training_time WHERE user_id=_user_id AND date >= CURRENT_DATE - 29), 0),
    'training_30d', COALESCE((SELECT sum(training_minutes) FROM public.daily_training_time WHERE user_id=_user_id AND date >= CURRENT_DATE - 29), 0),
    'screens_7d', _screens
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_person_event_answers(_user_id uuid, _limit int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.can_view_person(_user_id) = 'none' THEN
    RETURN jsonb_build_object('error','No access');
  END IF;

  RETURN jsonb_build_object('events', COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'event_date') DESC) FROM (
      SELECT jsonb_build_object(
        'event_id', e.id,
        'title', e.title,
        'event_date', e.event_date,
        'event_kind', COALESCE(e.event_kind,'other'),
        'cancelled', COALESCE(e.is_cancelled,false),
        'answer', COALESCE(a.status, 'no_answer'),
        'present', a.present,
        'responded_at', a.responded_at
      ) AS row
      FROM public.calendar_events e
      LEFT JOIN public.calendar_attendance a ON a.event_id = e.id AND a.user_id = _user_id
      WHERE public.can_view_event(e.scope, e.team_id, _user_id)
        AND e.event_date <= now() + interval '30 days'
      ORDER BY e.event_date DESC
      LIMIT greatest(least(COALESCE(_limit,10), 50), 1)
    ) q
  ), '[]'::jsonb));
END;
$$;

-- Unanswered counts per upcoming event, for the team page "Answers" column
CREATE OR REPLACE FUNCTION public.get_event_answer_columns()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('events','[]'::jsonb); END IF;
  IF NOT (has_role(_uid,'manager'::app_role) OR has_role(_uid,'president'::app_role)
          OR has_role(_uid,'admin'::app_role) OR has_role(_uid,'owner'::app_role)) THEN
    RETURN jsonb_build_object('events','[]'::jsonb);
  END IF;

  RETURN jsonb_build_object('events', COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'event_date')) FROM (
      SELECT jsonb_build_object(
        'event_id', e.id, 'title', e.title, 'event_date', e.event_date,
        'event_kind', COALESCE(e.event_kind,'other'), 'rsvp_deadline', e.rsvp_deadline
      ) AS row
      FROM public.calendar_events e
      WHERE COALESCE(e.is_cancelled,false) = false
        AND e.event_date >= now()
        AND e.event_date <= now() + interval '60 days'
        AND COALESCE(e.event_kind,'other') IN ('trip','incentive')
        AND public.can_view_event(e.scope, e.team_id, _uid)
      ORDER BY e.event_date
      LIMIT 6
    ) q
  ), '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.get_person_time_split(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_person_event_answers(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_event_answer_columns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_person_time_split(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_person_event_answers(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_answer_columns() TO authenticated;