-- Server side resolve for the pillar join flow. Not callable by anon or signed in users.
CREATE OR REPLACE FUNCTION public.pillar_link_resolve(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'valid', true,
      'team_id', t.id,
      'pillar_name', t.name,
      'vertical', t.vertical,
      'leader_id', t.leader_id
    )
    FROM public.pillar_links l
    JOIN public.teams t ON t.id = l.team_id
    WHERE l.token = p_token AND COALESCE(t.retired, false) = false
    LIMIT 1
  ), jsonb_build_object('valid', false));
$$;

-- The managers a person is allowed to place someone under.
CREATE OR REPLACE FUNCTION public.my_system_managers()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'team_name', (SELECT t.name FROM public.teams t WHERE t.id = p.team_id)
    ) ORDER BY p.full_name)
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL
      AND COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND public.is_in_my_system(auth.uid(), p.user_id)
      AND (
        public.is_effective_manager(p.user_id)
        OR p.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.leader_id = p.user_id)
      )
  ), '[]'::jsonb);
$$;

REVOKE ALL ON FUNCTION public.pillar_link_resolve(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pillar_link_resolve(text) TO service_role;

REVOKE ALL ON FUNCTION public.my_system_managers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_system_managers() TO authenticated, service_role;