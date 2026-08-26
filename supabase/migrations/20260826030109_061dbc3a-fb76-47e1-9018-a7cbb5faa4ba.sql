CREATE OR REPLACE FUNCTION public.leads_manager_options()
RETURNS TABLE(user_id uuid, full_name text, designated_count integer, has_access boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.full_name,
         (SELECT COUNT(*)::int FROM public.people_leads l
           WHERE l.bucket = 'lead' AND l.designated_to = p.user_id) AS designated_count,
         (p.approved AND NOT p.archived) AS has_access
  FROM public.profiles p
  WHERE public.user_tier(auth.uid()) IN ('admin','owner')
    AND p.user_id IS NOT NULL
    AND NOT COALESCE(p.archived,false)
    AND (public.has_role(p.user_id,'manager'::app_role)
         OR public.has_role(p.user_id,'president'::app_role)
         OR public.has_role(p.user_id,'admin'::app_role)
         OR public.has_role(p.user_id,'owner'::app_role))
  ORDER BY p.full_name;
$function$;
