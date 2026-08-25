CREATE OR REPLACE FUNCTION public.get_attendance_flags()
RETURNS TABLE (user_id uuid, missed_streak integer, pct integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  WITH meetings AS (
    SELECT e.id, e.event_date
    FROM public.calendar_events e
    WHERE e.event_kind = 'meeting'
      AND e.event_date >= now() - interval '30 days'
      AND e.event_date <= now()
  ),
  rows AS (
    SELECT a.user_id,
           m.event_date,
           coalesce(a.present, false) AS present,
           row_number() OVER (PARTITION BY a.user_id ORDER BY m.event_date DESC) AS rn
    FROM public.calendar_attendance a
    JOIN meetings m ON m.id = a.event_id
    JOIN public.profiles p ON p.user_id = a.user_id AND p.archived = false
  ),
  streaks AS (
    SELECT r.user_id,
           coalesce((
             SELECT min(r2.rn) - 1
             FROM rows r2
             WHERE r2.user_id = r.user_id AND r2.present
           ), (SELECT max(r3.rn) FROM rows r3 WHERE r3.user_id = r.user_id)) AS missed_streak
    FROM rows r
    GROUP BY r.user_id
  ),
  pcts AS (
    SELECT r.user_id,
           count(*) AS expected,
           count(*) FILTER (WHERE r.present) AS present_count
    FROM rows r
    GROUP BY r.user_id
  )
  SELECT s.user_id,
         s.missed_streak::integer,
         CASE WHEN p.expected > 0 THEN round((p.present_count::numeric / p.expected) * 100)::integer ELSE 0 END
  FROM streaks s
  JOIN pcts p ON p.user_id = s.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_flags() TO authenticated;