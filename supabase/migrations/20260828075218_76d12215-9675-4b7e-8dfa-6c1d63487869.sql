CREATE OR REPLACE FUNCTION public.owner_week()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _zero jsonb := jsonb_build_object(
    'signed_total', 0, 'signed_recent', 0,
    'calls', 0, 'calls_people', 0,
    'apps_waiting', 0, 'apps_oldest_hours', 0,
    'referrals_total', 0, 'referrals_claimed', 0,
    'training_minutes', 0, 'training_reps', 0, 'active_reps', 0,
    'fiber_loaded_at', NULL, 'pest_loaded_at', NULL,
    'authorized', false
  );
  _out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN _zero;
  END IF;

  SELECT jsonb_build_object(
    'signed_total', (SELECT count(*) FROM public.people_leads WHERE signed_2027),
    'signed_recent', (
      SELECT count(DISTINCT la.lead_id) FROM public.lead_activities la
      WHERE la.created_at >= now() - interval '7 days'
        AND la.outcome = 'signed_2027'
    ),
    'calls', (SELECT count(*) FROM public.lead_activities WHERE created_at >= now() - interval '7 days'),
    'calls_people', (SELECT count(DISTINCT lead_id) FROM public.lead_activities WHERE created_at >= now() - interval '7 days'),
    'apps_waiting', (SELECT count(*) FROM public.applications WHERE status = 'pending'),
    'apps_oldest_hours', COALESCE((
      SELECT FLOOR(EXTRACT(EPOCH FROM (now() - MIN(created_at))) / 3600)
      FROM public.applications WHERE status = 'pending'), 0),
    'referrals_total', (SELECT count(*) FROM public.recruiting_leads WHERE source_type = 'rep_referral'),
    'referrals_claimed', (SELECT count(*) FROM public.recruiting_leads WHERE source_type = 'rep_referral' AND claimed_by IS NOT NULL),
    'training_minutes', (
      SELECT COALESCE(sum(COALESCE(training_minutes, 0)), 0) FROM public.daily_training_time
      WHERE date >= (now() - interval '7 days')::date),
    'training_reps', (
      SELECT count(DISTINCT user_id) FROM public.daily_training_time
      WHERE date >= (now() - interval '7 days')::date AND COALESCE(training_minutes, 0) > 0),
    'active_reps', (
      SELECT count(*) FROM public.profiles
      WHERE status = 'active' AND COALESCE(archived, false) = false),
    'fiber_loaded_at', (SELECT max(committed_at) FROM public.revenue_import_batches WHERE kind = 'fiber_week' AND status = 'committed'),
    'pest_loaded_at', (SELECT max(committed_at) FROM public.revenue_import_batches WHERE kind = 'pest_revenue' AND status = 'committed'),
    'authorized', true
  ) INTO _out;

  RETURN _out;
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_week() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_week() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_week() TO service_role;