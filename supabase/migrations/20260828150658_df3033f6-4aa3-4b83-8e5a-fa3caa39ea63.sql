DROP FUNCTION IF EXISTS public.get_events_feed(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_events_feed(
  p_from timestamptz DEFAULT (now() - '60 days'::interval),
  p_to timestamptz DEFAULT (now() + '60 days'::interval)
)
RETURNS TABLE(
  id uuid, title text, description text, event_date timestamptz, end_date timestamptz,
  location text, event_kind text, scope text, team_id uuid, team_name text,
  created_by uuid, is_series boolean, my_rsvp text, going_count integer, present_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND (e.vertical IS NULL OR e.vertical = public.my_active_vertical())
  ORDER BY e.event_date;
$function$;

REVOKE ALL ON FUNCTION public.get_events_feed(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_events_feed(timestamptz, timestamptz) TO authenticated;