-- 1. Event shape additions (calendar_events is the single backing store)
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS event_kind text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'everyone';

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_series_occurrence_uniq
  ON public.calendar_events (parent_event_id, event_date)
  WHERE parent_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calendar_events_date_idx ON public.calendar_events (event_date);

-- 2. Attendance additions
ALTER TABLE public.calendar_attendance
  ADD COLUMN IF NOT EXISTS present boolean,
  ADD COLUMN IF NOT EXISTS marked_by uuid,
  ADD COLUMN IF NOT EXISTS marked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_attendance_event_user_uniq
  ON public.calendar_attendance (event_id, user_id);

-- 3. Freeze attendance 24h after the event
CREATE OR REPLACE FUNCTION public.freeze_event_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev_date timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner') THEN RETURN NEW; END IF;
  SELECT event_date INTO ev_date FROM public.calendar_events WHERE id = NEW.event_id;
  IF ev_date IS NOT NULL AND now() > ev_date + interval '24 hours' THEN
    RAISE EXCEPTION 'Attendance for this event is closed';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS freeze_event_attendance_trg ON public.calendar_attendance;
CREATE TRIGGER freeze_event_attendance_trg
BEFORE INSERT OR UPDATE ON public.calendar_attendance
FOR EACH ROW EXECUTE FUNCTION public.freeze_event_attendance();

-- 4. Scope-aware visibility
CREATE OR REPLACE FUNCTION public.can_view_event(p_scope text, p_team_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_user_id IS NULL THEN false
    WHEN public.has_role(p_user_id,'manager') OR public.has_role(p_user_id,'admin') OR public.has_role(p_user_id,'owner') THEN true
    WHEN coalesce(p_scope,'everyone') = 'managers' THEN false
    WHEN coalesce(p_scope,'everyone') = 'team' THEN p_team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id AND p.team_id = p_team_id AND coalesce(p.archived,false) = false
    )
    ELSE EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id AND coalesce(p.archived,false) = false)
  END;
$$;
REVOKE ALL ON FUNCTION public.can_view_event(text, uuid, uuid) FROM anon;

DROP POLICY IF EXISTS "Authenticated users can view calendar events" ON public.calendar_events;
CREATE POLICY "Members view events in their scope"
ON public.calendar_events FOR SELECT TO authenticated
USING (public.can_view_event(scope, team_id, auth.uid()));

-- 5. Weekly series expansion (idempotent, never duplicates)
CREATE OR REPLACE FUNCTION public.expand_event_series(p_weeks integer DEFAULT 8)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent record;
  occ timestamptz;
  made integer := 0;
BEGIN
  FOR parent IN
    SELECT * FROM public.calendar_events
    WHERE recurrence_type = 'weekly' AND parent_event_id IS NULL
  LOOP
    occ := parent.event_date + interval '7 days';
    WHILE occ <= now() + (p_weeks || ' weeks')::interval LOOP
      IF parent.recurrence_end_date IS NULL OR occ <= parent.recurrence_end_date THEN
        INSERT INTO public.calendar_events (
          title, description, event_date, end_date, created_by, team_id, target_role,
          location, event_type, event_kind, scope, manager_id, is_team_wide, parent_event_id, timezone
        )
        VALUES (
          parent.title, parent.description, occ,
          CASE WHEN parent.end_date IS NULL THEN NULL ELSE occ + (parent.end_date - parent.event_date) END,
          parent.created_by, parent.team_id, parent.target_role, parent.location, parent.event_type,
          parent.event_kind, parent.scope, parent.manager_id, parent.is_team_wide, parent.id, parent.timezone
        )
        ON CONFLICT (parent_event_id, event_date) WHERE parent_event_id IS NOT NULL DO NOTHING;
        made := made + 1;
      END IF;
      occ := occ + interval '7 days';
    END LOOP;
  END LOOP;
  RETURN made;
END; $$;
REVOKE ALL ON FUNCTION public.expand_event_series(integer) FROM anon;

-- 6. Feed
CREATE OR REPLACE FUNCTION public.get_events_feed(p_from timestamptz DEFAULT (now() - interval '60 days'), p_to timestamptz DEFAULT (now() + interval '60 days'))
RETURNS TABLE (
  id uuid, title text, description text, event_date timestamptz, location text,
  event_kind text, scope text, team_id uuid, team_name text, created_by uuid,
  is_series boolean, my_rsvp text, going_count integer, present_count integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  ORDER BY e.event_date;
$$;
REVOKE ALL ON FUNCTION public.get_events_feed(timestamptz, timestamptz) FROM anon;

-- 7. RSVP
CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_status NOT IN ('attending','not_attending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Event not available';
  END IF;
  INSERT INTO public.calendar_attendance (event_id, user_id, status)
  VALUES (p_event_id, auth.uid(), p_status)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = excluded.status, updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.rsvp_event(uuid, text) FROM anon;

-- 8. Check-in roster (managers+)
CREATE OR REPLACE FUNCTION public.get_event_checkin(p_event_id uuid)
RETURNS TABLE (user_id uuid, full_name text, team_name text, rsvp text, present boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ev record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id;
  IF ev IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, t.name,
         a.status, a.present
  FROM public.profiles p
  LEFT JOIN public.teams t ON t.id = p.team_id
  LEFT JOIN public.calendar_attendance a ON a.event_id = p_event_id AND a.user_id = p.user_id
  WHERE coalesce(p.archived,false) = false
    AND p.status <> 'nlc'
    AND (
      coalesce(ev.scope,'everyone') = 'everyone'
      OR (coalesce(ev.scope,'everyone') = 'team' AND p.team_id = ev.team_id)
      OR (coalesce(ev.scope,'everyone') = 'managers' AND (public.has_role(p.user_id,'manager') OR public.has_role(p.user_id,'admin') OR public.has_role(p.user_id,'owner')))
    )
  ORDER BY (a.status = 'attending') DESC NULLS LAST, p.full_name;
END; $$;
REVOKE ALL ON FUNCTION public.get_event_checkin(uuid) FROM anon;

-- 9. Mark present (managers+)
CREATE OR REPLACE FUNCTION public.mark_event_present(p_event_id uuid, p_user_id uuid, p_present boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  INSERT INTO public.calendar_attendance (event_id, user_id, status, present, marked_by, marked_at)
  VALUES (p_event_id, p_user_id, 'attending', p_present, auth.uid(), now())
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET present = excluded.present, marked_by = auth.uid(), marked_at = now(), updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.mark_event_present(uuid, uuid, boolean) FROM anon;

-- 10. Attendance % (last 30 days, meeting-kind events only)
CREATE OR REPLACE FUNCTION public.get_attendance_summary(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (expected integer, present integer, pct integer, missed_streak integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid := coalesce(p_user_id, auth.uid());
  is_staff boolean;
BEGIN
  is_staff := public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner');
  IF target <> auth.uid() AND NOT is_staff THEN RAISE EXCEPTION 'Not allowed'; END IF;

  RETURN QUERY
  WITH ev AS (
    SELECT e.id, e.event_date
    FROM public.calendar_events e
    JOIN public.profiles p ON p.user_id = target
    WHERE coalesce(e.event_kind,'other') = 'meeting'
      AND e.event_date < now()
      AND e.event_date >= now() - interval '30 days'
      AND (
        coalesce(e.scope,'everyone') = 'everyone'
        OR (coalesce(e.scope,'everyone') = 'team' AND p.team_id = e.team_id)
        OR (coalesce(e.scope,'everyone') = 'managers' AND public.has_role(target,'manager'))
      )
  ), marked AS (
    SELECT ev.id, ev.event_date, coalesce(a.present, false) AS was_present
    FROM ev LEFT JOIN public.calendar_attendance a ON a.event_id = ev.id AND a.user_id = target
  ), streak AS (
    SELECT count(*)::int AS n FROM (
      SELECT was_present, row_number() OVER (ORDER BY event_date DESC) rn,
             sum(CASE WHEN was_present THEN 1 ELSE 0 END) OVER (ORDER BY event_date DESC) AS presents_so_far
      FROM marked
    ) s WHERE presents_so_far = 0
  )
  SELECT (SELECT count(*)::int FROM marked),
         (SELECT count(*)::int FROM marked WHERE was_present),
         CASE WHEN (SELECT count(*) FROM marked) = 0 THEN 0
              ELSE round(100.0 * (SELECT count(*) FROM marked WHERE was_present) / (SELECT count(*) FROM marked))::int END,
         (SELECT n FROM streak);
END; $$;
REVOKE ALL ON FUNCTION public.get_attendance_summary(uuid) FROM anon;

-- 11. Missed-meeting flags for a team (managers+)
CREATE OR REPLACE FUNCTION public.get_missed_meeting_flags()
RETURNS TABLE (user_id uuid, missed_streak integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN QUERY
  WITH meets AS (
    SELECT e.id, e.event_date, e.scope, e.team_id
    FROM public.calendar_events e
    WHERE coalesce(e.event_kind,'other') = 'meeting'
      AND e.event_date < now() AND e.event_date >= now() - interval '30 days'
  ), pairs AS (
    SELECT p.user_id, m.id, m.event_date, coalesce(a.present,false) AS was_present
    FROM public.profiles p
    JOIN meets m ON (
      coalesce(m.scope,'everyone') = 'everyone'
      OR (coalesce(m.scope,'everyone') = 'team' AND p.team_id = m.team_id)
    )
    LEFT JOIN public.calendar_attendance a ON a.event_id = m.id AND a.user_id = p.user_id
    WHERE coalesce(p.archived,false) = false AND p.status <> 'nlc'
  ), ranked AS (
    SELECT user_id, was_present,
           sum(CASE WHEN was_present THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY event_date DESC) AS presents_so_far
    FROM pairs
  )
  SELECT r.user_id, count(*)::int
  FROM ranked r
  WHERE r.presents_so_far = 0 AND r.was_present = false
  GROUP BY r.user_id
  HAVING count(*) >= 2;
END; $$;
REVOKE ALL ON FUNCTION public.get_missed_meeting_flags() FROM anon;

-- 12. Reminder notifications, 2h before, one per user per event
CREATE OR REPLACE FUNCTION public.notify_event_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev record;
  made integer := 0;
  local_hour integer;
BEGIN
  FOR ev IN
    SELECT e.* FROM public.calendar_events e
    WHERE e.event_date BETWEEN now() + interval '105 minutes' AND now() + interval '135 minutes'
  LOOP
    local_hour := EXTRACT(hour FROM (ev.event_date AT TIME ZONE coalesce(ev.timezone,'America/Los_Angeles')))::int;

    INSERT INTO public.user_notifications (user_id, kind, title, body, link, deliver_after)
    SELECT p.user_id, 'event_reminder',
           ev.title,
           'Starts in 2 hours' || CASE WHEN ev.location IS NOT NULL AND ev.location <> '' THEN ' — ' || ev.location ELSE '' END,
           '/app/events',
           CASE WHEN local_hour >= 22 OR local_hour < 7 THEN public.notification_deliver_at(now()) ELSE now() END
    FROM public.profiles p
    LEFT JOIN public.calendar_attendance a ON a.event_id = ev.id AND a.user_id = p.user_id
    WHERE coalesce(p.archived,false) = false
      AND p.status <> 'nlc'
      AND (
        coalesce(ev.scope,'everyone') = 'everyone'
        OR (coalesce(ev.scope,'everyone') = 'team' AND p.team_id = ev.team_id)
        OR (coalesce(ev.scope,'everyone') = 'managers' AND public.has_role(p.user_id,'manager'))
      )
      AND coalesce(a.status,'attending') = 'attending'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_notifications n
        WHERE n.user_id = p.user_id AND n.kind = 'event_reminder'
          AND n.link = '/app/events' AND n.title = ev.title
          AND n.created_at > ev.event_date - interval '1 day'
      );
    made := made + 1;
  END LOOP;
  RETURN made;
END; $$;
REVOKE ALL ON FUNCTION public.notify_event_reminders() FROM anon;
REVOKE ALL ON FUNCTION public.notify_event_reminders() FROM authenticated;

SELECT cron.schedule('event-reminders', '*/15 * * * *', $$select public.notify_event_reminders();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'event-reminders');
SELECT cron.schedule('expand-event-series', '17 3 * * *', $$select public.expand_event_series(8);$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expand-event-series');