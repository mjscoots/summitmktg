-- 1. Columns the review flow needs
ALTER TABLE public.vertical_applications
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS vertical_applications_one_open
  ON public.vertical_applications (user_id, vertical)
  WHERE status = 'pending';

-- 2. Pest is the default workspace everywhere it is unset
ALTER TABLE public.profiles ALTER COLUMN active_vertical SET DEFAULT 'Pest';
UPDATE public.profiles SET active_vertical = 'Pest' WHERE active_vertical IS NULL;

-- 3. Rep submits a request for a locked vertical
CREATE OR REPLACE FUNCTION public.request_vertical_access(_vertical text, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _v record;
  _app_id uuid;
  _name text;
  _last timestamptz;
  _staff uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  IF _vertical = 'Pest' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pest is open to everyone already');
  END IF;

  SELECT * INTO _v FROM public.verticals WHERE vertical = _vertical;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Unknown industry'); END IF;

  IF EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
              WHERE e.user_id = _uid AND e.vertical = _vertical
                AND e.status IN ('approved','onboarding','active')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have access');
  END IF;

  IF EXISTS (SELECT 1 FROM public.vertical_applications a
              WHERE a.user_id = _uid AND a.vertical = _vertical AND a.status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your request is already waiting on approval');
  END IF;

  SELECT max(reviewed_at) INTO _last FROM public.vertical_applications
   WHERE user_id = _uid AND vertical = _vertical AND status = 'rejected';
  IF _last IS NOT NULL AND _last > now() - interval '14 days' THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You can request this again after ' || to_char(_last + interval '14 days', 'Mon FMDD'));
  END IF;

  INSERT INTO public.vertical_applications (user_id, vertical, answers, status)
  VALUES (_uid, _vertical, COALESCE(_answers, '{}'::jsonb), 'pending')
  RETURNING id INTO _app_id;

  SELECT COALESCE(full_name, 'A rep') INTO _name FROM public.profiles WHERE user_id = _uid;

  FOR _staff IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('owner'::app_role, 'admin'::app_role)
  LOOP
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_staff, _v.name || ' access request',
            _name || ' asked to join ' || _v.name || '.', '/admin/inbox?tab=verticals');
  END LOOP;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label)
  VALUES (_uid, _name, 'vertical_request_submitted', 'vertical_application', _app_id::text, _v.name);

  RETURN jsonb_build_object('success', true, 'application_id', _app_id);
END;
$$;

REVOKE ALL ON FUNCTION public.request_vertical_access(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_vertical_access(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_vertical_access(text, jsonb) TO authenticated;

-- 4. Rep withdraws their own open request
CREATE OR REPLACE FUNCTION public.withdraw_vertical_request(_vertical text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _n int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  DELETE FROM public.vertical_applications
   WHERE user_id = _uid AND vertical = _vertical AND status = 'pending';
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Nothing to withdraw'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_vertical_request(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_vertical_request(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.withdraw_vertical_request(text) TO authenticated;

-- 5. Owner or admin decides
CREATE OR REPLACE FUNCTION public.decide_vertical_request(_application_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _a record; _v record; _actor text; _start date;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  IF NOT (public.has_role(_uid, 'owner'::app_role) OR public.has_role(_uid, 'admin'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner or an admin can decide this');
  END IF;
  IF _decision NOT IN ('approved','rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  SELECT * INTO _a FROM public.vertical_applications WHERE id = _application_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Request not found'); END IF;
  IF _a.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Already decided'); END IF;

  SELECT * INTO _v FROM public.verticals WHERE vertical = _a.vertical;
  SELECT COALESCE(full_name, 'Someone') INTO _actor FROM public.profiles WHERE user_id = _uid;

  UPDATE public.vertical_applications
     SET status = _decision, review_note = _note, reviewed_by = _uid,
         reviewed_at = now(), updated_at = now()
   WHERE id = _application_id;

  INSERT INTO public.vertical_application_approvals (application_id, approver_user_id, decision, note)
  VALUES (_application_id, _uid, _decision, _note)
  ON CONFLICT (application_id, approver_user_id) DO UPDATE
    SET decision = excluded.decision, note = excluded.note, decided_at = now();

  IF _decision = 'approved' THEN
    -- next Monday, never touching their Pest enrollment
    _start := (current_date + ((8 - EXTRACT(ISODOW FROM current_date)::int) % 7 + CASE WHEN EXTRACT(ISODOW FROM current_date)::int = 1 THEN 7 ELSE 0 END))::date;
    IF _start <= current_date THEN _start := _start + 7; END IF;

    INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, approved_at, start_date)
    VALUES (_a.user_id, _a.vertical, 'onboarding', now(), _start)
    ON CONFLICT (user_id, vertical) DO UPDATE
      SET status = 'onboarding', approved_at = now(), start_date = EXCLUDED.start_date,
          rejected_at = NULL, reject_reason = NULL, updated_at = now();

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_a.user_id, _v.name || ' access approved',
            _v.name || ' access approved, it is in your switcher now. Starts ' || to_char(_start, 'Mon FMDD') || '.'
            || COALESCE(' ' || _note, ''), '/app');
  ELSE
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_a.user_id, _v.name || ' request declined',
            COALESCE(_note, 'You can request again in 14 days.'), '/app');
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, after_value)
  VALUES (_uid, _actor, 'vertical_request_' || _decision, 'vertical_application',
          _application_id::text, _v.name, _note);

  RETURN jsonb_build_object('success', true, 'status', _decision, 'start_date', _start);
END;
$$;

REVOKE ALL ON FUNCTION public.decide_vertical_request(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vertical_request(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.decide_vertical_request(uuid, text, text) TO authenticated;

-- 6. The inbox list for owner and admin
CREATE OR REPLACE FUNCTION public.get_vertical_requests(_status text DEFAULT 'pending')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _res jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT (public.has_role(_uid, 'owner'::app_role) OR public.has_role(_uid, 'admin'::app_role)) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'user_id', a.user_id,
    'vertical', a.vertical,
    'vertical_name', v.name,
    'status', a.status,
    'answers', a.answers,
    'created_at', a.created_at,
    'rep_name', p.full_name,
    'team_name', (SELECT t.name FROM public.teams t WHERE t.id = p.team_id),
    'manager_name', p.direct_manager,
    'rep_year', p.rep_year,
    'revenue_to_date', p.revenue_to_date
  ) ORDER BY a.created_at), '[]'::jsonb) INTO _res
  FROM public.vertical_applications a
  JOIN public.verticals v ON v.vertical = a.vertical
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.status = _status OR _status = 'all';

  RETURN _res;
END;
$$;

REVOKE ALL ON FUNCTION public.get_vertical_requests(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vertical_requests(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_vertical_requests(text) TO authenticated;

-- 7. get_my_workspaces carries the request state so locked rows can show it
CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _res jsonb; _active text; _staff boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('workspaces','[]'::jsonb); END IF;

  SELECT COALESCE(active_vertical, 'Pest') INTO _active FROM public.profiles WHERE user_id = _uid;
  _staff := public.has_role(_uid,'owner') OR public.has_role(_uid,'admin');

  SELECT jsonb_build_object(
    'active_vertical', COALESCE(_active, 'Pest'),
    'workspaces', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', v.vertical,
        'slug', v.slug,
        'name', v.name,
        'short_name', v.short_name,
        'unit', v.unit,
        'accent_token', v.accent_token,
        'theme', COALESCE(v.theme, '{}'::jsonb),
        'status', v.status,
        'display_order', v.display_order,
        'is_president', (v.president_user_id = _uid),
        'president_name', (SELECT pp.full_name FROM public.profiles pp WHERE pp.user_id = v.president_user_id),
        'membership_status', COALESCE(
          e.status,
          CASE WHEN _staff OR v.vertical = 'Pest' THEN 'active' ELSE NULL END),
        'reject_reason', e.reject_reason,
        'request_status', (SELECT a.status FROM public.vertical_applications a
                            WHERE a.user_id = _uid AND a.vertical = v.vertical
                            ORDER BY a.created_at DESC LIMIT 1),
        'request_reviewed_at', (SELECT a.reviewed_at FROM public.vertical_applications a
                            WHERE a.user_id = _uid AND a.vertical = v.vertical
                            ORDER BY a.created_at DESC LIMIT 1),
        'approvers', '[]'::jsonb
      ) ORDER BY v.display_order)
      FROM public.verticals v
      LEFT JOIN public.rep_vertical_enrollments e ON e.user_id = _uid AND e.vertical = v.vertical
    ), '[]'::jsonb)
  ) INTO _res;

  RETURN _res;
END;
$$;

-- 8. The bulk roll is owner and admin only now
CREATE OR REPLACE FUNCTION public.roll_reps_to_fiber(_rep_ids uuid[], _start_date date, _carrier_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rep uuid;
  _n integer := 0;
  _label text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _start_date IS NULL THEN
    RAISE EXCEPTION 'start date required';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _carrier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.carriers WHERE id = _carrier_id AND vertical = 'Fiber'
  ) THEN
    RAISE EXCEPTION 'unknown fiber carrier';
  END IF;

  SELECT name INTO _label FROM public.carriers WHERE id = _carrier_id;

  FOREACH _rep IN ARRAY coalesce(_rep_ids, '{}'::uuid[]) LOOP
    INSERT INTO public.rep_vertical_enrollments
      (user_id, vertical, status, approved_at, start_date, carrier_id)
    VALUES (_rep, 'Fiber', 'onboarding', now(), _start_date, _carrier_id)
    ON CONFLICT (user_id, vertical) DO UPDATE
      SET start_date = EXCLUDED.start_date,
          carrier_id = coalesce(EXCLUDED.carrier_id, public.rep_vertical_enrollments.carrier_id),
          status = CASE WHEN public.rep_vertical_enrollments.status = 'interested'
                        THEN 'onboarding' ELSE public.rep_vertical_enrollments.status END,
          approved_at = coalesce(public.rep_vertical_enrollments.approved_at, now()),
          updated_at = now();

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (
      _rep,
      'Fiber starts ' || to_char(_start_date, 'Mon FMDD'),
      coalesce('Your fiber start is set with ' || _label || '. ', 'Your fiber start is set. ')
        || 'Your installs and pay live in the Fiber workspace.',
      '/app'
    );

    _n := _n + 1;
  END LOOP;

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.roll_reps_to_fiber(uuid[], date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.roll_reps_to_fiber(uuid[], date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.roll_reps_to_fiber(uuid[], date, uuid) TO authenticated;