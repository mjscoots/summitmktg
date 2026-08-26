CREATE OR REPLACE FUNCTION public.get_fiber_leaderboard(p_week_start date DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, installs integer, rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT fi.user_id, SUM(fi.installs)::int AS installs
    FROM public.fiber_installs fi
    WHERE (p_week_start IS NULL OR fi.week_start = p_week_start)
    GROUP BY fi.user_id
  )
  SELECT t.user_id,
         p.full_name,
         t.installs,
         RANK() OVER (ORDER BY t.installs DESC)::int
  FROM totals t
  JOIN public.profiles p ON p.id = t.user_id
  WHERE t.installs > 0
    AND EXISTS (
      SELECT 1 FROM public.rep_vertical_enrollments e
      WHERE e.user_id = auth.uid()
        AND e.vertical = 'Fiber'
        AND e.status IN ('approved','onboarding','active','paused')
    )
  ORDER BY t.installs DESC
  LIMIT 100
$$;

REVOKE ALL ON FUNCTION public.get_fiber_leaderboard(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fiber_leaderboard(date) TO authenticated, service_role;