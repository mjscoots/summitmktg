CREATE OR REPLACE FUNCTION public.leads_counts()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'president')
    THEN jsonb_build_object(
      'out', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND roster_status = 'out'),
      'pool', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND designated_to IS NULL),
      'designated', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND designated_to IS NOT NULL),
      'signed_2027', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND signed_2027),
      -- Pass 111: historical names carry no revenue and no seat, so they leave
      -- the denominator everywhere the signed count is shown.
      'roster_total', (SELECT count(*) FROM public.people_leads WHERE COALESCE(roster_status, '') <> 'not_on_roster'),
      'signed_count', (SELECT count(*) FROM public.people_leads WHERE signed_2027 AND COALESCE(roster_status, '') <> 'not_on_roster'),
      'signed_revenue', (SELECT COALESCE(sum(season_revenue), 0) FROM public.people_leads WHERE signed_2027 AND COALESCE(roster_status, '') <> 'not_on_roster'),
      'unsigned_count', (SELECT count(*) FROM public.people_leads WHERE COALESCE(signed_2027, false) = false AND COALESCE(roster_status, '') <> 'not_on_roster'),
      'unsigned_revenue', (SELECT COALESCE(sum(season_revenue), 0) FROM public.people_leads WHERE COALESCE(signed_2027, false) = false AND COALESCE(roster_status, '') <> 'not_on_roster')
    )
    ELSE jsonb_build_object('out', 0, 'pool', 0, 'designated', 0, 'signed_2027', 0, 'roster_total', 0,
      'signed_count', 0, 'signed_revenue', 0, 'unsigned_count', 0, 'unsigned_revenue', 0)
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.leads_counts() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.leads_counts() TO authenticated;