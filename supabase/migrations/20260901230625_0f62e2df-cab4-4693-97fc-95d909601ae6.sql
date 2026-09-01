CREATE OR REPLACE FUNCTION public.people_awaiting_industry()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
      THEN '[]'::jsonb
    ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'invited_vertical', p.vertical,
        'manager_name', (SELECT m.full_name FROM public.profiles m WHERE m.user_id = p.manager_id)
      ) ORDER BY p.created_at DESC)
      FROM public.profiles p
      WHERE p.archived = false
        AND COALESCE(p.status::text,'') <> 'nlc'
        AND NOT EXISTS (
          SELECT 1 FROM public.rep_vertical_enrollments e
          WHERE e.user_id = p.user_id
            AND e.status IN ('approved','onboarding','active','paused')
        )
    ), '[]'::jsonb)
  END;
$function$;

REVOKE ALL ON FUNCTION public.people_awaiting_industry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.people_awaiting_industry() TO authenticated;