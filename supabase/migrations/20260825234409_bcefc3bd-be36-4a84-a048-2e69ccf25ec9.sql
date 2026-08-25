DROP VIEW IF EXISTS public.manager_directory;

CREATE OR REPLACE FUNCTION public.get_manager_directory()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN '[]'::jsonb ELSE COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'nickname', p.nickname,
      'avatar_url', p.avatar_url,
      'manager_intro', p.manager_intro,
      'mentee_capacity', p.mentee_capacity,
      'office_name', p.office_name,
      'vertical', p.vertical,
      'rank_name', r.name,
      'accepting_new_reps', p.accepting_new_reps
    ) ORDER BY p.full_name)
    FROM public.profiles p
    LEFT JOIN public.ranks r ON r.id = p.rank_id
   WHERE p.archived = false AND p.status = 'active'
     AND public.has_role(p.user_id, 'manager')
  ), '[]'::jsonb) END;
$$;
REVOKE ALL ON FUNCTION public.get_manager_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_manager_directory() TO authenticated, service_role;