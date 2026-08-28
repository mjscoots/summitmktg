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

  SELECT coalesce(sum(training_minutes), 0)
    INTO v_minutes
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

  SELECT revenue_goal INTO v_goal FROM profiles WHERE user_id = _user_id;

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
    'revenue_goal', v_goal
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.get_rep_prep_facts(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_prep_commitment(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rep_prep_facts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_prep_commitment(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_rep_prep_facts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prep_commitment(uuid, text) TO authenticated;