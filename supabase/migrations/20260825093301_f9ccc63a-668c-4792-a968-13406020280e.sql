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

    INSERT INTO public.user_notifications (user_id, title, message, link, event_id, deliver_after)
    SELECT p.user_id,
           ev.title,
           'Starts in 2 hours' || CASE WHEN ev.location IS NOT NULL AND ev.location <> '' THEN ' — ' || ev.location ELSE '' END,
           '/app/events',
           ev.id,
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
        WHERE n.user_id = p.user_id AND n.event_id = ev.id AND n.link = '/app/events'
      );
    made := made + 1;
  END LOOP;
  RETURN made;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_event_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expand_event_series(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expand_event_series(integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.can_view_event(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_event(text, uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_events_feed(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_events_feed(timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rsvp_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_event_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_checkin(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_event_present(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_event_present(uuid, uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_attendance_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_summary(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_missed_meeting_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_missed_meeting_flags() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.freeze_event_attendance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_privileged_profile_fields() FROM PUBLIC, anon, authenticated;