-- ============ VERTICALS ============
CREATE TABLE IF NOT EXISTS public.verticals (
  vertical text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text NOT NULL,
  unit text NOT NULL,
  accent_token text NOT NULL DEFAULT 'primary',
  status text NOT NULL DEFAULT 'active',
  public boolean NOT NULL DEFAULT false,
  public_title text,
  president_user_id uuid,
  required_approver_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verticals ADD CONSTRAINT verticals_status_chk CHECK (status IN ('active','coming_soon'));

GRANT SELECT ON public.verticals TO authenticated;
GRANT SELECT ON public.verticals TO anon;
GRANT ALL ON public.verticals TO service_role;
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verticals readable by signed in users"
  ON public.verticals FOR SELECT TO authenticated USING (true);
CREATE POLICY "public verticals readable by anon"
  ON public.verticals FOR SELECT TO anon USING (public = true);
CREATE POLICY "owner and admin manage verticals"
  ON public.verticals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER verticals_set_updated_at
  BEFORE UPDATE ON public.verticals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.verticals (vertical, slug, name, short_name, unit, status, public, public_title, president_user_id, required_approver_ids, display_order)
VALUES
  ('Pest','pest','Summit Pest','Pest','account','active', true, null,
   '0186b7f6-7c81-4402-ba71-f5ab2d11fcac',
   ARRAY['70eeded3-4c88-41ee-8049-2b75e92cb866','0186b7f6-7c81-4402-ba71-f5ab2d11fcac']::uuid[], 1),
  ('Fiber','fiber','Summit Fiber','Fiber','install','active', true, null,
   '00baa414-57c8-42e5-a20b-3804412aab58',
   ARRAY['70eeded3-4c88-41ee-8049-2b75e92cb866','00baa414-57c8-42e5-a20b-3804412aab58']::uuid[], 2),
  ('Life','life','Summit Life','Life','policy','coming_soon', true, null,
   null,
   ARRAY['70eeded3-4c88-41ee-8049-2b75e92cb866','00baa414-57c8-42e5-a20b-3804412aab58']::uuid[], 3)
ON CONFLICT (vertical) DO NOTHING;

-- ============ PROFILES ACTIVE WORKSPACE ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_vertical text;

-- ============ MEMBERSHIP ============
ALTER TABLE public.rep_vertical_enrollments
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rep_vertical_enrollments_status_chk') THEN
    ALTER TABLE public.rep_vertical_enrollments
      ADD CONSTRAINT rep_vertical_enrollments_status_chk
      CHECK (status IN ('interested','applied','approved','onboarding','active','rejected','paused'));
  END IF;
END $$;

-- ============ APPLICATIONS ============
CREATE TABLE IF NOT EXISTS public.vertical_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vertical text NOT NULL REFERENCES public.verticals(vertical),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vertical_applications ADD CONSTRAINT vertical_applications_status_chk CHECK (status IN ('pending','approved','rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS vertical_applications_open_uniq
  ON public.vertical_applications (user_id, vertical) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS vertical_applications_vertical_idx ON public.vertical_applications (vertical, status);

GRANT SELECT, INSERT ON public.vertical_applications TO authenticated;
GRANT ALL ON public.vertical_applications TO service_role;
ALTER TABLE public.vertical_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vertical_application_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.vertical_applications(id) ON DELETE CASCADE,
  approver_user_id uuid NOT NULL,
  decision text NOT NULL,
  note text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, approver_user_id)
);
ALTER TABLE public.vertical_application_approvals ADD CONSTRAINT vertical_application_approvals_decision_chk CHECK (decision IN ('approved','rejected'));

GRANT SELECT ON public.vertical_application_approvals TO authenticated;
GRANT ALL ON public.vertical_application_approvals TO service_role;
ALTER TABLE public.vertical_application_approvals ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_president_of(_uid uuid, _vertical text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verticals v
    WHERE v.vertical = _vertical AND v.president_user_id = _uid
  )
$$;

CREATE OR REPLACE FUNCTION public.my_presided_verticals(_uid uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(array_agg(v.vertical), '{}'::text[])
  FROM public.verticals v WHERE v.president_user_id = _uid
$$;

CREATE OR REPLACE FUNCTION public.is_president_of_rep(_uid uuid, _rep uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verticals v
    WHERE v.president_user_id = _uid
      AND (
        EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
                 WHERE e.user_id = _rep AND e.vertical = v.vertical)
        OR EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.user_id = _rep AND COALESCE(p.vertical,'Pest') = v.vertical)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.is_president_of(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_presided_verticals(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_president_of_rep(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_president_of(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_presided_verticals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_president_of_rep(uuid, uuid) TO authenticated;

-- ============ APPLICATION POLICIES ============
CREATE POLICY "applicants read own applications"
  ON public.vertical_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "approvers read scoped applications"
  ON public.vertical_applications FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'owner'::app_role)
    OR public.is_president_of(auth.uid(), vertical)
  );
CREATE POLICY "applicants create own applications"
  ON public.vertical_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "approval rows readable by applicant and approvers"
  ON public.vertical_application_approvals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vertical_applications a
      WHERE a.id = application_id
        AND (
          a.user_id = auth.uid()
          OR public.has_role(auth.uid(),'admin'::app_role)
          OR public.has_role(auth.uid(),'owner'::app_role)
          OR public.is_president_of(auth.uid(), a.vertical)
        )
    )
  );

-- ============ APPLY ============
CREATE OR REPLACE FUNCTION public.apply_to_vertical(_vertical text, _answers jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _v record;
  _app_id uuid;
  _name text;
  _approver uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  SELECT * INTO _v FROM public.verticals WHERE vertical = _vertical;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Unknown industry'); END IF;
  IF _v.status <> 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'This industry is not open yet'); END IF;

  IF EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
              WHERE e.user_id = _uid AND e.vertical = _vertical
                AND e.status IN ('approved','onboarding','active')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a member');
  END IF;

  IF EXISTS (SELECT 1 FROM public.vertical_applications a
              WHERE a.user_id = _uid AND a.vertical = _vertical AND a.status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your application is already in review');
  END IF;

  INSERT INTO public.vertical_applications (user_id, vertical, answers)
  VALUES (_uid, _vertical, COALESCE(_answers,'{}'::jsonb))
  RETURNING id INTO _app_id;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, applied_at)
  VALUES (_uid, _vertical, 'applied', now())
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'applied', applied_at = now(), rejected_at = null, reject_reason = null, updated_at = now();

  SELECT COALESCE(full_name,'A rep') INTO _name FROM public.profiles WHERE user_id = _uid;

  FOREACH _approver IN ARRAY _v.required_approver_ids LOOP
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_approver, _v.name || ' application',
            _name || ' applied to ' || _v.name || '. Review and decide.',
            '/app/approvals?tab=workspaces');
  END LOOP;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label)
  VALUES (_uid, _name, 'vertical_application_submitted', 'vertical_application', _app_id::text, _v.name);

  RETURN jsonb_build_object('success', true, 'application_id', _app_id);
END;
$$;

-- ============ DECIDE ============
CREATE OR REPLACE FUNCTION public.decide_vertical_application(_application_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _a record;
  _v record;
  _actor text;
  _applicant text;
  _needed int;
  _got int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  IF _decision NOT IN ('approved','rejected') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid decision'); END IF;

  SELECT * INTO _a FROM public.vertical_applications WHERE id = _application_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Application not found'); END IF;
  IF _a.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Already decided'); END IF;

  SELECT * INTO _v FROM public.verticals WHERE vertical = _a.vertical;

  IF NOT (_uid = ANY (_v.required_approver_ids)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not an approver for this industry');
  END IF;

  INSERT INTO public.vertical_application_approvals (application_id, approver_user_id, decision, note)
  VALUES (_application_id, _uid, _decision, _note)
  ON CONFLICT (application_id, approver_user_id) DO UPDATE
    SET decision = excluded.decision, note = excluded.note, decided_at = now();

  SELECT COALESCE(full_name,'Someone') INTO _actor FROM public.profiles WHERE user_id = _uid;
  SELECT COALESCE(full_name,'Rep') INTO _applicant FROM public.profiles WHERE user_id = _a.user_id;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, after_value)
  VALUES (_uid, _actor, 'vertical_application_' || _decision, 'vertical_application', _application_id::text, _v.name || ' - ' || _applicant, _note);

  IF _decision = 'rejected' THEN
    UPDATE public.vertical_applications SET status = 'rejected', updated_at = now() WHERE id = _application_id;
    UPDATE public.rep_vertical_enrollments
      SET status = 'rejected', rejected_at = now(), reject_reason = _note, updated_at = now()
      WHERE user_id = _a.user_id AND vertical = _a.vertical;
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_a.user_id, _v.name || ' application not approved',
            COALESCE(_note, 'Talk to your manager about next steps.'), '/app/industries');
    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;

  _needed := COALESCE(array_length(_v.required_approver_ids, 1), 0);
  SELECT count(*) INTO _got FROM public.vertical_application_approvals
   WHERE application_id = _application_id
     AND decision = 'approved'
     AND approver_user_id = ANY (_v.required_approver_ids);

  INSERT INTO public.user_notifications (user_id, title, message, link)
  VALUES (_a.user_id, _v.name || ' application update',
          _actor || ' approved your ' || _v.name || ' application.', '/app/industries');

  IF _got >= _needed AND _needed > 0 THEN
    UPDATE public.vertical_applications SET status = 'approved', updated_at = now() WHERE id = _application_id;
    UPDATE public.rep_vertical_enrollments
      SET status = 'approved', approved_at = now(), rejected_at = null, reject_reason = null, updated_at = now()
      WHERE user_id = _a.user_id AND vertical = _a.vertical;
    PERFORM public.recalc_vertical_enrollment(_a.user_id, _a.vertical);
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_a.user_id, _v.name || ' is open',
            'You have access to ' || _v.name || '. Switch workspace to get started.', '/app/industries?switch=' || _v.vertical);
    RETURN jsonb_build_object('success', true, 'status', 'approved');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'pending', 'approvals', _got, 'needed', _needed);
END;
$$;

-- ============ READ RPCS ============
CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _res jsonb; _active text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('workspaces','[]'::jsonb); END IF;

  SELECT active_vertical INTO _active FROM public.profiles WHERE user_id = _uid;

  SELECT jsonb_build_object(
    'active_vertical', _active,
    'workspaces', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', v.vertical,
        'slug', v.slug,
        'name', v.name,
        'short_name', v.short_name,
        'unit', v.unit,
        'accent_token', v.accent_token,
        'status', v.status,
        'display_order', v.display_order,
        'is_president', (v.president_user_id = _uid),
        'president_name', (SELECT pp.full_name FROM public.profiles pp WHERE pp.user_id = v.president_user_id),
        'membership_status', e.status,
        'reject_reason', e.reject_reason,
        'approvers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'user_id', aid,
            'name', (SELECT ap.full_name FROM public.profiles ap WHERE ap.user_id = aid),
            'decision', (SELECT va.decision FROM public.vertical_application_approvals va
                          WHERE va.approver_user_id = aid
                            AND va.application_id = (SELECT a.id FROM public.vertical_applications a
                                                      WHERE a.user_id = _uid AND a.vertical = v.vertical
                                                      ORDER BY a.created_at DESC LIMIT 1))
          ))
          FROM unnest(v.required_approver_ids) AS aid
        ), '[]'::jsonb)
      ) ORDER BY v.display_order)
      FROM public.verticals v
      LEFT JOIN public.rep_vertical_enrollments e ON e.user_id = _uid AND e.vertical = v.vertical
    ), '[]'::jsonb)
  ) INTO _res;

  RETURN _res;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_active_vertical(_vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error','Not signed in'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.rep_vertical_enrollments e
     WHERE e.user_id = _uid AND e.vertical = _vertical
       AND e.status IN ('approved','onboarding','active','paused')
  ) AND NOT (public.has_role(_uid,'admin'::app_role) OR public.has_role(_uid,'owner'::app_role)
             OR public.is_president_of(_uid, _vertical)) THEN
    RETURN jsonb_build_object('success', false, 'error','You do not have access to that workspace');
  END IF;
  UPDATE public.profiles SET active_vertical = _vertical, updated_at = now() WHERE user_id = _uid;
  RETURN jsonb_build_object('success', true, 'active_vertical', _vertical);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vertical_applications(_status text DEFAULT 'pending')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _res jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at'), '[]'::jsonb) INTO _res FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'user_id', a.user_id,
      'vertical', a.vertical,
      'vertical_name', v.name,
      'status', a.status,
      'answers', a.answers,
      'created_at', a.created_at,
      'applicant_name', p.full_name,
      'applicant_rank', (SELECT r.name FROM public.ranks r WHERE r.id = p.rank_id),
      'applicant_vertical', p.vertical,
      'applicant_revenue_to_date', p.revenue_to_date,
      'applicant_rep_year', p.rep_year,
      'approvers', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', aid,
          'name', (SELECT ap.full_name FROM public.profiles ap WHERE ap.user_id = aid),
          'decision', (SELECT va.decision FROM public.vertical_application_approvals va
                        WHERE va.application_id = a.id AND va.approver_user_id = aid),
          'note', (SELECT va.note FROM public.vertical_application_approvals va
                        WHERE va.application_id = a.id AND va.approver_user_id = aid)
        ))
        FROM unnest(v.required_approver_ids) AS aid
      ), '[]'::jsonb),
      'my_decision', (SELECT va.decision FROM public.vertical_application_approvals va
                       WHERE va.application_id = a.id AND va.approver_user_id = _uid),
      'i_am_approver', (_uid = ANY (v.required_approver_ids))
    ) AS x
    FROM public.vertical_applications a
    JOIN public.verticals v ON v.vertical = a.vertical
    LEFT JOIN public.profiles p ON p.user_id = a.user_id
    WHERE (a.status = _status OR _status = 'all')
      AND (
        public.has_role(_uid,'admin'::app_role)
        OR public.has_role(_uid,'owner'::app_role)
        OR v.president_user_id = _uid
      )
  ) s;

  RETURN _res;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_applications_awaiting_me()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COUNT(*)::int
  FROM public.vertical_applications a
  JOIN public.verticals v ON v.vertical = a.vertical
  WHERE a.status = 'pending'
    AND auth.uid() = ANY (v.required_approver_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.vertical_application_approvals va
      WHERE va.application_id = a.id AND va.approver_user_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.admin_set_president(_user_id uuid, _vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _actor text; _old uuid; _v record;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error','Owner only');
  END IF;
  SELECT * INTO _v FROM public.verticals WHERE vertical = _vertical;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error','Unknown industry'); END IF;
  _old := _v.president_user_id;

  UPDATE public.verticals
    SET president_user_id = _user_id,
        required_approver_ids = (
          SELECT ARRAY(SELECT DISTINCT u FROM unnest(
            (SELECT COALESCE(array_remove(required_approver_ids, _old), '{}'::uuid[]) FROM public.verticals WHERE vertical = _vertical)
            || ARRAY[_user_id]::uuid[]) AS u WHERE u IS NOT NULL)
        ),
        updated_at = now()
    WHERE vertical = _vertical;

  IF _user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'president'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT COALESCE(full_name,'Owner') INTO _actor FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, before_value, after_value)
  VALUES (auth.uid(), _actor, 'set_president', 'vertical', _vertical, _v.name, _old::text, _user_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_to_vertical(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_vertical_application(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_workspaces() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_active_vertical(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_vertical_applications(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_applications_awaiting_me() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_president(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_to_vertical(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_vertical_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_workspaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_vertical(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vertical_applications(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_applications_awaiting_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_president(uuid, text) TO authenticated;

-- Old instant join is replaced by the application flow
DROP FUNCTION IF EXISTS public.join_vertical(text);

-- ============ PRESIDENT ROLES + BACKFILL ============
INSERT INTO public.user_roles (user_id, role) VALUES
  ('00baa414-57c8-42e5-a20b-3804412aab58','president'::app_role),
  ('0186b7f6-7c81-4402-ba71-f5ab2d11fcac','president'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, approved_at, activated_at)
SELECT p.user_id, 'Pest', 'active', now(), now()
FROM public.profiles p
WHERE COALESCE(p.archived,false) = false
  AND p.user_id IS NOT NULL
  AND COALESCE(p.vertical,'Pest') = 'Pest'
ON CONFLICT (user_id, vertical) DO NOTHING;

UPDATE public.rep_vertical_enrollments
  SET status = 'active', activated_at = COALESCE(activated_at, now()), updated_at = now()
WHERE vertical = 'Pest' AND status = 'interested';

UPDATE public.profiles p
  SET active_vertical = COALESCE(
    (SELECT e.vertical FROM public.rep_vertical_enrollments e
      WHERE e.user_id = p.user_id AND e.status IN ('active','onboarding','approved')
      ORDER BY (e.vertical = COALESCE(p.vertical,'Pest')) DESC, e.created_at ASC LIMIT 1),
    COALESCE(p.vertical,'Pest'))
WHERE p.active_vertical IS NULL AND p.user_id IS NOT NULL;

-- ============ PRESIDENT RLS INSIDE OWN WORKSPACE ============
CREATE POLICY "presidents read workspace profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_president_of_rep(auth.uid(), user_id));
CREATE POLICY "presidents update workspace profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_president_of_rep(auth.uid(), user_id))
  WITH CHECK (public.is_president_of_rep(auth.uid(), user_id));

CREATE POLICY "presidents manage workspace memberships"
  ON public.rep_vertical_enrollments FOR ALL TO authenticated
  USING (public.is_president_of(auth.uid(), vertical))
  WITH CHECK (public.is_president_of(auth.uid(), vertical));

CREATE POLICY "presidents manage workspace regions"
  ON public.regions FOR ALL TO authenticated
  USING (public.is_president_of(auth.uid(), vertical))
  WITH CHECK (public.is_president_of(auth.uid(), vertical));

CREATE POLICY "presidents manage workspace path"
  ON public.vertical_paths FOR ALL TO authenticated
  USING (public.is_president_of(auth.uid(), vertical))
  WITH CHECK (public.is_president_of(auth.uid(), vertical));

CREATE POLICY "presidents manage workspace steps"
  ON public.vertical_steps FOR ALL TO authenticated
  USING (public.is_president_of(auth.uid(), vertical))
  WITH CHECK (public.is_president_of(auth.uid(), vertical));

CREATE POLICY "presidents manage workspace installs"
  ON public.fiber_installs FOR ALL TO authenticated
  USING (public.is_president_of(auth.uid(), 'Fiber'))
  WITH CHECK (public.is_president_of(auth.uid(), 'Fiber'));

CREATE POLICY "presidents read workspace stacks"
  ON public.rank_stacks FOR SELECT TO authenticated
  USING (public.is_president_of(auth.uid(), vertical));
CREATE POLICY "presidents edit unconfirmed workspace stacks"
  ON public.rank_stacks FOR UPDATE TO authenticated
  USING (public.is_president_of(auth.uid(), vertical))
  WITH CHECK (public.is_president_of(auth.uid(), vertical) AND confirmed = false);
CREATE POLICY "presidents insert workspace stacks"
  ON public.rank_stacks FOR INSERT TO authenticated
  WITH CHECK (public.is_president_of(auth.uid(), vertical) AND confirmed = false);