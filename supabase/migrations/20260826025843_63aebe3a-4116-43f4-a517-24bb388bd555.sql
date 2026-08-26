-- A. leads are bucket='lead' only -------------------------------------------

CREATE OR REPLACE FUNCTION public.leads_list(
  _scope text DEFAULT 'mine', _search text DEFAULT NULL, _system text DEFAULT NULL,
  _roster_status text DEFAULT NULL, _stage text DEFAULT NULL, _designated_to uuid DEFAULT NULL,
  _tag text DEFAULT NULL, _has_phone boolean DEFAULT NULL, _signed boolean DEFAULT NULL,
  _rev_min numeric DEFAULT NULL, _rev_max numeric DEFAULT NULL, _limit integer DEFAULT 200,
  _designation text DEFAULT NULL)
RETURNS TABLE(id uuid, profile_id uuid, full_name text, phone text, email text, system text,
  roster_status text, season_revenue numeric, rev_per_day numeric, start_date date,
  days_in_market integer, committed_last_day date, signed_2027 boolean, rep_year text,
  recruiter_name text, former_manager_name text, team_name text, role_title text, tags text[],
  notes text, stage text, designation_status text, designated_to uuid, designated_to_name text,
  designated_has_access boolean, next_call_at timestamp with time zone,
  last_contact_at timestamp with time zone, call_count integer, do_not_call boolean,
  last_outcome text, on_roster boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  WHERE l.bucket = 'lead'
    AND CASE _scope
      WHEN 'mine' THEN (l.designated_to = auth.uid() OR l.claimed_by = auth.uid())
        AND l.stage NOT IN ('excluded','dead') AND NOT l.do_not_call
      WHEN 'free' THEN l.designation_status = 'free'
        AND l.stage NOT IN ('excluded','dead') AND NOT l.do_not_call
      ELSE true
    END
    AND (_designation IS NULL
         OR (_designation = 'free' AND l.designation_status = 'free')
         OR (_designation = 'designated' AND l.designation_status IN ('designated','claimed')))
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
  ORDER BY (CASE WHEN 'not-on-2026-roster' = ANY(COALESCE(l.tags,'{}'::text[])) THEN 1 ELSE 0 END),
           l.full_name
  LIMIT GREATEST(COALESCE(_limit,200), 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.leads_callbacks_due()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN public.user_tier(auth.uid()) = 'sales' THEN 0 ELSE (
    SELECT COUNT(*)::int FROM public.people_leads l
    WHERE l.bucket = 'lead'
      AND (l.designated_to = auth.uid() OR l.claimed_by = auth.uid())
      AND l.stage = 'callback' AND NOT l.do_not_call
      AND l.next_call_at IS NOT NULL AND l.next_call_at <= now()
  ) END;
$function$;

CREATE OR REPLACE FUNCTION public.lead_claim(_lead uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _tier text := public.user_tier(auth.uid()); _status text; _bucket text;
BEGIN
  IF _tier NOT IN ('manager','admin','owner') THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT designation_status, bucket INTO _status, _bucket FROM public.people_leads WHERE id = _lead;
  IF _status IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _bucket <> 'lead' THEN RAISE EXCEPTION 'This person is on the roster, not a lead'; END IF;
  IF _status <> 'free' AND _tier = 'manager' THEN RAISE EXCEPTION 'This lead is already designated'; END IF;
  UPDATE public.people_leads
     SET designated_to = auth.uid(), designation_status = 'claimed',
         claimed_by = auth.uid(), claimed_at = now(), updated_at = now()
   WHERE id = _lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, kind, body)
  VALUES (_lead, auth.uid(), 'designation', 'Claimed');
END;
$function$;

-- bulk designation for owner/admin
CREATE OR REPLACE FUNCTION public.leads_designate_bulk(_leads uuid[], _to uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _name text; _n int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only admins and the owner can reassign leads'; END IF;
  SELECT full_name INTO _name FROM public.profiles WHERE user_id = _to;
  IF _to IS NULL THEN
    UPDATE public.people_leads
       SET designated_to = NULL, designation_status = 'free', claimed_by = NULL, claimed_at = NULL,
           freed_by = auth.uid(), freed_at = now(), updated_at = now()
     WHERE id = ANY(_leads) AND bucket = 'lead';
  ELSE
    UPDATE public.people_leads
       SET designated_to = _to, designation_status = 'designated',
           claimed_by = NULL, claimed_at = NULL, updated_at = now()
     WHERE id = ANY(_leads) AND bucket = 'lead';
  END IF;
  GET DIAGNOSTICS _n = ROW_COUNT;
  INSERT INTO public.lead_activities (lead_id, actor_id, kind, body)
  SELECT l.id, auth.uid(), 'designation',
         CASE WHEN _to IS NULL THEN 'Marked free' ELSE 'Designated to ' || COALESCE(_name,'unknown') END
  FROM public.people_leads l WHERE l.id = ANY(_leads) AND l.bucket = 'lead';
  RETURN _n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_off_season_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _out jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT jsonb_build_object(
    'totals', (SELECT jsonb_build_object(
        'leads', COUNT(*),
        'with_phone', COUNT(*) FILTER (WHERE phone IS NOT NULL),
        'designated', COUNT(*) FILTER (WHERE designation_status IN ('designated','claimed')),
        'free', COUNT(*) FILTER (WHERE designation_status = 'free'))
      FROM public.people_leads WHERE bucket = 'lead'),
    'funnel', COALESCE((SELECT jsonb_agg(jsonb_build_object('stage', s.stage, 'people', s.people, 'revenue', s.revenue)
                          ORDER BY s.ord)
        FROM (SELECT stage, COUNT(*) AS people, COALESCE(SUM(season_revenue),0) AS revenue,
                     CASE stage WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'callback' THEN 3
                                WHEN 'interested' THEN 4 WHEN 'signed' THEN 5 ELSE 6 END AS ord
              FROM public.people_leads
              WHERE bucket = 'lead' AND stage IN ('new','contacted','callback','interested','signed')
              GROUP BY stage) s), '[]'::jsonb),
    'not_signed', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'full_name', full_name, 'season_revenue', season_revenue,
          'former_manager_name', former_manager_name, 'roster_status', roster_status,
          'phone', phone, 'stage', stage) ORDER BY COALESCE(season_revenue,0) DESC)
        FROM public.people_leads
        WHERE bucket = 'lead' AND COALESCE(signed_2027,false) = false
          AND COALESCE(season_revenue,0) > 0), '[]'::jsonb),
    'not_signed_revenue', (SELECT COALESCE(SUM(season_revenue),0) FROM public.people_leads
        WHERE bucket = 'lead' AND COALESCE(signed_2027,false) = false),
    'managers', COALESCE((SELECT jsonb_agg(m ORDER BY (m->>'calls_week')::int DESC) FROM (
        SELECT jsonb_build_object(
          'user_id', p.user_id, 'name', p.full_name,
          'calls_week', (SELECT COUNT(*) FROM public.lead_activities a
                          WHERE a.actor_id = p.user_id AND a.kind = 'call'
                            AND a.created_at >= date_trunc('week', now())),
          'callbacks_due', (SELECT COUNT(*) FROM public.people_leads l
                          WHERE l.bucket = 'lead' AND l.designated_to = p.user_id AND l.stage = 'callback'
                            AND l.next_call_at IS NOT NULL AND l.next_call_at <= now()),
          'signed', (SELECT COUNT(*) FROM public.people_leads l
                          WHERE l.bucket = 'lead' AND l.designated_to = p.user_id AND l.stage = 'signed'),
          'designated', (SELECT COUNT(*) FROM public.people_leads l
                          WHERE l.bucket = 'lead' AND l.designated_to = p.user_id)
        ) AS m
        FROM public.profiles p
        WHERE p.approved AND NOT p.archived
          AND EXISTS (SELECT 1 FROM public.people_leads l WHERE l.bucket = 'lead' AND l.designated_to = p.user_id)
      ) q), '[]'::jsonb),
    'tags', COALESCE((SELECT jsonb_object_agg(t, c) FROM (
        SELECT t, COUNT(*) c FROM public.people_leads, unnest(tags) t
        WHERE bucket = 'lead' GROUP BY t) x), '{}'::jsonb)
  ) INTO _out;
  RETURN _out;
END;
$function$;

-- lead rows open only on departure ------------------------------------------
DROP TRIGGER IF EXISTS trg_ensure_lead_on_access_loss ON public.profiles;

CREATE OR REPLACE FUNCTION public.open_lead_on_departure(_user_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _p record; _mgr uuid; _mgr_name text;
BEGIN
  SELECT * INTO _p FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;

  _mgr := _p.manager_id;
  IF _mgr IS NULL THEN _mgr := public.resolve_person_by_name(_p.direct_manager); END IF;
  SELECT full_name INTO _mgr_name FROM public.profiles WHERE user_id = _mgr;

  INSERT INTO public.people_leads (profile_id, full_name, email, phone, source, roster_status,
                                   bucket, designated_to, designation_status, former_manager_name, notes)
  VALUES (_p.id, _p.full_name, _p.email, _p.phone, 'roster', 'not_on_roster',
          'lead', _mgr, CASE WHEN _mgr IS NULL THEN 'free' ELSE 'designated' END,
          coalesce(_mgr_name, _p.direct_manager), _reason)
  ON CONFLICT (profile_id) DO UPDATE
    SET bucket = 'lead',
        designated_to = COALESCE(public.people_leads.designated_to, EXCLUDED.designated_to),
        designation_status = CASE
          WHEN public.people_leads.designated_to IS NOT NULL THEN public.people_leads.designation_status
          WHEN EXCLUDED.designated_to IS NOT NULL THEN 'designated'
          ELSE 'free' END,
        stage = CASE WHEN public.people_leads.stage IN ('excluded','dead') THEN 'new'
                     ELSE public.people_leads.stage END,
        roster_status = 'not_on_roster',
        updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_lead_on_access_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Access loss no longer creates leads. Lead rows open only when a person's
  -- lifecycle becomes departed (see open_lead_on_departure).
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_person_lifecycle(_user_id uuid, _vertical text, _new_status text, _reason text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _v text := coalesce(_vertical, 'Pest');
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
          OR public.is_president_of(auth.uid(), _v)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _new_status NOT IN ('applied','approved','onboarding','active','paused','departed','archived') THEN
    RAISE EXCEPTION 'unknown lifecycle status: %', _new_status;
  END IF;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, applied_at, approved_at)
  VALUES (_user_id, _v,
          CASE WHEN _new_status IN ('departed','archived') THEN 'paused' ELSE _new_status END,
          CASE WHEN _new_status = 'active' THEN now() ELSE NULL END,
          CASE WHEN _new_status = 'applied' THEN now() ELSE NULL END,
          CASE WHEN _new_status IN ('approved','active','onboarding') THEN now() ELSE NULL END)
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = CASE WHEN _new_status IN ('departed','archived') THEN 'paused' ELSE _new_status END,
        activated_at = CASE WHEN _new_status = 'active' THEN coalesce(public.rep_vertical_enrollments.activated_at, now())
                            ELSE public.rep_vertical_enrollments.activated_at END,
        approved_at = CASE WHEN _new_status IN ('approved','active','onboarding')
                            THEN coalesce(public.rep_vertical_enrollments.approved_at, now())
                            ELSE public.rep_vertical_enrollments.approved_at END,
        updated_at = now();

  UPDATE public.profiles p SET
    approved = (_new_status IN ('approved','onboarding','active')),
    archived = (_new_status = 'archived'),
    archived_at = CASE WHEN _new_status = 'archived' THEN coalesce(p.archived_at, now()) ELSE NULL END,
    archived_reason = CASE WHEN _new_status = 'archived' THEN coalesce(_reason, p.archived_reason) ELSE p.archived_reason END,
    onboarding_status = CASE
      WHEN _new_status = 'onboarding' THEN 'in_progress'
      WHEN _new_status = 'active' THEN 'complete'
      ELSE 'pending' END,
    status = CASE
      WHEN _new_status = 'active' THEN 'active'::user_status
      WHEN _new_status = 'onboarding' THEN 'onboarded'::user_status
      WHEN _new_status = 'approved' THEN 'contract_signed'::user_status
      WHEN _new_status = 'applied' THEN 'pending'::user_status
      WHEN _new_status IN ('departed','archived') THEN 'nlc'::user_status
      ELSE p.status END,
    status_detail = coalesce(_reason, p.status_detail),
    updated_at = now()
  WHERE p.user_id = _user_id;

  IF _new_status = 'departed' THEN
    PERFORM public.open_lead_on_departure(_user_id, _reason);
  END IF;
END;
$function$;

-- B. approvers who cannot approve -------------------------------------------

CREATE OR REPLACE FUNCTION public.vertical_approver_state(_vertical text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _v record; _out jsonb := '[]'::jsonb; _aid uuid; _has boolean; _name text;
BEGIN
  SELECT * INTO _v FROM public.verticals WHERE vertical = _vertical;
  IF NOT FOUND THEN RETURN _out; END IF;

  FOREACH _aid IN ARRAY COALESCE(_v.required_approver_ids, '{}'::uuid[]) LOOP
    IF _aid IS NULL THEN CONTINUE; END IF;
    SELECT full_name, (approved AND NOT archived) INTO _name, _has
      FROM public.profiles WHERE user_id = _aid;
    _out := _out || jsonb_build_object(
      'user_id', _aid, 'name', COALESCE(_name, 'Unknown'),
      'state', CASE WHEN COALESCE(_has,false) THEN 'required' ELSE 'skipped_no_access' END);
  END LOOP;

  IF _v.president_user_id IS NULL THEN
    _out := _out || jsonb_build_object('user_id', NULL, 'name', _v.name || ' president',
                                       'state', 'unset');
  END IF;
  RETURN _out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vertical_effective_approvers(_vertical text)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(aid), '{}'::uuid[])
  FROM (
    SELECT aid FROM public.verticals v,
      unnest(COALESCE(v.required_approver_ids,'{}'::uuid[])) AS aid
    WHERE v.vertical = _vertical AND aid IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profiles p
                   WHERE p.user_id = aid AND p.approved AND NOT p.archived)
  ) s;
$function$;

CREATE OR REPLACE FUNCTION public.decide_vertical_application(_application_id uuid, _decision text, _note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _a record; _v record; _actor text; _applicant text;
  _eff uuid[]; _needed int; _got int; _is_owner boolean; _alone boolean := false;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  IF _decision NOT IN ('approved','rejected') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid decision'); END IF;

  SELECT * INTO _a FROM public.vertical_applications WHERE id = _application_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Application not found'); END IF;
  IF _a.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Already decided'); END IF;

  SELECT * INTO _v FROM public.verticals WHERE vertical = _a.vertical;
  _is_owner := public.has_role(_uid, 'owner'::app_role);
  _eff := public.vertical_effective_approvers(_a.vertical);

  IF NOT (_uid = ANY (_eff) OR _is_owner) THEN
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

  _needed := COALESCE(array_length(_eff, 1), 0);
  SELECT count(*) INTO _got FROM public.vertical_application_approvals
   WHERE application_id = _application_id AND decision = 'approved'
     AND approver_user_id = ANY (_eff);

  -- owner fallback: the owner can complete an approval alone, and the reason is logged
  IF _is_owner AND _got < _needed THEN
    _alone := true;
    INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, after_value)
    VALUES (_uid, _actor, 'vertical_application_owner_override', 'vertical_application',
            _application_id::text, _v.name || ' - ' || _applicant,
            COALESCE(_note, 'Owner approved without the other required approvers'));
  END IF;

  INSERT INTO public.user_notifications (user_id, title, message, link)
  VALUES (_a.user_id, _v.name || ' application update',
          _actor || ' approved your ' || _v.name || ' application.', '/app/industries');

  IF _alone OR (_needed > 0 AND _got >= _needed) THEN
    UPDATE public.vertical_applications SET status = 'approved', updated_at = now() WHERE id = _application_id;
    UPDATE public.rep_vertical_enrollments
      SET status = 'approved', approved_at = now(), rejected_at = null, reject_reason = null, updated_at = now()
      WHERE user_id = _a.user_id AND vertical = _a.vertical;
    PERFORM public.recalc_vertical_enrollment(_a.user_id, _a.vertical);
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_a.user_id, _v.name || ' is open',
            'You have access to ' || _v.name || '. Switch workspace to get started.', '/app/industries?switch=' || _v.vertical);
    RETURN jsonb_build_object('success', true, 'status', 'approved', 'owner_alone', _alone);
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'pending', 'approvals', _got, 'needed', _needed);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_vertical_applications(_status text DEFAULT 'pending'::text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
          'user_id', s->>'user_id',
          'name', s->>'name',
          'state', s->>'state',
          'decision', (SELECT va.decision FROM public.vertical_application_approvals va
                        WHERE va.application_id = a.id
                          AND va.approver_user_id = (s->>'user_id')::uuid),
          'note', (SELECT va.note FROM public.vertical_application_approvals va
                        WHERE va.application_id = a.id
                          AND va.approver_user_id = (s->>'user_id')::uuid)
        ))
        FROM jsonb_array_elements(public.vertical_approver_state(a.vertical)) s
      ), '[]'::jsonb),
      'my_decision', (SELECT va.decision FROM public.vertical_application_approvals va
                       WHERE va.application_id = a.id AND va.approver_user_id = _uid),
      'i_am_approver', (_uid = ANY (public.vertical_effective_approvers(a.vertical))
                        OR public.has_role(_uid,'owner'::app_role)),
      'owner_can_finish', (public.has_role(_uid,'owner'::app_role))
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
$function$;

CREATE OR REPLACE FUNCTION public.get_applications_awaiting_me()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::int
  FROM public.vertical_applications a
  WHERE a.status = 'pending'
    AND auth.uid() = ANY (public.vertical_effective_approvers(a.vertical))
    AND NOT EXISTS (
      SELECT 1 FROM public.vertical_application_approvals va
      WHERE va.application_id = a.id AND va.approver_user_id = auth.uid()
    )
$function$;
