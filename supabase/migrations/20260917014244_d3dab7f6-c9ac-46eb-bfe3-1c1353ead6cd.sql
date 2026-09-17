CREATE OR REPLACE FUNCTION public.get_public_counters()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  c public.public_counter_cache;
  min_reps int;
  min_signs int;
  v_serviced_total numeric;
  v_signed_2027 int;
  v_top_rep numeric;
  v_over_100k int;
  v_over_50k int;
BEGIN
  SELECT * INTO c FROM public.public_counter_cache WHERE id;

  min_reps := COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='public_counter_min_reps'),'')::int, 10);
  min_signs := COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='public_counter_min_signs'),'')::int, 5);

  SELECT COALESCE(sum(pl.season_revenue), 0),
         count(*) FILTER (WHERE COALESCE(pl.signed_2027, false)),
         max(pl.season_revenue),
         count(*) FILTER (WHERE pl.season_revenue > 100000),
         count(*) FILTER (WHERE pl.season_revenue > 50000)
  INTO v_serviced_total, v_signed_2027, v_top_rep, v_over_100k, v_over_50k
  FROM public.people_leads AS pl;

  RETURN jsonb_build_object(
    'active_reps', CASE WHEN c.active_reps >= min_reps THEN c.active_reps ELSE NULL END,
    'signed_season', CASE WHEN c.signed_season >= min_signs THEN c.signed_season ELSE NULL END,
    'serviced_total', v_serviced_total,
    'signed_2027', v_signed_2027,
    'top_rep_revenue', v_top_rep,
    'reps_over_100k', CASE WHEN v_over_100k > 0 THEN v_over_100k ELSE NULL END,
    'reps_over_50k', CASE WHEN v_over_50k > 0 THEN v_over_50k ELSE NULL END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_counters() TO anon, authenticated;