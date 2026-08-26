CREATE OR REPLACE FUNCTION public.is_first_week_eligible(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _target
      and coalesce(p.archived, false) = false
      and (
        exists (select 1 from public.user_roles r where r.user_id = _target and r.role = 'rookie'::public.app_role)
        or (
          p.created_at > now() - interval '30 days'
          and not exists (select 1 from public.season_results s where s.user_id = _target)
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.is_first_week_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_first_week_eligible(uuid) TO authenticated, service_role;