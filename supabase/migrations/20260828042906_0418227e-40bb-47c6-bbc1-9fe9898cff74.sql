ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hometown TEXT;

CREATE OR REPLACE FUNCTION public.save_goal_interview(_rep uuid, _why text, _income_goal numeric, _last_day date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _target uuid := coalesce(_rep, auth.uid());
  _mgr uuid;
  _existing uuid;
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in first');
  END IF;

  IF _target <> _caller AND NOT (
    has_role(_caller, 'manager') OR has_role(_caller, 'admin')
    OR has_role(_caller, 'owner') OR has_role(_caller, 'president')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = _target) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No such person');
  END IF;

  SELECT coalesce(manager_id, recruiter_id) INTO _mgr FROM profiles WHERE user_id = _target;
  IF _target <> _caller THEN
    _mgr := coalesce(_mgr, _caller);
  ELSE
    _mgr := coalesce(_mgr, _target);
  END IF;

  SELECT id INTO _existing FROM commitment_interviews WHERE rep_id = _target AND season = '2027' LIMIT 1;

  IF _existing IS NULL THEN
    INSERT INTO commitment_interviews (rep_id, manager_id, season, why_here, committed_last_day)
    VALUES (_target, _mgr, '2027', nullif(btrim(coalesce(_why, '')), ''), _last_day);
  ELSE
    UPDATE commitment_interviews
       SET why_here = coalesce(nullif(btrim(coalesce(_why, '')), ''), why_here),
           committed_last_day = coalesce(_last_day, committed_last_day),
           updated_at = now()
     WHERE id = _existing;
  END IF;

  IF _income_goal IS NOT NULL AND _income_goal > 0 THEN
    UPDATE profiles SET revenue_goal = _income_goal, updated_at = now() WHERE user_id = _target;
  END IF;

  UPDATE profiles
     SET onboarding_status = CASE
           WHEN coalesce(onboarding_status, 'pending') IN ('pending', 'profile_done') THEN 'interview_done'
           ELSE onboarding_status
         END,
         updated_at = now()
   WHERE user_id = _target;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_goal_interview(uuid, text, numeric, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_referral(_name text, _phone text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _digits text;
  _clean text := btrim(coalesce(_name, ''));
  _total integer;
BEGIN
  IF _u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in first');
  END IF;

  IF char_length(_clean) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Add a name');
  END IF;

  _digits := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  IF char_length(_digits) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Add a ten digit phone number');
  END IF;

  IF NOT check_rate_limit('referral:' || _u::text, 5, 86400) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That is five referrals today. Try again tomorrow.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM recruiting_leads
     WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g') = _digits
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That number is already on the list');
  END IF;

  INSERT INTO recruiting_leads (first_name, phone, notes, status, source_type, referrer_user_id, sourced_by, vertical)
  VALUES (
    left(_clean, 80),
    left(_digits, 30),
    nullif(left(btrim(coalesce(_note, '')), 4000), ''),
    'New',
    'rep_referral',
    _u,
    _u,
    coalesce((SELECT active_vertical FROM profiles WHERE user_id = _u), 'Pest')
  );

  SELECT count(*) INTO _total FROM recruiting_leads WHERE referrer_user_id = _u;

  RETURN jsonb_build_object('ok', true, 'count', _total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_referral(text, text, text) TO authenticated;

INSERT INTO public.onboarding_days (vertical, day, title, items, published)
SELECT 'Fiber', v.day, v.title, v.items::jsonb, true
FROM (VALUES
  (1, 'Get on Gainz', '[{"key":"gainz_account","label":"Set up your Gainz account","rule":"self"},{"key":"gainz_tour","label":"Walk the Gainz dashboard with your manager","rule":"mark"},{"key":"profile","label":"Finish your Summit profile","rule":"profile"}]'),
  (2, 'Your first numbers', '[{"key":"sales_raptor","label":"Log in to Sales Raptor","rule":"self"},{"key":"everee","label":"Finish your Everee pay setup","rule":"self"},{"key":"chat_hello","label":"Say hello in chat","rule":"chat_message"}]'),
  (3, 'Your first blitz', '[{"key":"blitz_plan","label":"Pick the blitz you are going to","rule":"self"},{"key":"events_clear","label":"Answer every event on your calendar","rule":"events_clear"},{"key":"first_install","label":"Log your first install","rule":"mark"}]')
) AS v(day, title, items)
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_days d WHERE d.vertical = 'Fiber' AND d.day = v.day
);