-- 1. Manager availability fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepting_new_reps boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentee_capacity integer,
  ADD COLUMN IF NOT EXISTS manager_intro text;

-- 2. Pairing requests
CREATE TABLE IF NOT EXISTS public.pairing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  vertical text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decline_reason text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pairing_requests_status_chk CHECK (status IN ('pending','accepted','declined','expired'))
);

GRANT SELECT, INSERT, UPDATE ON public.pairing_requests TO authenticated;
GRANT ALL ON public.pairing_requests TO service_role;

ALTER TABLE public.pairing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rep sees own pairing requests" ON public.pairing_requests
  FOR SELECT TO authenticated
  USING (rep_id = auth.uid() OR manager_id = auth.uid()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Rep creates own pairing requests" ON public.pairing_requests
  FOR INSERT TO authenticated
  WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Manager or staff updates pairing requests" ON public.pairing_requests
  FOR UPDATE TO authenticated
  USING (manager_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (manager_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE UNIQUE INDEX IF NOT EXISTS pairing_requests_one_pending
  ON public.pairing_requests (rep_id, vertical) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS pairing_requests_manager_idx ON public.pairing_requests (manager_id, status);
CREATE INDEX IF NOT EXISTS pairing_requests_rep_idx ON public.pairing_requests (rep_id, status);

CREATE TRIGGER pairing_requests_updated_at
  BEFORE UPDATE ON public.pairing_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helper: mentee count
CREATE OR REPLACE FUNCTION public.mentee_count(_manager_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*)::int FROM public.rep_vertical_enrollments e
  WHERE e.paired_manager = _manager_id AND e.status IN ('onboarding','active')
$$;

-- 4. Eligible manager deck
CREATE OR REPLACE FUNCTION public.get_eligible_managers(_vertical text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(r ORDER BY (r->>'mentee_count')::int) FROM (
      SELECT jsonb_build_object(
        'user_id', pr.user_id,
        'full_name', pr.full_name,
        'avatar_url', pr.avatar_url,
        'rep_year', pr.rep_year,
        'vertical', COALESCE(pr.vertical,'Pest'),
        'runs_vertical', COALESCE(pr.runs_vertical,false),
        'intro', NULLIF(btrim(COALESCE(pr.manager_intro,'')), ''),
        'capacity', pr.mentee_capacity,
        'mentee_count', public.mentee_count(pr.user_id),
        'teams_led', COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                               FROM public.teams t WHERE t.manager_id = pr.user_id), '{}')
      ) AS r
      FROM public.profiles pr
      WHERE pr.user_id <> _uid
        AND COALESCE(pr.archived,false) = false
        AND COALESCE(pr.approved,false) = true
        AND COALESCE(pr.accepting_new_reps,false) = true
        AND COALESCE(pr.vertical,'Pest') = _vertical
        AND (public.has_role(pr.user_id,'manager') OR public.has_role(pr.user_id,'admin') OR public.has_role(pr.user_id,'owner'))
        AND (pr.mentee_capacity IS NULL OR public.mentee_count(pr.user_id) < pr.mentee_capacity)
        AND NOT EXISTS (
          SELECT 1 FROM public.pairing_requests q
          WHERE q.rep_id = _uid AND q.manager_id = pr.user_id AND q.vertical = _vertical
            AND q.status = 'declined' AND q.responded_at > now() - interval '7 days'
        )
    ) x
  ), '[]'::jsonb));
END;
$$;

-- 5. Rep's own pending request (if any)
CREATE OR REPLACE FUNCTION public.get_my_pairing_request(_vertical text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'id', q.id, 'status', q.status, 'created_at', q.created_at,
      'manager_id', q.manager_id,
      'manager_name', (SELECT full_name FROM public.profiles WHERE user_id = q.manager_id)
    )
    FROM public.pairing_requests q
    WHERE q.rep_id = auth.uid() AND q.vertical = _vertical AND q.status = 'pending'
    ORDER BY q.created_at DESC LIMIT 1
  ), 'null'::jsonb)
$$;

-- 6. Rep picks a manager
CREATE OR REPLACE FUNCTION public.request_pairing(_vertical text, _manager_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _ok boolean; _rep text; _lbl text; _req uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error','Not signed in'); END IF;
  IF _manager_id = _uid THEN RETURN jsonb_build_object('success', false, 'error','You cannot pair with yourself'); END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
                 WHERE e.user_id = _uid AND e.vertical = _vertical) THEN
    RETURN jsonb_build_object('success', false, 'error','Join the industry first');
  END IF;

  SELECT true INTO _ok FROM jsonb_array_elements(public.get_eligible_managers(_vertical)->'rows') m
    WHERE (m->>'user_id')::uuid = _manager_id LIMIT 1;
  IF NOT COALESCE(_ok,false) THEN
    RETURN jsonb_build_object('success', false, 'error','That manager is not available');
  END IF;

  IF EXISTS (SELECT 1 FROM public.pairing_requests q
             WHERE q.rep_id = _uid AND q.vertical = _vertical AND q.status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error','You already have a request waiting');
  END IF;

  INSERT INTO public.pairing_requests (rep_id, manager_id, vertical)
  VALUES (_uid, _manager_id, _vertical) RETURNING id INTO _req;

  SELECT full_name INTO _rep FROM public.profiles WHERE user_id = _uid;
  SELECT label INTO _lbl FROM public.vertical_paths WHERE vertical = _vertical;

  INSERT INTO public.user_notifications (user_id, title, message, link)
  VALUES (_manager_id, 'Pairing request',
          COALESCE(_rep,'A rep') || ' wants to work with you in ' || COALESCE(_lbl,_vertical) || '.',
          '/app/pitch-approvals');

  RETURN jsonb_build_object('success', true, 'request_id', _req);
END;
$$;

-- 7. Choose for me
CREATE OR REPLACE FUNCTION public.auto_pair(_vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _pick uuid;
BEGIN
  SELECT (m->>'user_id')::uuid INTO _pick
  FROM jsonb_array_elements(public.get_eligible_managers(_vertical)->'rows') m
  ORDER BY (m->>'mentee_count')::int ASC, m->>'full_name' ASC LIMIT 1;

  IF _pick IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error','No managers are accepting new reps right now');
  END IF;
  RETURN public.request_pairing(_vertical, _pick);
END;
$$;

-- 8. Manager queue + response
CREATE OR REPLACE FUNCTION public.get_my_pairing_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id, 'rep_id', q.rep_id, 'rep_name', pr.full_name, 'avatar_url', pr.avatar_url,
      'rep_year', pr.rep_year, 'vertical', q.vertical,
      'label', COALESCE(vp.label, q.vertical), 'created_at', q.created_at
    ) ORDER BY q.created_at)
    FROM public.pairing_requests q
    JOIN public.profiles pr ON pr.user_id = q.rep_id
    LEFT JOIN public.vertical_paths vp ON vp.vertical = q.vertical
    WHERE q.status = 'pending'
      AND (q.manager_id = _uid OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner'))
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_pairing(_request_id uuid, _accept boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _q record; _mgr text; _rep text; _lbl text; _cap integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error','Not signed in'); END IF;
  SELECT * INTO _q FROM public.pairing_requests WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error','Request not found'); END IF;
  IF NOT (_q.manager_id = _uid OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error','Not allowed');
  END IF;

  SELECT full_name INTO _mgr FROM public.profiles WHERE user_id = _q.manager_id;
  SELECT full_name INTO _rep FROM public.profiles WHERE user_id = _q.rep_id;
  SELECT label INTO _lbl FROM public.vertical_paths WHERE vertical = _q.vertical;

  IF _accept THEN
    SELECT mentee_capacity INTO _cap FROM public.profiles WHERE user_id = _q.manager_id;
    IF _cap IS NOT NULL AND public.mentee_count(_q.manager_id) >= _cap THEN
      RETURN jsonb_build_object('success', false, 'error','You are at capacity');
    END IF;

    UPDATE public.pairing_requests SET status = 'accepted', responded_at = now() WHERE id = _request_id;
    UPDATE public.rep_vertical_enrollments
      SET paired_manager = _q.manager_id,
          status = CASE WHEN status = 'interested' THEN 'onboarding' ELSE status END,
          updated_at = now()
      WHERE user_id = _q.rep_id AND vertical = _q.vertical;

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_q.rep_id, 'You are paired',
            COALESCE(_mgr,'Your manager') || ' accepted — your ' || COALESCE(_lbl,_q.vertical) || ' setup is open.',
            '/app/industries?v=' || _q.vertical);

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_q.manager_id, 'New mentee',
            COALESCE(_rep,'A rep') || ' is now paired with you in ' || COALESCE(_lbl,_q.vertical) || '.',
            '/app/team');
  ELSE
    UPDATE public.pairing_requests
      SET status = 'declined', responded_at = now(), decline_reason = NULLIF(btrim(COALESCE(_reason,'')), '')
      WHERE id = _request_id;

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_q.rep_id, 'Pick another manager',
            'Your ' || COALESCE(_lbl,_q.vertical) || ' pairing request was declined'
            || COALESCE(' — ' || NULLIF(btrim(COALESCE(_reason,'')), ''), '') || '. Pick again when ready.',
            '/app/industries?v=' || _q.vertical);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Approval steps route to the paired manager
CREATE OR REPLACE FUNCTION public.approve_vertical_step(_user_id uuid, _step_id uuid, _notes text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _s record; _paired uuid;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  SELECT * INTO _s FROM public.vertical_steps WHERE id = _step_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Step not found'); END IF;

  SELECT paired_manager INTO _paired FROM public.rep_vertical_enrollments
    WHERE user_id = _user_id AND vertical = _s.vertical;

  IF NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner'))
     AND _paired IS DISTINCT FROM _uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'This rep is paired with another manager');
  END IF;

  INSERT INTO public.vertical_step_completions (user_id, vertical, step_id, approved_by, notes)
  VALUES (_user_id, _s.vertical, _s.id, _uid, _notes)
  ON CONFLICT (user_id, step_id) DO UPDATE SET approved_by = _uid, notes = COALESCE(EXCLUDED.notes, public.vertical_step_completions.notes);

  PERFORM public.recalc_vertical_enrollment(_user_id, _s.vertical);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_vertical_approvals()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _staff boolean;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb);
  END IF;
  _staff := public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');

  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', e.user_id, 'full_name', pr.full_name,
      'vertical', e.vertical, 'label', vp.label,
      'step_id', s.id, 'step_title', s.title
    ) ORDER BY pr.full_name, s.display_order)
    FROM public.rep_vertical_enrollments e
    JOIN public.vertical_paths vp ON vp.vertical = e.vertical
    JOIN public.profiles pr ON pr.user_id = e.user_id
    JOIN public.vertical_steps s ON s.vertical = e.vertical AND s.is_active AND s.step_type = 'approval'
    WHERE COALESCE(pr.archived,false) = false
      AND (_staff OR e.paired_manager = _uid)
      AND NOT EXISTS (SELECT 1 FROM public.vertical_step_completions c
                      WHERE c.user_id = e.user_id AND c.step_id = s.id)
      AND NOT EXISTS (SELECT 1 FROM public.vertical_steps s2
                      WHERE s2.vertical = e.vertical AND s2.is_active AND s2.display_order < s.display_order
                        AND NOT EXISTS (SELECT 1 FROM public.vertical_step_completions c2
                                        WHERE c2.user_id = e.user_id AND c2.step_id = s2.id))
  ), '[]'::jsonb));
END;
$$;

-- 10. Mentees view + nudge
CREATE OR REPLACE FUNCTION public.get_my_mentees()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', e.user_id, 'full_name', pr.full_name, 'avatar_url', pr.avatar_url,
      'vertical', e.vertical, 'label', COALESCE(vp.label, e.vertical), 'status', e.status,
      'steps_total', (SELECT count(*) FROM public.vertical_steps s WHERE s.vertical = e.vertical AND s.is_active),
      'steps_done', (SELECT count(*) FROM public.vertical_step_completions c
                     WHERE c.user_id = e.user_id AND c.vertical = e.vertical),
      'current_step_title', (SELECT s.title FROM public.vertical_steps s
                             WHERE s.vertical = e.vertical AND s.is_active
                               AND NOT EXISTS (SELECT 1 FROM public.vertical_step_completions c
                                               WHERE c.user_id = e.user_id AND c.step_id = s.id)
                             ORDER BY s.display_order LIMIT 1),
      'days_since_progress', GREATEST(0, EXTRACT(day FROM now() - COALESCE(
          (SELECT max(c.completed_at) FROM public.vertical_step_completions c
           WHERE c.user_id = e.user_id AND c.vertical = e.vertical), e.created_at))::int),
      'nudged_recently', EXISTS (SELECT 1 FROM public.user_notifications un
                                 WHERE un.user_id = e.user_id AND un.title = 'Nudge from your manager'
                                   AND un.link = '/app/industries?v=' || e.vertical
                                   AND un.created_at > now() - interval '48 hours')
    ) ORDER BY COALESCE(vp.label, e.vertical), pr.full_name)
    FROM public.rep_vertical_enrollments e
    JOIN public.profiles pr ON pr.user_id = e.user_id
    LEFT JOIN public.vertical_paths vp ON vp.vertical = e.vertical
    WHERE e.paired_manager = _uid AND COALESCE(pr.archived,false) = false
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.nudge_mentee(_user_id uuid, _vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _lnk text; _mgr text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error','Not signed in'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
                 WHERE e.user_id = _user_id AND e.vertical = _vertical
                   AND (e.paired_manager = _uid OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner'))) THEN
    RETURN jsonb_build_object('success', false, 'error','Not your mentee');
  END IF;

  _lnk := '/app/industries?v=' || _vertical;
  IF EXISTS (SELECT 1 FROM public.user_notifications un
             WHERE un.user_id = _user_id AND un.title = 'Nudge from your manager'
               AND un.link = _lnk AND un.created_at > now() - interval '48 hours') THEN
    RETURN jsonb_build_object('success', false, 'error','Already nudged in the last 48 hours');
  END IF;

  SELECT full_name INTO _mgr FROM public.profiles WHERE user_id = _uid;
  INSERT INTO public.user_notifications (user_id, title, message, link)
  VALUES (_user_id, 'Nudge from your manager',
          COALESCE(_mgr,'Your manager') || ' is checking in on your next setup step.', _lnk);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. Owner oversight
CREATE OR REPLACE FUNCTION public.get_pairings(_vertical text DEFAULT NULL, _status text DEFAULT NULL, _manager uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb,'managers','[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', e.user_id, 'full_name', pr.full_name, 'vertical', e.vertical,
        'label', COALESCE(vp.label, e.vertical), 'status', e.status,
        'paired_manager', e.paired_manager,
        'manager_name', (SELECT full_name FROM public.profiles WHERE user_id = e.paired_manager),
        'pending_request_manager', (SELECT (SELECT full_name FROM public.profiles p2 WHERE p2.user_id = q.manager_id)
                                    FROM public.pairing_requests q
                                    WHERE q.rep_id = e.user_id AND q.vertical = e.vertical AND q.status = 'pending'
                                    ORDER BY q.created_at DESC LIMIT 1),
        'updated_at', e.updated_at
      ) ORDER BY COALESCE(vp.label, e.vertical), pr.full_name)
      FROM public.rep_vertical_enrollments e
      JOIN public.profiles pr ON pr.user_id = e.user_id
      LEFT JOIN public.vertical_paths vp ON vp.vertical = e.vertical
      WHERE COALESCE(pr.archived,false) = false
        AND (_vertical IS NULL OR e.vertical = _vertical)
        AND (_status IS NULL OR e.status = _status)
        AND (_manager IS NULL OR e.paired_manager = _manager)
    ), '[]'::jsonb),
    'managers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', pr.user_id, 'full_name', pr.full_name,
        'vertical', COALESCE(pr.vertical,'Pest'),
        'accepting', COALESCE(pr.accepting_new_reps,false),
        'capacity', pr.mentee_capacity,
        'mentee_count', public.mentee_count(pr.user_id)
      ) ORDER BY pr.full_name)
      FROM public.profiles pr
      WHERE COALESCE(pr.archived,false) = false
        AND (public.has_role(pr.user_id,'manager') OR public.has_role(pr.user_id,'admin') OR public.has_role(pr.user_id,'owner'))
    ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_paired_manager(_user_id uuid, _vertical text, _manager_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _before uuid; _actor text; _rep text;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error','Not allowed');
  END IF;
  IF _manager_id = _user_id THEN
    RETURN jsonb_build_object('success', false, 'error','A rep cannot be paired with themselves');
  END IF;

  SELECT paired_manager INTO _before FROM public.rep_vertical_enrollments
    WHERE user_id = _user_id AND vertical = _vertical;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error','Enrollment not found'); END IF;

  UPDATE public.rep_vertical_enrollments
    SET paired_manager = _manager_id,
        status = CASE WHEN _manager_id IS NOT NULL AND status = 'interested' THEN 'onboarding' ELSE status END,
        updated_at = now()
    WHERE user_id = _user_id AND vertical = _vertical;

  SELECT full_name INTO _actor FROM public.profiles WHERE user_id = _uid;
  SELECT full_name INTO _rep FROM public.profiles WHERE user_id = _user_id;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, field, before_value, after_value)
  VALUES (_uid, _actor, 'update', 'vertical_pairing', _user_id::text,
          COALESCE(_rep,'Rep') || ' — ' || _vertical, 'paired_manager',
          (SELECT full_name FROM public.profiles WHERE user_id = _before),
          (SELECT full_name FROM public.profiles WHERE user_id = _manager_id));

  IF _manager_id IS NOT NULL AND _manager_id IS DISTINCT FROM _before THEN
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_manager_id, 'New mentee',
            COALESCE(_rep,'A rep') || ' was paired with you in ' || _vertical || '.', '/app/team');
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_user_id, 'You are paired',
            'You were paired with ' || COALESCE((SELECT full_name FROM public.profiles WHERE user_id = _manager_id),'a manager')
            || ' in ' || _vertical || '.', '/app/industries?v=' || _vertical);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. 48h auto-release sweep
CREATE OR REPLACE FUNCTION public.sweep_pairing_requests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; released int := 0;
BEGIN
  FOR r IN
    SELECT q.id, q.rep_id, q.vertical FROM public.pairing_requests q
    WHERE q.status = 'pending' AND q.created_at < now() - interval '48 hours'
  LOOP
    UPDATE public.pairing_requests SET status = 'expired', responded_at = now() WHERE id = r.id;
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (r.rep_id, 'Pick another manager',
            'No answer in 48 hours — pick a manager again for ' || r.vertical || '.',
            '/app/industries?v=' || r.vertical);
    released := released + 1;
  END LOOP;
  RETURN jsonb_build_object('released', released);
END;
$$;

SELECT cron.schedule('sweep-pairing-requests', '17 * * * *',
  $$SELECT public.sweep_pairing_requests();$$);

-- 13. Lock down execute
REVOKE EXECUTE ON FUNCTION public.sweep_pairing_requests() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mentee_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_eligible_managers(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_pairing_request(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_pairing(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_pair(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_pairing_requests() FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_pairing(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_mentees() FROM anon;
REVOKE EXECUTE ON FUNCTION public.nudge_mentee(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pairings(text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_paired_manager(uuid, text, uuid) FROM anon;