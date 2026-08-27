CREATE OR REPLACE FUNCTION public.leads_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'president')
    THEN jsonb_build_object(
      'pool', (SELECT count(*) FROM public.people_leads WHERE stage = 'new' AND designated_to IS NULL),
      'designated', (SELECT count(*) FROM public.people_leads WHERE designated_to IS NOT NULL),
      'signed_2027', (SELECT count(*) FROM public.people_leads WHERE signed_2027)
    )
    ELSE jsonb_build_object('pool', 0, 'designated', 0, 'signed_2027', 0)
  END
$$;

REVOKE ALL ON FUNCTION public.leads_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.leads_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leads_counts() TO service_role;