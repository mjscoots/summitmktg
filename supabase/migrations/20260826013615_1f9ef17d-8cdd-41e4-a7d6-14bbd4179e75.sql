-- =========================================================
-- PASS 49 — ACCESS TIERS + LEADS SYSTEM
-- =========================================================

-- ---------- 1. TIERS ----------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_recruit boolean NOT NULL DEFAULT false;

-- recruiter role folds into Sales + can_recruit
UPDATE public.profiles p SET can_recruit = true
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role::text = 'recruiter');
DELETE FROM public.user_roles WHERE role::text = 'recruiter';

-- Brendan Pillar: Admin + President of Fiber
INSERT INTO public.user_roles (user_id, role)
SELECT '00baa414-57c8-42e5-a20b-3804412aab58'::uuid, 'admin'::public.app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '00baa414-57c8-42e5-a20b-3804412aab58'::uuid AND role = 'admin'::public.app_role
);
DELETE FROM public.user_roles
WHERE user_id = '00baa414-57c8-42e5-a20b-3804412aab58'::uuid
  AND role::text IN ('manager','president');
UPDATE public.verticals SET president_user_id = '00baa414-57c8-42e5-a20b-3804412aab58'::uuid
WHERE slug = 'fiber';

-- tier resolver
CREATE OR REPLACE FUNCTION public.user_tier(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _uid IS NULL THEN 'sales'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'owner'::public.app_role) THEN 'owner'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin'::public.app_role) THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text IN ('manager','president')) THEN 'manager'
    ELSE 'sales'
  END;
$$;
GRANT EXECUTE ON FUNCTION public.user_tier(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_owner(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'owner'::public.app_role);
$$;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;

-- only staff may write roles; only the owner may write admin/owner rows
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Staff insert non-admin roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner(auth.uid())
    OR (public.is_staff(auth.uid()) AND role::text NOT IN ('admin','owner'))
  );
CREATE POLICY "Staff update non-admin roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR (public.is_staff(auth.uid()) AND role::text NOT IN ('admin','owner'))
  )
  WITH CHECK (
    public.is_owner(auth.uid())
    OR (public.is_staff(auth.uid()) AND role::text NOT IN ('admin','owner'))
  );
CREATE POLICY "Staff delete non-admin roles" ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR (public.is_staff(auth.uid()) AND role::text NOT IN ('admin','owner'))
  );

-- one-tap tier change
CREATE OR REPLACE FUNCTION public.admin_set_tier(_user_id uuid, _tier text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _before text; _label text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and the owner can change access';
  END IF;
  IF _tier NOT IN ('sales','manager','admin','owner') THEN
    RAISE EXCEPTION 'Unknown tier %', _tier;
  END IF;
  _before := public.user_tier(_user_id);
  IF (_tier IN ('admin','owner') OR _before IN ('admin','owner')) AND NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can grant or remove admin access';
  END IF;

  SELECT full_name INTO _label FROM public.profiles WHERE user_id = _user_id;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, CASE _tier
    WHEN 'sales' THEN 'rookie'::public.app_role
    WHEN 'manager' THEN 'manager'::public.app_role
    WHEN 'admin' THEN 'admin'::public.app_role
    ELSE 'owner'::public.app_role END);

  PERFORM public.write_audit('tier_change','profile',_user_id::text,COALESCE(_label,'unknown'),'tier',_before,_tier);
  RETURN _tier;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_tier(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_can_recruit(_user_id uuid, _value boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and the owner can change access';
  END IF;
  SELECT full_name INTO _label FROM public.profiles WHERE user_id = _user_id;
  UPDATE public.profiles SET can_recruit = _value, updated_at = now() WHERE user_id = _user_id;
  PERFORM public.write_audit('can_recruit','profile',_user_id::text,COALESCE(_label,'unknown'),'can_recruit',NULL,_value::text);
  RETURN _value;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_can_recruit(uuid, boolean) TO authenticated;

-- ---------- 2. LEADS: cursor table ----------

CREATE TABLE IF NOT EXISTS public.lead_call_cursors (
  user_id uuid PRIMARY KEY,
  lead_id uuid REFERENCES public.people_leads(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'mine',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_call_cursors TO authenticated;
GRANT ALL ON public.lead_call_cursors TO service_role;
ALTER TABLE public.lead_call_cursors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own call cursor" ON public.lead_call_cursors FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- 3. LEADS: list + detail ----------

CREATE OR REPLACE FUNCTION public.leads_list(
  _scope text DEFAULT 'mine',
  _search text DEFAULT NULL,
  _system text DEFAULT NULL,
  _roster_status text DEFAULT NULL,
  _stage text DEFAULT NULL,
  _designated_to uuid DEFAULT NULL,
  _tag text DEFAULT NULL,
  _has_phone boolean DEFAULT NULL,
  _signed boolean DEFAULT NULL,
  _rev_min numeric DEFAULT NULL,
  _rev_max numeric DEFAULT NULL,
  _limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid, profile_id uuid, full_name text, phone text, email text,
  system text, roster_status text, season_revenue numeric, rev_per_day numeric,
  start_date date, days_in_market integer, committed_last_day date,
  signed_2027 boolean, rep_year text, recruiter_name text, former_manager_name text,
  team_name text, role_title text, tags text[], notes text,
  stage text, designation_status text, designated_to uuid, designated_to_name text,
  designated_has_access boolean, next_call_at timestamptz, last_contact_at timestamptz,
  call_count integer, do_not_call boolean, last_outcome text, on_roster boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier text := public.user_tier(auth.uid());
BEGIN
  IF _tier = 'sales' THEN RETURN; END IF;
  IF _scope = 'all' AND _tier NOT IN ('admin','owner') THEN RETURN; END IF;

  RETURN QUERY
  SELECT l.id, l.profile_id, l.full_name, l.phone, l.email,
         l.system, l.roster_status, l.season_revenue, l.rev_per_day,
         l.start_date, l.days_in_market, l.committed_last_day,
         l.signed_2027, l.rep_year, l.recruiter_name, l.former_manager_name,
         l.team_name, l.role_title, l.tags, l.notes,
         l.stage, l.designation_status, l.designated_to,
         dp.full_name AS designated_to_name,
         (l.designated_to IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles x
            WHERE x.user_id = l.designated_to AND x.approved AND NOT x.archived)) AS designated_has_access,
         l.next_call_at, l.last_contact_at, l.call_count, l.do_not_call,
         (SELECT a.outcome FROM public.lead_activities a
           WHERE a.lead_id = l.id AND a.outcome IS NOT NULL
           ORDER BY a.created_at DESC LIMIT 1) AS last_outcome,
         COALESCE(rp.approved AND NOT rp.archived, false) AS on_roster
  FROM public.people_leads l
  LEFT JOIN public.profiles dp ON dp.user_id = l.designated_to
  LEFT JOIN public.profiles rp ON rp.id = l.profile_id
  WHERE
    CASE _scope
      WHEN 'mine' THEN (l.designated_to = auth.uid() OR l.claimed_by = auth.uid())
        AND l.stage NOT IN ('excluded','dead') AND NOT l.do_not_call
        AND COALESCE(rp.approved AND NOT rp.archived, false) = false
      WHEN 'free' THEN l.designation_status = 'free'
        AND l.stage NOT IN ('excluded','dead') AND NOT l.do_not_call
        AND COALESCE(rp.approved AND NOT rp.archived, false) = false
      ELSE true
    END
    AND (_search IS NULL OR l.full_name ILIKE '%' || _search || '%' OR COALESCE(l.phone,'') ILIKE '%' || _search || '%')
    AND (_system IS NULL OR l.system = _system)
    AND (_roster_status IS NULL OR l.roster_status = _roster_status)
    AND (_stage IS NULL OR l.stage = _stage)
    AND (_designated_to IS NULL OR l.designated_to = _designated_to)
    AND (_tag IS NULL OR _tag = ANY(l.tags))
    AND (_has_phone IS NULL OR (_has_phone AND l.phone IS NOT NULL) OR (NOT _has_phone AND l.phone IS NULL))
    AND (_signed IS NULL OR COALESCE(l.signed_2027,false) = _signed)
    AND (_rev_min IS NULL OR COALESCE(l.season_revenue,0) >= _rev_min)
    AND (_rev_max IS NULL OR COALESCE(l.season_revenue,0) <= _rev_max)
  ORDER BY COALESCE(l.season_revenue,0) DESC, COALESCE(l.signed_2027,false) ASC, l.full_name
  LIMIT GREATEST(COALESCE(_limit,200), 1);
END;
$$;
GRANT EXECUTE ON FUNCTION public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.lead_detail(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads; _out jsonb;
BEGIN
  IF _tier = 'sales' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _tier = 'manager' AND NOT (
      _l.designated_to = auth.uid() OR _l.claimed_by = auth.uid() OR _l.designation_status = 'free'
    ) THEN RAISE EXCEPTION 'Not permitted'; END IF;

  _out := jsonb_build_object(
    'lead', to_jsonb(_l) - 'sheet_row',
    'designated_to_name', (SELECT full_name FROM public.profiles WHERE user_id = _l.designated_to),
    'designated_has_access', (_l.designated_to IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles x WHERE x.user_id = _l.designated_to AND x.approved AND NOT x.archived)),
    'profile', (SELECT jsonb_build_object('id', p.id, 'user_id', p.user_id, 'full_name', p.full_name,
                        'approved', p.approved, 'archived', p.archived, 'status', p.status,
                        'revenue_to_date', p.revenue_to_date, 'last_sweep_at', p.last_sweep_at)
                FROM public.profiles p WHERE p.id = _l.profile_id),
    'activities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                        'id', a.id, 'kind', a.kind, 'outcome', a.outcome, 'body', a.body,
                        'next_call_at', a.next_call_at, 'created_at', a.created_at,
                        'actor_name', (SELECT full_name FROM public.profiles WHERE user_id = a.actor_id))
                      ORDER BY a.created_at DESC)
                    FROM public.lead_activities a WHERE a.lead_id = _lead), '[]'::jsonb),
    'private_notes', CASE WHEN _tier IN ('admin','owner') THEN
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'body', n.body,
                    'created_at', n.created_at) ORDER BY n.created_at DESC)
                  FROM public.lead_private_notes n WHERE n.lead_id = _lead), '[]'::jsonb)
      ELSE NULL END
  );
  RETURN _out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.lead_detail(uuid) TO authenticated;

-- ---------- 4. LEADS: designation + activity RPCs ----------

CREATE OR REPLACE FUNCTION public.lead_claim(_lead uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier text := public.user_tier(auth.uid()); _status text;
BEGIN
  IF _tier NOT IN ('manager','admin','owner') THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT designation_status INTO _status FROM public.people_leads WHERE id = _lead;
  IF _status IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _status <> 'free' AND _tier = 'manager' THEN RAISE EXCEPTION 'This lead is already designated'; END IF;
  UPDATE public.people_leads
     SET designated_to = auth.uid(), designation_status = 'claimed',
         claimed_by = auth.uid(), claimed_at = now(), updated_at = now()
   WHERE id = _lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, kind, body)
  VALUES (_lead, auth.uid(), 'designation', 'Claimed');
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_free(_lead uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only admins and the owner can free a lead'; END IF;
  UPDATE public.people_leads
     SET designated_to = NULL, designation_status = 'free', claimed_by = NULL, claimed_at = NULL,
         freed_by = auth.uid(), freed_at = now(), updated_at = now()
   WHERE id = _lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, kind, body)
  VALUES (_lead, auth.uid(), 'designation', 'Marked free');
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_designate(_lead uuid, _to uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only admins and the owner can reassign a lead'; END IF;
  SELECT full_name INTO _name FROM public.profiles WHERE user_id = _to;
  UPDATE public.people_leads
     SET designated_to = _to, designation_status = 'designated',
         claimed_by = NULL, claimed_at = NULL, updated_at = now()
   WHERE id = _lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, kind, body)
  VALUES (_lead, auth.uid(), 'designation', 'Designated to ' || COALESCE(_name,'unknown'));
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_set_stage(_lead uuid, _stage text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads;
BEGIN
  IF _stage NOT IN ('new','contacted','callback','interested','not_interested','signed','dead','excluded') THEN
    RAISE EXCEPTION 'Unknown stage %', _stage;
  END IF;
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _tier = 'manager' THEN
    IF _stage = 'excluded' THEN RAISE EXCEPTION 'Only admins and the owner can exclude a lead'; END IF;
    IF NOT (_l.designated_to = auth.uid() OR _l.claimed_by = auth.uid()) THEN
      RAISE EXCEPTION 'Not permitted';
    END IF;
  ELSIF _tier = 'sales' THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  UPDATE public.people_leads
     SET stage = _stage,
         signed_2027 = CASE WHEN _stage = 'signed' THEN true ELSE signed_2027 END,
         updated_at = now()
   WHERE id = _lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, kind, outcome)
  VALUES (_lead, auth.uid(), 'stage', _stage);
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_log(
  _lead uuid, _kind text, _outcome text DEFAULT NULL,
  _body text DEFAULT NULL, _next_call_at timestamptz DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads; _stage text;
BEGIN
  IF _tier = 'sales' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _kind NOT IN ('call','text','note','stage','designation','restore') THEN
    RAISE EXCEPTION 'Unknown activity kind %', _kind;
  END IF;
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _tier = 'manager' AND NOT (
      _l.designated_to = auth.uid() OR _l.claimed_by = auth.uid() OR _l.designation_status = 'free'
    ) THEN RAISE EXCEPTION 'Not permitted'; END IF;

  _stage := CASE _outcome
    WHEN 'no_answer' THEN 'contacted'
    WHEN 'callback' THEN 'callback'
    WHEN 'interested' THEN 'interested'
    WHEN 'not_interested' THEN 'not_interested'
    WHEN 'signed' THEN 'signed'
    WHEN 'wrong_number' THEN 'dead'
    WHEN 'do_not_call' THEN 'dead'
    ELSE NULL END;

  INSERT INTO public.lead_activities (lead_id, actor_id, kind, outcome, body, next_call_at)
  VALUES (_lead, auth.uid(), _kind, _outcome, _body, _next_call_at);

  UPDATE public.people_leads
     SET last_contact_at = CASE WHEN _kind IN ('call','text') THEN now() ELSE last_contact_at END,
         call_count = call_count + CASE WHEN _kind = 'call' THEN 1 ELSE 0 END,
         next_call_at = CASE WHEN _outcome = 'callback' THEN _next_call_at ELSE next_call_at END,
         stage = COALESCE(_stage, stage),
         signed_2027 = CASE WHEN _outcome = 'signed' THEN true ELSE signed_2027 END,
         do_not_call = CASE WHEN _outcome IN ('do_not_call','wrong_number') THEN true ELSE do_not_call END,
         updated_at = now()
   WHERE id = _lead;
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_add_tag(_lead uuid, _tag text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only admins and the owner can tag leads'; END IF;
  UPDATE public.people_leads
     SET tags = (SELECT ARRAY(SELECT DISTINCT t FROM unnest(tags || _tag) t)), updated_at = now()
   WHERE id = _lead;
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_set_notes(_lead uuid, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads;
BEGIN
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _tier = 'sales' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _tier = 'manager' AND NOT (_l.designated_to = auth.uid() OR _l.claimed_by = auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  UPDATE public.people_leads SET notes = _notes, updated_at = now() WHERE id = _lead;
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_private_note_add(_lead uuid, _kind text, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _kind NOT IN ('note','mind','heart','feet','coming_back','on_track') THEN
    RAISE EXCEPTION 'Unknown note kind %', _kind;
  END IF;
  INSERT INTO public.lead_private_notes (lead_id, author_id, kind, body)
  VALUES (_lead, auth.uid(), _kind, _body);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lead_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_free(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_designate(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_set_stage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_log(uuid, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_add_tag(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_set_notes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_private_note_add(uuid, text, text) TO authenticated;

-- ---------- 5. Callbacks due + off-season report ----------

CREATE OR REPLACE FUNCTION public.leads_callbacks_due()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.user_tier(auth.uid()) = 'sales' THEN 0 ELSE (
    SELECT COUNT(*)::int FROM public.people_leads l
    WHERE (l.designated_to = auth.uid() OR l.claimed_by = auth.uid())
      AND l.stage = 'callback' AND NOT l.do_not_call
      AND l.next_call_at IS NOT NULL AND l.next_call_at <= now()
  ) END;
$$;
GRANT EXECUTE ON FUNCTION public.leads_callbacks_due() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_off_season_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _out jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT jsonb_build_object(
    'totals', (SELECT jsonb_build_object(
        'leads', COUNT(*),
        'with_phone', COUNT(*) FILTER (WHERE phone IS NOT NULL),
        'designated', COUNT(*) FILTER (WHERE designation_status IN ('designated','claimed')),
        'free', COUNT(*) FILTER (WHERE designation_status = 'free'))
      FROM public.people_leads),
    'funnel', COALESCE((SELECT jsonb_agg(jsonb_build_object('stage', s.stage, 'people', s.people, 'revenue', s.revenue)
                          ORDER BY s.ord)
        FROM (SELECT stage, COUNT(*) AS people, COALESCE(SUM(season_revenue),0) AS revenue,
                     CASE stage WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'callback' THEN 3
                                WHEN 'interested' THEN 4 WHEN 'signed' THEN 5 ELSE 6 END AS ord
              FROM public.people_leads
              WHERE stage IN ('new','contacted','callback','interested','signed')
              GROUP BY stage) s), '[]'::jsonb),
    'not_signed', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'full_name', full_name, 'season_revenue', season_revenue,
          'former_manager_name', former_manager_name, 'roster_status', roster_status,
          'phone', phone, 'stage', stage) ORDER BY COALESCE(season_revenue,0) DESC)
        FROM public.people_leads
        WHERE roster_status IN ('in_market','off_market') AND COALESCE(signed_2027,false) = false), '[]'::jsonb),
    'not_signed_revenue', (SELECT COALESCE(SUM(season_revenue),0) FROM public.people_leads
        WHERE roster_status IN ('in_market','off_market') AND COALESCE(signed_2027,false) = false),
    'managers', COALESCE((SELECT jsonb_agg(m ORDER BY (m->>'calls_week')::int DESC) FROM (
        SELECT jsonb_build_object(
          'user_id', p.user_id, 'name', p.full_name,
          'calls_week', (SELECT COUNT(*) FROM public.lead_activities a
                          WHERE a.actor_id = p.user_id AND a.kind = 'call'
                            AND a.created_at >= date_trunc('week', now())),
          'callbacks_due', (SELECT COUNT(*) FROM public.people_leads l
                          WHERE l.designated_to = p.user_id AND l.stage = 'callback'
                            AND l.next_call_at IS NOT NULL AND l.next_call_at <= now()),
          'signed', (SELECT COUNT(*) FROM public.people_leads l
                          WHERE l.designated_to = p.user_id AND l.stage = 'signed'),
          'designated', (SELECT COUNT(*) FROM public.people_leads l WHERE l.designated_to = p.user_id)
        ) AS m
        FROM public.profiles p
        WHERE p.approved AND NOT p.archived
          AND EXISTS (SELECT 1 FROM public.people_leads l WHERE l.designated_to = p.user_id)
      ) q), '[]'::jsonb),
    'tags', COALESCE((SELECT jsonb_object_agg(t, c) FROM (
        SELECT t, COUNT(*) c FROM public.people_leads, unnest(tags) t GROUP BY t) x), '{}'::jsonb)
  ) INTO _out;
  RETURN _out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_off_season_report() TO authenticated;

-- ---------- 6. Profile loses access -> ensure a lead row ----------

CREATE OR REPLACE FUNCTION public.ensure_lead_on_access_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _mgr uuid;
BEGIN
  IF (NEW.archived AND NOT COALESCE(OLD.archived,false))
     OR (COALESCE(OLD.approved,false) AND NOT COALESCE(NEW.approved,false)) THEN
    SELECT user_id INTO _mgr FROM public.profiles
     WHERE full_name = NEW.direct_manager AND approved AND NOT archived LIMIT 1;

    INSERT INTO public.people_leads (profile_id, full_name, email, phone, source, roster_status,
                                     designated_to, designation_status, former_manager_name)
    VALUES (NEW.id, NEW.full_name, NEW.email, NEW.phone, 'roster', 'not_on_roster',
            _mgr, CASE WHEN _mgr IS NULL THEN 'free' ELSE 'designated' END, NEW.direct_manager)
    ON CONFLICT (profile_id) DO UPDATE
      SET designated_to = COALESCE(public.people_leads.designated_to, EXCLUDED.designated_to),
          designation_status = CASE
            WHEN public.people_leads.designated_to IS NOT NULL THEN public.people_leads.designation_status
            WHEN EXCLUDED.designated_to IS NOT NULL THEN 'designated'
            ELSE 'free' END,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_lead_on_access_loss ON public.profiles;
CREATE TRIGGER trg_ensure_lead_on_access_loss
AFTER UPDATE OF approved, archived ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_lead_on_access_loss();

-- ---------- 7. CSV import: preview + commit ----------

CREATE OR REPLACE FUNCTION public.leads_import_preview(_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb; _name text; _lead_id uuid; _match text; _score numeric; _out jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _name := btrim(COALESCE(_r->>'full_name',''));
    CONTINUE WHEN _name = '';
    _lead_id := NULL; _match := 'new'; _score := NULL;

    SELECT id INTO _lead_id FROM public.people_leads WHERE lower(full_name) = lower(_name) LIMIT 1;
    IF _lead_id IS NOT NULL THEN _match := 'exact'; _score := 1;
    ELSE
      SELECT id INTO _lead_id FROM public.people_leads
       WHERE lower(split_part(full_name,' ',1)) = lower(split_part(_name,' ',1))
         AND lower(regexp_replace(full_name,'^.* ','')) = lower(regexp_replace(_name,'^.* ',''))
       LIMIT 1;
      IF _lead_id IS NOT NULL THEN _match := 'first_last'; _score := 0.9;
      ELSE
        SELECT id, similarity(lower(full_name), lower(_name)) INTO _lead_id, _score
          FROM public.people_leads
         WHERE similarity(lower(full_name), lower(_name)) >= 0.6
         ORDER BY similarity(lower(full_name), lower(_name)) DESC LIMIT 1;
        IF _lead_id IS NOT NULL THEN _match := 'fuzzy'; END IF;
      END IF;
    END IF;

    _out := _out || jsonb_build_object(
      'row', _r, 'full_name', _name, 'match', _match, 'score', _score,
      'lead_id', _lead_id,
      'existing_name', (SELECT full_name FROM public.people_leads WHERE id = _lead_id)
    );
  END LOOP;
  RETURN _out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.leads_import_preview(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.leads_import_commit(_decisions jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d jsonb; _row jsonb; _lead_id uuid; _created int := 0; _updated int := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  FOR _d IN SELECT * FROM jsonb_array_elements(_decisions) LOOP
    IF COALESCE(_d->>'action','skip') = 'skip' THEN CONTINUE; END IF;
    _row := _d->'row';
    IF _d->>'action' = 'update' AND (_d->>'lead_id') IS NOT NULL THEN
      _lead_id := (_d->>'lead_id')::uuid;
      UPDATE public.people_leads SET
        phone = COALESCE(NULLIF(_row->>'phone',''), phone),
        email = COALESCE(NULLIF(_row->>'email',''), email),
        former_manager_name = COALESCE(NULLIF(_row->>'former_manager_name',''), former_manager_name),
        recruiter_name = COALESCE(NULLIF(_row->>'recruiter_name',''), recruiter_name),
        team_name = COALESCE(NULLIF(_row->>'team_name',''), team_name),
        season_revenue = COALESCE((NULLIF(_row->>'season_revenue',''))::numeric, season_revenue),
        sheet_row = COALESCE(_row, sheet_row),
        updated_at = now()
      WHERE id = _lead_id;
      _updated := _updated + 1;
    ELSE
      INSERT INTO public.people_leads (full_name, phone, email, source, system, roster_status,
        former_manager_name, recruiter_name, team_name, season_revenue, sheet_row)
      VALUES (btrim(_row->>'full_name'), NULLIF(_row->>'phone',''), NULLIF(_row->>'email',''),
              COALESCE(NULLIF(_row->>'source',''),'manual'), NULLIF(_row->>'system',''),
              COALESCE(NULLIF(_row->>'roster_status',''),'unknown'),
              NULLIF(_row->>'former_manager_name',''), NULLIF(_row->>'recruiter_name',''),
              NULLIF(_row->>'team_name',''), (NULLIF(_row->>'season_revenue',''))::numeric, _row);
      _created := _created + 1;
    END IF;
  END LOOP;
  PERFORM public.write_audit('leads_import','people_leads','bulk','CSV import','rows',NULL,
                             (_created + _updated)::text);
  RETURN jsonb_build_object('created', _created, 'updated', _updated);
END;
$$;
GRANT EXECUTE ON FUNCTION public.leads_import_commit(jsonb) TO authenticated;