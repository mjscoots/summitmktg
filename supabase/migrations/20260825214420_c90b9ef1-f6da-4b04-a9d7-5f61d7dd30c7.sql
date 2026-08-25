-- 1. RANKS
CREATE TABLE public.ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ranks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ranks TO authenticated;
GRANT ALL ON public.ranks TO service_role;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranks readable by authenticated" ON public.ranks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ranks managed by admins" ON public.ranks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER ranks_updated_at BEFORE UPDATE ON public.ranks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ranks (name, sort_order) VALUES
  ('Rookie',1),('Rep',2),('Senior Rep',3),('Team Lead',4),('Senior Team Lead',5),
  ('Manager',6),('Rising Regional',7),('Regional',8),('Senior Regional',9);

-- 2. CARRIERS
CREATE TABLE public.carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carriers TO authenticated;
GRANT ALL ON public.carriers TO service_role;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carriers readable by authenticated" ON public.carriers FOR SELECT TO authenticated USING (true);
CREATE POLICY "carriers managed by admins" ON public.carriers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER carriers_updated_at BEFORE UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.carriers (vertical, name, active, public) VALUES
  ('Fiber','Sonic',true,true),('Fiber','Surf',true,true);

-- 3. RANK STACKS
CREATE TABLE public.rank_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_id uuid NOT NULL REFERENCES public.ranks(id) ON DELETE CASCADE,
  vertical text NOT NULL,
  carrier_id uuid REFERENCES public.carriers(id) ON DELETE CASCADE,
  value numeric,
  unit text,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rank_stacks_unique ON public.rank_stacks (rank_id, vertical, COALESCE(carrier_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rank_stacks TO authenticated;
GRANT ALL ON public.rank_stacks TO service_role;
ALTER TABLE public.rank_stacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rank_stacks confirmed readable" ON public.rank_stacks FOR SELECT TO authenticated
  USING (confirmed = true
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "rank_stacks managed by admins" ON public.rank_stacks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER rank_stacks_updated_at BEFORE UPDATE ON public.rank_stacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- fiber / Sonic draft stack (unconfirmed)
INSERT INTO public.rank_stacks (rank_id, vertical, carrier_id, value, unit, confirmed)
SELECT r.id, 'Fiber', c.id, v.val, 'per install', false
FROM (VALUES
  ('Rookie',50),('Rep',150),('Senior Rep',200),('Team Lead',250),('Senior Team Lead',300),
  ('Manager',350),('Rising Regional',375),('Regional',400),('Senior Regional',425)
) AS v(rank_name, val)
JOIN public.ranks r ON r.name = v.rank_name
JOIN public.carriers c ON c.vertical='Fiber' AND c.name='Sonic';

-- fiber / Surf rows exist with no value (owner sets them)
INSERT INTO public.rank_stacks (rank_id, vertical, carrier_id, value, unit, confirmed)
SELECT r.id, 'Fiber', c.id, NULL, 'per install', false
FROM public.ranks r
JOIN public.carriers c ON c.vertical='Fiber' AND c.name='Surf';

-- 4. RANK REQUIREMENTS
CREATE TABLE public.rank_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_rank_id uuid NOT NULL REFERENCES public.ranks(id) ON DELETE CASCADE,
  vertical text,
  rule_type text NOT NULL CHECK (rule_type IN ('installs_total','installs_per_week','weeks_active','producing_reps','team_leads_under','managers_under','custom_text')),
  value numeric,
  window_weeks int,
  description text,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rank_requirements TO authenticated;
GRANT ALL ON public.rank_requirements TO service_role;
ALTER TABLE public.rank_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rank_requirements confirmed readable" ON public.rank_requirements FOR SELECT TO authenticated
  USING (confirmed = true
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "rank_requirements managed by admins" ON public.rank_requirements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER rank_requirements_updated_at BEFORE UPDATE ON public.rank_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rank_requirements (from_rank_id, vertical, rule_type, value, window_weeks, description, confirmed)
SELECT r.id, 'Fiber', v.rule_type, v.val, v.win, v.descr, false
FROM (VALUES
  ('Rookie','installs_total',20,NULL,'Rookie to Rep: 20 installs total, or 4 weeks active, whichever comes first.'),
  ('Rookie','weeks_active',4,NULL,'Rookie to Rep: 20 installs total, or 4 weeks active, whichever comes first.'),
  ('Rep','installs_per_week',6,4,'Rep to Senior Rep: 6 installs a week for 4 straight weeks.'),
  ('Senior Rep','producing_reps',3,NULL,'Senior Rep to Team Lead: 3 producing reps.'),
  ('Team Lead','producing_reps',6,NULL,'Team Lead to Senior Team Lead: 6 producing reps.'),
  ('Senior Team Lead','producing_reps',10,NULL,'Senior Team Lead to Manager: 10 producing reps, or 2 team leads under you.'),
  ('Senior Team Lead','team_leads_under',2,NULL,'Senior Team Lead to Manager: 10 producing reps, or 2 team leads under you.'),
  ('Manager','producing_reps',20,NULL,'Manager to Regional: 20 producing reps, or 2 managers under you.'),
  ('Manager','managers_under',2,NULL,'Manager to Regional: 20 producing reps, or 2 managers under you.')
) AS v(rank_name, rule_type, val, win, descr)
JOIN public.ranks r ON r.name = v.rank_name;

-- 5. SETTINGS
INSERT INTO public.app_settings (key, value) VALUES
  ('summit_stack_fiber_sonic',''),
  ('summit_stack_fiber_surf',''),
  ('vertical_lead_margin','50'),
  ('fiber_expense_allowance_per_install',''),
  ('fiber_holdback_percent',''),
  ('producing_rep_definition','A producing rep is a paired rep with at least 1 install (fiber) in the last 4 weeks.')
ON CONFLICT (key) DO NOTHING;

-- 6. PROFILES.rank_id + derivation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank_id uuid REFERENCES public.ranks(id) ON DELETE SET NULL;

UPDATE public.profiles p SET rank_id = r.id
FROM public.ranks r
WHERE r.name = 'Manager'
  AND p.rank_id IS NULL
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'manager');

UPDATE public.profiles p SET rank_id = r.id
FROM public.ranks r
WHERE r.name = 'Rep'
  AND p.rank_id IS NULL
  AND COALESCE(NULLIF(regexp_replace(COALESCE(p.rep_year,''), '\D', '', 'g'), '')::int, 1) >= 2
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('manager','admin','owner'));

UPDATE public.profiles p SET rank_id = r.id
FROM public.ranks r
WHERE r.name = 'Rookie'
  AND p.rank_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('manager','admin','owner'));

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
  NEW.rank_id := OLD.rank_id;
  RETURN NEW;
END;
$function$;

-- 7. FIBER INSTALLS
CREATE TABLE public.fiber_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  carrier_id uuid NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  installs int NOT NULL DEFAULT 0,
  cancels int NOT NULL DEFAULT 0,
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, carrier_id, week_start)
);
CREATE INDEX fiber_installs_user_idx ON public.fiber_installs (user_id, week_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiber_installs TO authenticated;
GRANT ALL ON public.fiber_installs TO service_role;
ALTER TABLE public.fiber_installs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_paired_manager_of(_manager uuid, _rep uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rep_vertical_enrollments e
    WHERE e.user_id = _rep AND e.paired_manager = _manager
  );
$$;
REVOKE ALL ON FUNCTION public.is_paired_manager_of(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_paired_manager_of(uuid,uuid) TO authenticated, service_role;

CREATE POLICY "fiber_installs own read" ON public.fiber_installs FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner')
    OR (public.has_role(auth.uid(),'manager') AND public.is_paired_manager_of(auth.uid(), user_id)));
CREATE POLICY "fiber_installs staff write" ON public.fiber_installs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
    OR (public.has_role(auth.uid(),'manager') AND public.is_paired_manager_of(auth.uid(), user_id)));
CREATE POLICY "fiber_installs staff update" ON public.fiber_installs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
    OR (public.has_role(auth.uid(),'manager') AND public.is_paired_manager_of(auth.uid(), user_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
    OR (public.has_role(auth.uid(),'manager') AND public.is_paired_manager_of(auth.uid(), user_id)));
CREATE POLICY "fiber_installs admin delete" ON public.fiber_installs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER fiber_installs_updated_at BEFORE UPDATE ON public.fiber_installs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. RANK OVERRIDE RPC (audit logged)
CREATE OR REPLACE FUNCTION public.admin_set_rank(_user_id uuid, _rank_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  SELECT rank_id INTO _old FROM public.profiles WHERE user_id = _user_id;
  UPDATE public.profiles SET rank_id = _rank_id WHERE user_id = _user_id;
  PERFORM public.write_audit('rank_override','profiles', _user_id::text,
    jsonb_build_object('old_rank_id', _old, 'new_rank_id', _rank_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_rank(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_rank(uuid,uuid) TO authenticated, service_role;

-- 9. LADDER RUNG NOW DERIVED FROM RANK
CREATE OR REPLACE FUNCTION public.get_ladder()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _p record;
  _role text;
  _rank text;
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
  SELECT name INTO _rank FROM public.ranks WHERE id = _p.rank_id;

  _year := COALESCE(NULLIF(regexp_replace(COALESCE(_p.rep_year,''), '\D', '', 'g'), '')::int, 1);

  SELECT COUNT(DISTINCT season_id) INTO _seasons FROM public.season_results WHERE user_id = _uid;

  _rung := CASE
    WHEN _rank IN ('Rookie','Rep','Senior Rep') THEN 1
    WHEN _rank IN ('Team Lead','Senior Team Lead') THEN 2
    WHEN _rank IN ('Manager','Rising Regional') THEN 3
    WHEN _rank IN ('Regional','Senior Regional') THEN 4
    ELSE NULL
  END;

  IF _rung IS NULL THEN
    IF _role IN ('owner','admin') THEN _rung := 4;
    ELSIF _role = 'manager' THEN _rung := 3;
    ELSIF _year >= 2 THEN _rung := 2;
    ELSE _rung := 1;
    END IF;
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
    'my_rank', COALESCE(_rank, CASE WHEN _role IN ('owner','admin') THEN 'Summit' ELSE NULL END),
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
$function$;