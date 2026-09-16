CREATE OR REPLACE FUNCTION public.rep_progress_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY lower(row_data->>'full_name')), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'full_name', COALESCE(NULLIF(p.full_name, ''), 'Unnamed rep'),
      'vertical', COALESCE(p.active_vertical, p.vertical, 'Unassigned'),
      'application_count', COALESCE(va.application_count, 0),
      'latest_application_status', va.latest_status,
      'applications', COALESCE(va.applications, '[]'::jsonb),
      'earnings_goal', eg.goal,
      'earnings_goal_updated_at', eg.updated_at,
      'personal_link_count', COALESCE(ml.personal_link_count, 0),
      'personal_links', COALESCE(ml.personal_links, '[]'::jsonb)
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN public.earnings_goals eg ON eg.user_id = p.user_id
    LEFT JOIN LATERAL (
      SELECT
        count(*)::int AS application_count,
        (array_agg(a.status ORDER BY a.created_at DESC))[1] AS latest_status,
        jsonb_agg(jsonb_build_object(
          'id', a.id,
          'vertical', a.vertical,
          'status', a.status,
          'created_at', a.created_at,
          'updated_at', a.updated_at
        ) ORDER BY a.created_at DESC) AS applications
      FROM public.vertical_applications a
      WHERE a.user_id = p.user_id
    ) va ON true
    LEFT JOIN LATERAL (
      SELECT
        count(*)::int AS personal_link_count,
        jsonb_agg(jsonb_build_object(
          'id', l.id,
          'title', l.title,
          'url', l.url,
          'created_at', l.created_at,
          'is_active', l.is_active
        ) ORDER BY l.created_at DESC) AS personal_links
      FROM public.managed_links l
      WHERE l.created_by = p.user_id
        AND l.link_scope = 'personal'
        AND l.is_active = true
    ) ml ON true
    WHERE COALESCE(p.is_spectator, false) = false
  ) rows;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM anon;
REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM service_role;
GRANT EXECUTE ON FUNCTION public.rep_progress_summary() TO authenticated;