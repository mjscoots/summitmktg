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

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_goal_interview(uuid, text, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_goal_interview(uuid, text, numeric, date) TO authenticated;