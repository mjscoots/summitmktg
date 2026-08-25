-- 1. Profile override field
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ladder_rung_override integer;

CREATE OR REPLACE FUNCTION public.protect_privileged_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_staff := public.has_role(auth.uid(),'manager')
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'owner');

  IF is_staff THEN
    RETURN NEW;
  END IF;

  NEW.approved := OLD.approved;
  NEW.status := OLD.status;
  NEW.cumulative_points := OLD.cumulative_points;
  NEW.team_id := OLD.team_id;
  NEW.direct_manager := OLD.direct_manager;
  NEW.archived := OLD.archived;
  NEW.rep_year := OLD.rep_year;
  NEW.recruited_by_user_id := OLD.recruited_by_user_id;
  NEW.recruited_by_name := OLD.recruited_by_name;
  NEW.office_id := OLD.office_id;
  NEW.vertical := OLD.vertical;
  NEW.runs_vertical := OLD.runs_vertical;
  NEW.status_detail := OLD.status_detail;
  NEW.departure_type := OLD.departure_type;
  NEW.departure_reason := OLD.departure_reason;
  NEW.last_day_worked := OLD.last_day_worked;
  NEW.revenue_to_date := OLD.revenue_to_date;
  NEW.committed_last_day := OLD.committed_last_day;
  NEW.commitment_terms := OLD.commitment_terms;
  NEW.next_year_status := OLD.next_year_status;
  NEW.next_year_status_at := OLD.next_year_status_at;
  NEW.next_year_notes := OLD.next_year_notes;
  NEW.next_year_updated_by := OLD.next_year_updated_by;
  NEW.ladder_rung_override := OLD.ladder_rung_override;
  RETURN NEW;
END;
$function$;

-- 2. Ladder rungs (admin-editable copy)
CREATE TABLE IF NOT EXISTS public.ladder_rungs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rung integer NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ladder_rungs TO authenticated;
GRANT ALL ON public.ladder_rungs TO service_role;
ALTER TABLE public.ladder_rungs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ladder_rungs_read" ON public.ladder_rungs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ladder_rungs_admin_write" ON public.ladder_rungs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE TRIGGER trg_ladder_rungs_updated
  BEFORE UPDATE ON public.ladder_rungs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ladder_rungs (rung, title, description) VALUES
  (1, 'Sell', 'Learn the product, run the doors, and put up your own numbers.'),
  (2, 'Recruit + Sell', 'Keep selling while you bring in your first reps.'),
  (3, 'Manage + Recruit + Sell', 'Run a team in the field while you keep recruiting and selling.'),
  (4, 'Leader', 'Own an industry: build managers, set the standard, and run the region.')
ON CONFLICT (rung) DO NOTHING;

INSERT INTO public.app_settings (key, value) VALUES
  ('ladder_timeline_note', 'Typically about a year per rung.'),
  ('graduation_min_seasons', '1'),
  ('graduation_min_rep_year', '2')
ON CONFLICT (key) DO NOTHING;

-- 3. Team lead applications
CREATE TABLE IF NOT EXISTS public.team_lead_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vertical text NOT NULL,
  why text NOT NULL,
  prior_results text,
  availability text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_lead_applications TO authenticated;
GRANT ALL ON public.team_lead_applications TO service_role;
ALTER TABLE public.team_lead_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tla_own_read" ON public.team_lead_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "tla_own_insert" ON public.team_lead_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tla_admin_update" ON public.team_lead_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE INDEX IF NOT EXISTS idx_tla_status ON public.team_lead_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tla_user ON public.team_lead_applications(user_id, created_at DESC);

CREATE TRIGGER trg_tla_updated
  BEFORE UPDATE ON public.team_lead_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Ladder + eligibility
CREATE OR REPLACE FUNCTION public.get_ladder()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _p record;
  _role text;
  _rung int;
  _year int;
  _seasons int;
  _min_seasons int;
  _min_year int;
  _eligible boolean := false;
  _app record;
  _reapply date;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rungs','[]'::jsonb); END IF;

  SELECT * INTO _p FROM public.profiles WHERE user_id = _uid;
  SELECT public.get_user_role(_uid) INTO _role;

  _year := COALESCE(NULLIF(regexp_replace(COALESCE(_p.rep_year,''), '\D', '', 'g'), '')::int, 1);

  SELECT COUNT(DISTINCT season_id) INTO _seasons FROM public.season_results WHERE user_id = _uid;

  IF _role IN ('owner','admin') THEN _rung := 4;
  ELSIF _role = 'manager' THEN _rung := 3;
  ELSIF _year >= 2 THEN _rung := 2;
  ELSE _rung := 1;
  END IF;
  IF _p.ladder_rung_override IS NOT NULL THEN _rung := _p.ladder_rung_override; END IF;

  SELECT COALESCE(NULLIF(value,'')::int,1) INTO _min_seasons FROM public.app_settings WHERE key='graduation_min_seasons';
  SELECT COALESCE(NULLIF(value,'')::int,2) INTO _min_year FROM public.app_settings WHERE key='graduation_min_rep_year';
  _min_seasons := COALESCE(_min_seasons,1);
  _min_year := COALESCE(_min_year,2);

  SELECT * INTO _app FROM public.team_lead_applications
   WHERE user_id = _uid ORDER BY created_at DESC LIMIT 1;

  IF _app.id IS NOT NULL AND _app.status = 'denied' THEN
    _reapply := (COALESCE(_app.reviewed_at, _app.created_at) + interval '30 days')::date;
  END IF;

  IF _role NOT IN ('owner','admin','manager')
     AND COALESCE(_seasons,0) >= _min_seasons
     AND _year >= _min_year
     AND COALESCE(_p.archived,false) = false THEN
    _eligible := true;
  END IF;

  IF _app.id IS NOT NULL AND _app.status = 'pending' THEN _eligible := false; END IF;
  IF _reapply IS NOT NULL AND _reapply > CURRENT_DATE THEN _eligible := false; END IF;

  RETURN jsonb_build_object(
    'rungs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'rung',rung,'title',title,'description',description) ORDER BY rung)
                        FROM public.ladder_rungs), '[]'::jsonb),
    'timeline_note', (SELECT value FROM public.app_settings WHERE key='ladder_timeline_note'),
    'my_rung', _rung,
    'seasons_completed', COALESCE(_seasons,0),
    'rep_year', _year,
    'min_seasons', _min_seasons,
    'min_rep_year', _min_year,
    'can_apply', _eligible,
    'application', CASE WHEN _app.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',_app.id,'vertical',_app.vertical,'status',_app.status,
        'created_at',_app.created_at,'review_note',_app.review_note) END,
    'reapply_after', _reapply
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_run_team(_vertical text, _why text, _prior_results text, _availability text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _gate jsonb;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not signed in'); END IF;
  IF COALESCE(trim(_why),'') = '' THEN RETURN jsonb_build_object('success',false,'error','Tell us why'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vertical_paths WHERE vertical = _vertical) THEN
    RETURN jsonb_build_object('success',false,'error','Unknown industry');
  END IF;

  _gate := public.get_ladder();
  IF NOT COALESCE((_gate->>'can_apply')::boolean,false) THEN
    RETURN jsonb_build_object('success',false,'error','Not eligible to apply right now');
  END IF;

  INSERT INTO public.team_lead_applications(user_id, vertical, why, prior_results, availability)
  VALUES (_uid, _vertical, left(trim(_why),2000), left(COALESCE(_prior_results,''),2000), left(COALESCE(_availability,''),1000))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('success',true,'id',_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_lead_applications(_status text DEFAULT 'pending')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb);
  END IF;

  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC) FROM (
      SELECT a.id, a.user_id, a.vertical, a.why, a.prior_results, a.availability,
             a.status, a.review_note, a.created_at, a.reviewed_at,
             p.full_name, p.avatar_url, p.rep_year, p.office_name, p.vertical AS current_vertical,
             p.cumulative_points, p.revenue_to_date,
             (SELECT COUNT(DISTINCT season_id) FROM public.season_results sr WHERE sr.user_id = a.user_id) AS seasons_completed,
             (SELECT COUNT(*) FROM public.recruiting_leads rl WHERE rl.assigned_to = a.user_id) AS leads_worked
      FROM public.team_lead_applications a
      JOIN public.profiles p ON p.user_id = a.user_id
      WHERE (_status IS NULL OR a.status = _status)
    ) x
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.review_team_lead_application(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _a record;
  _name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success',false,'error','Not allowed');
  END IF;

  SELECT * INTO _a FROM public.team_lead_applications WHERE id = _id;
  IF _a.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not found'); END IF;
  IF _a.status <> 'pending' THEN RETURN jsonb_build_object('success',false,'error','Already reviewed'); END IF;

  SELECT full_name INTO _name FROM public.profiles WHERE user_id = _a.user_id;

  UPDATE public.team_lead_applications
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'denied' END,
         review_note = NULLIF(trim(COALESCE(_note,'')),''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE id = _id;

  IF _approve THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_a.user_id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles
       SET vertical = COALESCE(vertical, _a.vertical),
           accepting_new_reps = true,
           updated_at = now()
     WHERE user_id = _a.user_id;

    INSERT INTO public.rep_vertical_enrollments(user_id, vertical, status, activated_at)
    VALUES (_a.user_id, _a.vertical, 'active', now())
    ON CONFLICT (user_id, vertical) DO UPDATE SET status = 'active', activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now());

    PERFORM public.write_audit('approve_team_lead','profile', _a.user_id::text, COALESCE(_name,'Rep'),
      'role', 'rookie', 'manager (' || _a.vertical || ')');

    INSERT INTO public.user_notifications(user_id, title, message, link)
    VALUES (_a.user_id, 'You are running a team',
            'Your request to run a ' || _a.vertical || ' team was approved.', '/app/team');
  ELSE
    PERFORM public.write_audit('deny_team_lead','profile', _a.user_id::text, COALESCE(_name,'Rep'),
      'team_lead_application', 'pending', 'denied');

    INSERT INTO public.user_notifications(user_id, title, message, link)
    VALUES (_a.user_id, 'Run a team request',
            'Your request to run a ' || _a.vertical || ' team was not approved this time.'
            || CASE WHEN NULLIF(trim(COALESCE(_note,'')),'') IS NULL THEN '' ELSE ' Note: ' || trim(_note) END
            || ' You can apply again in 30 days.', '/app/industries');
  END IF;

  RETURN jsonb_build_object('success',true);
END;
$$;

-- 5. The Stack
CREATE OR REPLACE FUNCTION public.get_the_stack()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _out jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('verticals','[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'owner', (SELECT jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'avatar_url',p.avatar_url)
                FROM public.profiles p
                JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'owner'
               WHERE COALESCE(p.archived,false) = false
               ORDER BY p.created_at LIMIT 1),
    'verticals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', vp.vertical,
        'label', vp.label,
        'lead', (SELECT jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'avatar_url',p.avatar_url)
                   FROM public.profiles p
                  WHERE p.vertical = vp.vertical AND COALESCE(p.runs_vertical,false) = true
                    AND COALESCE(p.archived,false) = false
                  ORDER BY p.full_name LIMIT 1),
        'total_reps', (SELECT COUNT(*) FROM public.profiles p
                        WHERE p.vertical = vp.vertical AND COALESCE(p.archived,false) = false
                          AND COALESCE(p.approved,false) = true),
        'managers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'full_name', m.full_name,
            'avatar_url', m.avatar_url,
            'accepting', COALESCE(m.accepting_new_reps,false),
            'capacity', m.mentee_capacity,
            'mentee_count', (SELECT COUNT(*) FROM public.rep_vertical_enrollments e
                              WHERE e.paired_manager = m.user_id AND e.vertical = vp.vertical),
            'rep_count', (SELECT COUNT(*) FROM public.profiles d
                           WHERE d.direct_manager = m.user_id AND COALESCE(d.archived,false) = false)
          ) ORDER BY m.full_name)
          FROM public.profiles m
          WHERE m.vertical = vp.vertical
            AND COALESCE(m.archived,false) = false
            AND COALESCE(m.runs_vertical,false) = false
            AND EXISTS (SELECT 1 FROM public.user_roles r
                         WHERE r.user_id = m.user_id AND r.role IN ('manager','admin'))
        ), '[]'::jsonb)
      ) ORDER BY vp.display_order)
      FROM public.vertical_paths vp
    ), '[]'::jsonb)
  ) INTO _out;

  RETURN _out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ladder() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_run_team(text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_lead_applications(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_team_lead_application(uuid,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_the_stack() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ladder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_run_team(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_lead_applications(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_team_lead_application(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_the_stack() TO authenticated;