ALTER TABLE public.weekly_one_on_ones_rookie ADD COLUMN IF NOT EXISTS commitment text;
ALTER TABLE public.weekly_one_on_ones_rookie ADD COLUMN IF NOT EXISTS focus_area text;
ALTER TABLE public.weekly_one_on_ones_manager ADD COLUMN IF NOT EXISTS commitment text;
ALTER TABLE public.weekly_one_on_ones_manager ADD COLUMN IF NOT EXISTS focus_area text;

ALTER TABLE public.weekly_one_on_ones_rookie ADD CONSTRAINT wooo_rookie_focus_area_chk CHECK (focus_area IS NULL OR focus_area IN ('skill','desire','activity'));
ALTER TABLE public.weekly_one_on_ones_manager ADD CONSTRAINT wooo_manager_focus_area_chk CHECK (focus_area IS NULL OR focus_area IN ('skill','desire','activity'));

-- Column-level read lockdown: nobody (rep or manager) reads commitment/focus_area
-- through the Data API. Managers read them via the security-definer RPC below.
DO $$
DECLARE t text; c text;
BEGIN
  FOREACH t IN ARRAY ARRAY['weekly_one_on_ones_rookie','weekly_one_on_ones_manager'] LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated', t);
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    FOR c IN
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t
        AND column_name NOT IN ('commitment','focus_area')
    LOOP
      EXECUTE format('GRANT SELECT (%I) ON public.%I TO authenticated', c, t);
    END LOOP;
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_prep_commitment(_user_id uuid, _mode text DEFAULT 'rookie')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
  ) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  IF _mode = 'manager' THEN
    SELECT commitment, focus_area, coalesce(submitted_at, created_at) AS at
      INTO r
      FROM weekly_one_on_ones_manager
     WHERE manager_user_id = _user_id AND commitment IS NOT NULL AND btrim(commitment) <> ''
     ORDER BY coalesce(submitted_at, created_at) DESC LIMIT 1;
  ELSE
    SELECT commitment, focus_area, coalesce(submitted_at, created_at) AS at
      INTO r
      FROM weekly_one_on_ones_rookie
     WHERE rookie_user_id = _user_id AND commitment IS NOT NULL AND btrim(commitment) <> ''
     ORDER BY coalesce(submitted_at, created_at) DESC LIMIT 1;
  END IF;

  IF r IS NULL THEN
    RETURN jsonb_build_object('authorized', true, 'commitment', NULL, 'focus_area', NULL, 'at', NULL);
  END IF;

  RETURN jsonb_build_object('authorized', true, 'commitment', r.commitment, 'focus_area', r.focus_area, 'at', r.at);
END $$;

CREATE OR REPLACE FUNCTION public.get_rep_prep_facts(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date := (now() AT TIME ZONE 'America/Los_Angeles')::date - ((extract(isodow from (now() AT TIME ZONE 'America/Los_Angeles')::date)::int) - 1);
  v_minutes int;
  v_last_trained date;
  v_season_revenue numeric;
  v_rev_per_day numeric;
  v_signed boolean;
  v_referrals int;
  v_last_sale date;
  v_last_fiber date;
  v_goal numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
  ) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  SELECT coalesce(sum(training_minutes), 0), max(date)
    INTO v_minutes, v_last_trained
    FROM daily_training_time
   WHERE user_id = _user_id AND date >= v_week_start;

  SELECT max(date) INTO v_last_trained FROM daily_training_time WHERE user_id = _user_id;

  SELECT season_revenue, rev_per_day, signed_2027
    INTO v_season_revenue, v_rev_per_day, v_signed
    FROM people_leads
   WHERE profile_id = _user_id
   ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  SELECT count(*) INTO v_referrals FROM recruiting_leads WHERE referrer_user_id = _user_id;

  SELECT max(sold_at::date) INTO v_last_sale FROM sales_log WHERE user_id = _user_id;
  SELECT max(day) INTO v_last_fiber FROM fiber_day_numbers WHERE user_id = _user_id AND sold > 0;

  SELECT income_goal INTO v_goal FROM profiles WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'authorized', true,
    'season_revenue', v_season_revenue,
    'rev_per_day', v_rev_per_day,
    'training_minutes_week', coalesce(v_minutes, 0),
    'last_trained', v_last_trained,
    'signed_2027', v_signed,
    'referrals', coalesce(v_referrals, 0),
    'last_sale', v_last_sale,
    'last_fiber', v_last_fiber,
    'income_goal', v_goal
  );
END $$;

REVOKE ALL ON FUNCTION public.get_prep_commitment(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_rep_prep_facts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_prep_commitment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rep_prep_facts(uuid) TO authenticated;