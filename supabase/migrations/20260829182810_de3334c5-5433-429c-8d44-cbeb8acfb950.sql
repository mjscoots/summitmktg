CREATE OR REPLACE FUNCTION public.get_public_counters()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.public_counter_cache;
  season_start date;
  min_reps int;
  min_signs int;
  v_serviced_total numeric;
  v_signed_2027 int;
BEGIN
  SELECT * INTO c FROM public.public_counter_cache WHERE id;

  IF c.refreshed_at < now() - interval '10 minutes' THEN
    season_start := (date_trunc('year', now())::date + interval '3 months')::date;
    IF now()::date < season_start THEN
      season_start := (date_trunc('year', now() - interval '1 year')::date + interval '3 months')::date;
    END IF;

    UPDATE public.public_counter_cache SET
      active_reps = (
        SELECT count(*) FROM public.profiles
        WHERE archived = false AND approved = true
          AND COALESCE(status::text,'') NOT IN ('nlc','rejected','pending')
      ),
      signed_season = (
        SELECT count(*) FROM public.rep_signups WHERE signed_at >= season_start
      ),
      refreshed_at = now()
    WHERE id;

    SELECT * INTO c FROM public.public_counter_cache WHERE id;
  END IF;

  min_reps := COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='public_counter_min_reps'),'')::int, 10);
  min_signs := COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='public_counter_min_signs'),'')::int, 5);

  SELECT COALESCE(sum(pl.season_revenue), 0), count(*) FILTER (WHERE COALESCE(pl.signed_2027, false))
  INTO v_serviced_total, v_signed_2027
  FROM public.people_leads AS pl;

  RETURN jsonb_build_object(
    'active_reps', CASE WHEN c.active_reps >= min_reps THEN c.active_reps ELSE NULL END,
    'signed_season', CASE WHEN c.signed_season >= min_signs THEN c.signed_season ELSE NULL END,
    'serviced_total', v_serviced_total,
    'signed_2027', v_signed_2027
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_counters() TO anon, authenticated;