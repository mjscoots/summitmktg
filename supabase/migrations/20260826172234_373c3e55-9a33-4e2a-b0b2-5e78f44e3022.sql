ALTER TABLE public.vertical_steps
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS checklist text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_rule text,
  ADD COLUMN IF NOT EXISTS overdue_days integer NOT NULL DEFAULT 7;

ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS accepting_new boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS intro text;

CREATE OR REPLACE FUNCTION public.autocomplete_life_first_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _step_id uuid;
BEGIN
  IF NEW.vertical IS DISTINCT FROM 'Life' OR NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _step_id FROM public.vertical_steps
  WHERE vertical = 'Life' AND auto_rule = 'first_life_appointment'
  LIMIT 1;

  IF _step_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.vertical_step_completions (user_id, step_id, vertical, completed_at)
  SELECT NEW.created_by, _step_id, 'Life', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.vertical_step_completions c
    WHERE c.user_id = NEW.created_by AND c.step_id = _step_id
  );

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.autocomplete_life_first_appointment() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.autocomplete_life_first_appointment() TO authenticated, service_role;

DROP TRIGGER IF EXISTS life_first_appointment_autocomplete ON public.calendar_events;
CREATE TRIGGER life_first_appointment_autocomplete
AFTER INSERT ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.autocomplete_life_first_appointment();

CREATE OR REPLACE FUNCTION public.get_action_cards()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cards jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('cards','[]'::jsonb); END IF;

  -- unanswered RSVPs: a deadline in the future, or starting within 14 days
  SELECT _cards || COALESCE(jsonb_agg(c ORDER BY c->>'when_at'), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','rsvp', 'id', e.id, 'title', e.title,
             'when_at', e.event_date, 'location', e.location,
             'event_kind', COALESCE(e.event_kind,'other'),
             'rsvp_deadline', e.rsvp_deadline,
             'questions', COALESCE(e.questions,'[]'::jsonb)
           ) AS c, e.event_date
    FROM public.calendar_events e
    WHERE COALESCE(e.is_cancelled,false) = false
      AND e.event_date >= now()
      AND (e.rsvp_deadline IS NULL OR e.rsvp_deadline >= now())
      AND (e.rsvp_deadline IS NOT NULL OR e.event_date <= now() + interval '14 days')
      AND public.can_view_event(e.scope, e.team_id, _uid)
      AND NOT EXISTS (SELECT 1 FROM public.calendar_attendance a
                       WHERE a.event_id = e.id AND a.user_id = _uid)
    LIMIT 20
  ) q;

  -- incentives ending within 7 days
  SELECT _cards || COALESCE(jsonb_agg(c ORDER BY c->>'ends_on'), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','incentive', 'id', i.id, 'title', i.name,
             'metric', i.metric, 'target', i.target, 'ends_on', i.ends_on,
             'prize_note', i.prize_note
           ) AS c
    FROM public.incentives i
    WHERE i.is_active
      AND i.ends_on IS NOT NULL
      AND i.ends_on >= CURRENT_DATE
      AND i.ends_on <= CURRENT_DATE + 7
    LIMIT 10
  ) q;

  -- pinned published announcements not acknowledged
  SELECT _cards || COALESCE(jsonb_agg(c), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','announcement', 'id', ap.id, 'title', ap.title,
             'body', ap.body, 'when_at', ap.created_at
           ) AS c
    FROM public.announcement_posts ap
    WHERE COALESCE(ap.status,'draft') = 'published'
      AND COALESCE(ap.is_pinned,false) = true
      AND NOT EXISTS (SELECT 1 FROM public.announcement_acks a
                       WHERE a.post_id = ap.id AND a.user_id = _uid)
    LIMIT 10
  ) q;

  -- overdue setup steps in the caller's active industries
  SELECT _cards || COALESCE(jsonb_agg(c), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','setup_step', 'id', s.id, 'title', s.title,
             'body', s.description, 'vertical', s.vertical
           ) AS c
    FROM public.rep_vertical_enrollments en
    JOIN public.vertical_steps s
      ON s.vertical = en.vertical AND s.is_active
    WHERE en.user_id = _uid
      AND en.status = 'active'
      AND COALESCE(en.activated_at, en.created_at) < now() - (s.overdue_days * interval '1 day')
      AND NOT EXISTS (
        SELECT 1 FROM public.vertical_step_completions c2
        WHERE c2.user_id = _uid AND c2.step_id = s.id
      )
    ORDER BY s.vertical, s.display_order
    LIMIT 10
  ) q;

  RETURN jsonb_build_object('cards', _cards);
END $function$;