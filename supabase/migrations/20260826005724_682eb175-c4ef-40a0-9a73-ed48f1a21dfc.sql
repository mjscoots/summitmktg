CREATE OR REPLACE FUNCTION public.my_active_vertical()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.active_vertical FROM public.profiles p WHERE p.id = auth.uid()),
    'Pest'
  )
$$;

REVOKE ALL ON FUNCTION public.my_active_vertical() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_active_vertical() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_chat_channel_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _vert text;
  _channels jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  _vert := public.my_active_vertical();

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.display_order, x.label), '[]'::jsonb)
  INTO _channels
  FROM (
    SELECT v.slug, v.label, v.icon, v.color, v.display_order,
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
    WHERE EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.slug = v.slug
        AND (c.vertical IS NULL OR c.vertical = _vert)
    )
    OR NOT EXISTS (SELECT 1 FROM public.chat_channels c2 WHERE c2.slug = v.slug)
  ) x;

  RETURN jsonb_build_object(
    'channels', _channels,
    'total_unread', (SELECT COALESCE(sum((c->>'unread')::int), 0) FROM jsonb_array_elements(_channels) c)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_events_feed(p_from timestamp with time zone DEFAULT (now() - '60 days'::interval), p_to timestamp with time zone DEFAULT (now() + '60 days'::interval))
RETURNS TABLE(id uuid, title text, description text, event_date timestamp with time zone, location text, event_kind text, scope text, team_id uuid, team_name text, created_by uuid, is_series boolean, my_rsvp text, going_count integer, present_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id, e.title, e.description, e.event_date, e.location,
         coalesce(e.event_kind,'other'), coalesce(e.scope,'everyone'), e.team_id, t.name, e.created_by,
         (e.parent_event_id IS NOT NULL OR e.recurrence_type = 'weekly'),
         (SELECT a.status FROM public.calendar_attendance a WHERE a.event_id = e.id AND a.user_id = auth.uid()),
         (SELECT count(*)::int FROM public.calendar_attendance a WHERE a.event_id = e.id AND a.status = 'attending'),
         (SELECT count(*)::int FROM public.calendar_attendance a WHERE a.event_id = e.id AND a.present = true)
  FROM public.calendar_events e
  LEFT JOIN public.teams t ON t.id = e.team_id
  WHERE e.event_date BETWEEN p_from AND p_to
    AND public.can_view_event(e.scope, e.team_id, auth.uid())
    AND (e.vertical IS NULL OR e.vertical = public.my_active_vertical())
  ORDER BY e.event_date;
$function$;