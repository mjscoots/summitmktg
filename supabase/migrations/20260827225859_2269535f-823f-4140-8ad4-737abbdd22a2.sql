DROP FUNCTION IF EXISTS public.leads_list(text, text, text, text, text, uuid, text, boolean, boolean, numeric, numeric, integer);

CREATE OR REPLACE FUNCTION public.lead_system_for(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mode() WITHIN GROUP (ORDER BY l.system)
  FROM public.people_leads l
  WHERE l.system IS NOT NULL
    AND (l.designated_to = _uid
         OR l.former_manager_name = (SELECT p.full_name FROM public.profiles p WHERE p.user_id = _uid))
$$;

CREATE OR REPLACE FUNCTION public.leads_list(_scope text DEFAULT 'mine'::text, _search text DEFAULT NULL::text, _system text DEFAULT NULL::text, _roster_status text DEFAULT NULL::text, _stage text DEFAULT NULL::text, _designated_to uuid DEFAULT NULL::uuid, _tag text DEFAULT NULL::text, _has_phone boolean DEFAULT NULL::boolean, _signed boolean DEFAULT NULL::boolean, _rev_min numeric DEFAULT NULL::numeric, _rev_max numeric DEFAULT NULL::numeric, _limit integer DEFAULT 200, _designation text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, profile_id uuid, full_name text, phone text, email text, system text, roster_status text, season_revenue numeric, rev_per_day numeric, start_date date, days_in_market integer, committed_last_day date, signed_2027 boolean, rep_year text, recruiter_name text, former_manager_name text, team_name text, role_title text, tags text[], notes text, stage text, designation_status text, designated_to uuid, designated_to_name text, designated_has_access boolean, next_call_at timestamp with time zone, last_contact_at timestamp with time zone, call_count integer, do_not_call boolean, last_outcome text, on_roster boolean, designated_at timestamp with time zone, cycle_days integer, hold boolean, cycles_in_days integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tier text := public.user_tier(auth.uid());
  _my_system text;
BEGIN
  -- Reps only ever see leads designated to them: no pool, no all.
  IF _tier = 'sales' AND _scope <> 'mine' THEN RETURN; END IF;
  IF _scope = 'all' AND _tier NOT IN ('admin','owner') THEN RETURN; END IF;

  -- Managers browse only their own system's pool. Staff see everything.
  IF _scope = 'free' AND _tier = 'manager' THEN
    _my_system := public.lead_system_for(auth.uid());
  END IF;

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
         COALESCE(rp.approved AND NOT rp.archived, false) AS on_roster,
         l.designated_at, l.cycle_days, l.hold,
         CASE
           WHEN l.designated_to IS NULL OR l.hold OR l.designated_at IS NULL THEN NULL
           ELSE GREATEST(
             CEIL(EXTRACT(EPOCH FROM (l.designated_at + make_interval(days => GREATEST(l.cycle_days,1)) - now())) / 86400)::int,
             0)
         END AS cycles_in_days
  FROM public.people_leads l
  LEFT JOIN public.profiles dp ON dp.user_id = l.designated_to
  LEFT JOIN public.profiles rp ON rp.id = l.profile_id
  WHERE l.bucket = 'lead'
    AND CASE _scope
      WHEN 'mine' THEN (l.designated_to = auth.uid() OR l.claimed_by = auth.uid())
        AND l.stage NOT IN ('excluded','dead') AND NOT l.do_not_call
      WHEN 'free' THEN l.designation_status = 'free'
        AND l.stage NOT IN ('excluded','dead') AND NOT l.do_not_call
        AND (_my_system IS NULL OR l.system IS NULL OR l.system = _my_system)
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
  ORDER BY
    CASE WHEN _scope = 'mine' THEN 0 ELSE 1 END,
    CASE WHEN _scope = 'mine'
      THEN COALESCE(l.designated_at + make_interval(days => GREATEST(l.cycle_days,1)), 'infinity'::timestamptz)
      ELSE 'infinity'::timestamptz END,
    COALESCE(l.season_revenue,0) DESC, COALESCE(l.signed_2027,false) ASC, l.full_name
  LIMIT GREATEST(COALESCE(_limit,200), 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.lead_detail(_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads; _out jsonb;
BEGIN
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _l.bucket <> 'lead' THEN RAISE EXCEPTION 'Not permitted'; END IF;

  IF _tier = 'sales' AND NOT (_l.designated_to = auth.uid() OR _l.claimed_by = auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
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
    'private_notes', CASE WHEN _tier IN ('manager','admin','owner') THEN
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'body', n.body,
                    'created_at', n.created_at,
                    'author_name', (SELECT full_name FROM public.profiles WHERE user_id = n.author_id))
                  ORDER BY n.created_at DESC)
                  FROM public.lead_private_notes n WHERE n.lead_id = _lead), '[]'::jsonb)
      ELSE NULL END
  );
  RETURN _out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.leads_counts()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'president')
    THEN jsonb_build_object(
      'out', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND roster_status = 'out'),
      'pool', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND designated_to IS NULL),
      'designated', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND designated_to IS NOT NULL),
      'signed_2027', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND signed_2027)
    )
    ELSE jsonb_build_object('out', 0, 'pool', 0, 'designated', 0, 'signed_2027', 0)
  END
$function$;