CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.value
  FROM public.app_settings s
  WHERE s.key = _key
    AND (
      _key LIKE 'calc\_%'
      OR _key IN (
        'public_fiber_starting_rate',
        'publish_stacks_publicly',
        'public_counter_min_reps',
        'public_counter_min_signs',
        'fiber_calc_default_weeks',
        'fiber_calc_min_weeks',
        'fiber_calc_max_weeks',
        'owner_photo',
        'owner_calendly'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_public_managers()
RETURNS TABLE(first_name text, office_name text, manager_intro text, pillar_token text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    split_part(btrim(p.full_name), ' ', 1) AS first_name,
    p.office_name,
    p.manager_intro,
    (
      SELECT l.token
      FROM public.pillar_links l
      JOIN public.teams t ON t.id = l.team_id
      WHERE t.slug = p.pillar_slug
        AND COALESCE(t.retired, false) = false
        AND l.expires_at > now()
      ORDER BY l.expires_at DESC
      LIMIT 1
    ) AS pillar_token
  FROM public.profiles p
  WHERE p.pillar_slug IS NOT NULL
    AND COALESCE(p.archived, false) = false
    AND p.accepting_new_reps IS TRUE
    AND COALESCE(btrim(p.manager_intro), '') <> ''
  ORDER BY 1;
$function$;

REVOKE ALL ON FUNCTION public.get_public_managers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_managers() TO anon, authenticated;