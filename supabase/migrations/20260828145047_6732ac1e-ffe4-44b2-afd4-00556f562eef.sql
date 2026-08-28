-- 1) Applications gain a terminal "converted" state
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status = ANY (ARRAY['pending'::text,'reviewed'::text,'accepted'::text,'rejected'::text,'converted'::text]));

-- 2) Recruiting leads can carry an application origin
ALTER TABLE public.recruiting_leads DROP CONSTRAINT IF EXISTS recruiting_leads_source_type_check;
ALTER TABLE public.recruiting_leads ADD CONSTRAINT recruiting_leads_source_type_check
  CHECK (source_type = ANY (ARRAY['golden_ticket'::text,'rep_referral'::text,'partner'::text,'organic'::text,'other'::text,'application'::text]));

-- 3) Scheduling requests can expire
ALTER TABLE public.scheduling_requests DROP CONSTRAINT IF EXISTS scheduling_requests_status_check;
ALTER TABLE public.scheduling_requests ADD CONSTRAINT scheduling_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text,'confirmed'::text,'reschedule_requested'::text,'completed'::text,'cancelled'::text,'expired'::text]));

CREATE OR REPLACE FUNCTION public.expire_stale_scheduling_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  WITH dead AS (
    UPDATE public.scheduling_requests sr
    SET status = 'expired'
    WHERE sr.status = 'pending'
      AND (
        sr.created_at < now() - interval '30 days'
        OR NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = sr.recipient_id
            AND p.archived_at IS NULL
            AND p.status <> 'nlc'
        )
      )
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM dead;

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_scheduling_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_scheduling_requests() TO authenticated;

-- 4) Owner and admin can hard delete an event, or a whole series
CREATE OR REPLACE FUNCTION public.delete_calendar_event(p_event_id uuid, p_series boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _root uuid;
  _ids uuid[];
  _n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_series THEN
    SELECT COALESCE(parent_event_id, id) INTO _root FROM public.calendar_events WHERE id = p_event_id;
    IF _root IS NULL THEN RETURN 0; END IF;
    SELECT array_agg(id) INTO _ids FROM public.calendar_events
      WHERE id = _root OR parent_event_id = _root;
  ELSE
    _ids := ARRAY[p_event_id];
  END IF;

  DELETE FROM public.calendar_attendance WHERE event_id = ANY(_ids);
  DELETE FROM public.calendar_event_assignees WHERE event_id = ANY(_ids);
  DELETE FROM public.event_notifications WHERE event_id = ANY(_ids);
  DELETE FROM public.calendar_events WHERE id = ANY(_ids);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_calendar_event(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_calendar_event(uuid, boolean) TO authenticated;

-- 5) Cancelled events never render
CREATE OR REPLACE FUNCTION public.get_events_feed(
  p_from timestamp with time zone DEFAULT (now() - '60 days'::interval),
  p_to timestamp with time zone DEFAULT (now() + '60 days'::interval))
RETURNS TABLE(id uuid, title text, description text, event_date timestamp with time zone, location text,
  event_kind text, scope text, team_id uuid, team_name text, created_by uuid, is_series boolean,
  my_rsvp text, going_count integer, present_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.title, e.description, e.event_date, e.location,
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
$$;
