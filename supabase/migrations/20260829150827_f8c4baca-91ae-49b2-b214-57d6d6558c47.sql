CREATE OR REPLACE FUNCTION public.parse_rep_year_text(_raw text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(1, COALESCE(NULLIF(regexp_replace(COALESCE(_raw, ''), '\D', '', 'g'), '')::int, 1))
$function$;

CREATE OR REPLACE FUNCTION public.role_chips(_user_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_object_agg(t.user_id::text, t.label), '{}'::jsonb)
  FROM (
    SELECT p.user_id,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'owner'::app_role) THEN 'Owner'
        WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'admin'::app_role) THEN 'Admin'
        WHEN public.is_effective_manager(p.user_id) THEN 'Manager'
        WHEN p.rep_year IS NULL OR btrim(p.rep_year) = '' THEN NULL
        WHEN public.parse_rep_year_text(p.rep_year) >= 2 THEN 'Vet'
        ELSE 'Rookie'
      END AS label
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
      AND auth.uid() IS NOT NULL
  ) t
  WHERE t.label IS NOT NULL
$function$;

REVOKE ALL ON FUNCTION public.role_chips(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.parse_rep_year_text(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_chips(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parse_rep_year_text(text) TO authenticated, service_role;