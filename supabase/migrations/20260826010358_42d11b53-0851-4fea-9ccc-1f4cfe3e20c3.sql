CREATE OR REPLACE FUNCTION public.get_workspace_mentionables()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.archived = false
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.rep_vertical_enrollments e
      WHERE e.user_id = p.user_id
        AND e.vertical = public.my_active_vertical()
        AND e.status IN ('approved','onboarding','active','paused')
    )
  ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.get_workspace_mentionables() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_mentionables() TO authenticated, service_role;