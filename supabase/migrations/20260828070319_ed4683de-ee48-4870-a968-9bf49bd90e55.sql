CREATE OR REPLACE FUNCTION public.my_referral_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT count(*)::int FROM public.recruiting_leads
    WHERE referrer_user_id = auth.uid()
  ), 0);
$$;

REVOKE ALL ON FUNCTION public.my_referral_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_referral_leads()
RETURNS TABLE(
  id uuid,
  first_name text,
  city text,
  interest_reason text,
  status text,
  claimed_by uuid,
  claimed_name text,
  referrer_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.first_name, l.city, l.interest_reason, l.status, l.claimed_by,
         cp.full_name, rp.full_name, l.created_at
  FROM public.recruiting_leads l
  LEFT JOIN public.profiles rp ON rp.user_id = l.referrer_user_id
  LEFT JOIN public.profiles cp ON cp.user_id = l.claimed_by
  WHERE l.source_type = 'rep_referral'
    AND (
      public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'president')
      OR public.has_role(auth.uid(), 'recruiter')
    )
  ORDER BY l.created_at DESC
  LIMIT 300;
$$;

REVOKE ALL ON FUNCTION public.get_referral_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_leads() TO authenticated;

CREATE OR REPLACE FUNCTION public.referral_counts()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN (
      public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'president')
      OR public.has_role(auth.uid(), 'recruiter')
    )
    THEN (
      SELECT jsonb_build_object(
        'total', count(*),
        'claimed', count(*) FILTER (WHERE claimed_by IS NOT NULL)
      )
      FROM public.recruiting_leads WHERE source_type = 'rep_referral'
    )
    ELSE jsonb_build_object('total', 0, 'claimed', 0)
  END;
$$;

REVOKE ALL ON FUNCTION public.referral_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_counts() TO authenticated;