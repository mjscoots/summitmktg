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
    -- skip forward to the current week instead of back-filling history
    WHILE occ < now() - interval '1 day' LOOP
      occ := occ + interval '7 days';
    END LOOP;
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
REVOKE ALL ON FUNCTION public.expand_event_series(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expand_event_series(integer) TO authenticated, service_role;

DELETE FROM public.calendar_events e
WHERE e.parent_event_id IS NOT NULL
  AND e.event_date < now() - interval '1 day'
  AND NOT EXISTS (SELECT 1 FROM public.calendar_attendance a WHERE a.event_id = e.id);