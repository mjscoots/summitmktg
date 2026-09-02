ALTER TABLE public.onboarding_steps DROP CONSTRAINT IF EXISTS onboarding_steps_step_check;
ALTER TABLE public.onboarding_steps ADD CONSTRAINT onboarding_steps_step_check
  CHECK (step = ANY (ARRAY['agreement_signed'::text, 'payroll_setup'::text, 'training_done'::text]));

CREATE OR REPLACE FUNCTION public.day_one_done_at(_user_id uuid)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.day_one_done(_user_id) THEN (
      SELECT max(COALESCE(vp.watched_at, vp.created_at))
        FROM public.video_progress vp
       WHERE vp.user_id = _user_id
         AND vp.video_id = ANY(public.day_one_video_ids())
         AND vp.watched = true
    )
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.tick_training_done_from_day_one(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _at timestamptz;
BEGIN
  _at := public.day_one_done_at(_user_id);
  IF _at IS NULL THEN
    RETURN false;
  END IF;
  INSERT INTO public.onboarding_steps (user_id, step, checked_at)
  VALUES (_user_id, 'training_done', _at)
  ON CONFLICT (user_id, step) DO UPDATE
    SET checked_at = LEAST(public.onboarding_steps.checked_at, _at),
        updated_at = now();
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_into_industry(_user_id uuid, _vertical text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _training boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in first.');
  END IF;
  IF NOT (public.has_role(_uid,'owner') OR public.is_in_my_system(_uid, _user_id)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person is not in your pillar.');
  END IF;
  IF NOT public.has_role(_uid,'owner') AND NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.leader_id = _uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only a pillar leader or the owner can accept a joiner.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.verticals v WHERE v.vertical = _vertical) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That industry does not exist.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person no longer has a profile.');
  END IF;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  VALUES (_user_id, _vertical, 'active', now(), now())
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = COALESCE(public.rep_vertical_enrollments.approved_at, now()),
        rejected_at = NULL,
        reject_reason = NULL,
        updated_at = now();

  UPDATE public.profiles
     SET active_vertical = _vertical,
         vertical = COALESCE(vertical, _vertical)
   WHERE user_id = _user_id;

  _training := public.tick_training_done_from_day_one(_user_id);

  RETURN jsonb_build_object('success', true, 'vertical', _vertical, 'training_done', _training);
END;
$function$;

CREATE OR REPLACE FUNCTION public.people_awaiting_industry()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'created_at', p.created_at,
      'invited_vertical', p.vertical,
      'team_name', (SELECT t.name FROM public.teams t WHERE t.id = p.team_id),
      'manager_name', (SELECT m.full_name FROM public.profiles m WHERE m.user_id = p.manager_id),
      'day_one_done', public.day_one_done(p.user_id),
      'day_one_done_at', public.day_one_done_at(p.user_id)
    ) ORDER BY public.day_one_done(p.user_id) DESC, p.created_at DESC)
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL
      AND COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND (public.has_role(auth.uid(),'owner') OR public.is_in_my_system(auth.uid(), p.user_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.rep_vertical_enrollments e
        WHERE e.user_id = p.user_id
          AND e.status IN ('approved','onboarding','active','paused')
      )
  ), '[]'::jsonb);
$function$;

REVOKE EXECUTE ON FUNCTION public.day_one_done_at(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tick_training_done_from_day_one(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_into_industry(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.people_awaiting_industry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.day_one_done_at(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_training_done_from_day_one(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_into_industry(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.people_awaiting_industry() TO authenticated;