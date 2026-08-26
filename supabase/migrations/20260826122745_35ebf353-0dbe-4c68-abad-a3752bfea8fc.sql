ALTER TABLE public.people_leads
  ADD COLUMN IF NOT EXISTS designated_at timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_days int NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS hold boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS people_leads_cycle_idx
  ON public.people_leads (designated_to, designated_at)
  WHERE bucket = 'lead' AND hold = false;

-- Small settings reader
CREATE OR REPLACE FUNCTION public.setting_text(_key text, _default text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(btrim(s.value), ''), _default)
  FROM (SELECT _default AS d) x
  LEFT JOIN public.app_settings s ON s.key = _key
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.setting_text(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.setting_text(text, text) TO authenticated, service_role;

-- Per-lead cycling controls (owner/admin only)
CREATE OR REPLACE FUNCTION public.lead_set_cycling(_lead uuid, _cycle_days int, _hold boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and the owner can change lead cycling';
  END IF;
  UPDATE public.people_leads
     SET cycle_days = GREATEST(LEAST(COALESCE(_cycle_days, 14), 365), 1),
         hold = COALESCE(_hold, false),
         updated_at = now()
   WHERE id = _lead;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_set_cycling(uuid, int, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.lead_set_cycling(uuid, int, boolean) TO authenticated, service_role;

-- Keep designated_at in step with designation changes
CREATE OR REPLACE FUNCTION public.people_leads_designation_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.designated_to IS DISTINCT FROM OLD.designated_to THEN
    NEW.designated_at := CASE WHEN NEW.designated_to IS NULL THEN NULL ELSE now() END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_leads_designation_stamp_trg ON public.people_leads;
CREATE TRIGGER people_leads_designation_stamp_trg
  BEFORE UPDATE ON public.people_leads
  FOR EACH ROW EXECUTE FUNCTION public.people_leads_designation_stamp();

-- The cycling routine
CREATE OR REPLACE FUNCTION public.cycle_stale_people_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _enabled boolean;
  _max_open int;
  _mgrs uuid[];
  _cursor uuid;
  _start int := 0;
  _lead record;
  _from_name text;
  _to_name text;
  _to uuid;
  _open int;
  _i int;
  _n int;
  _days int;
  _moved int := 0;
  _skipped int := 0;
BEGIN
  IF _uid IS NOT NULL AND NOT (public.has_role(_uid, 'owner'::app_role) OR public.has_role(_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only the owner or an admin can run lead cycling';
  END IF;

  _enabled := public.setting_text('leads_cycling_enabled', 'true') = 'true';
  IF NOT _enabled THEN
    RETURN jsonb_build_object('enabled', false, 'moved', 0, 'skipped', 0);
  END IF;

  _max_open := GREATEST(COALESCE(NULLIF(public.setting_text('leads_max_open_per_manager', '25'), '')::int, 25), 1);

  SELECT array_agg(p.user_id ORDER BY p.full_name)
    INTO _mgrs
    FROM public.profiles p
   WHERE p.user_id IS NOT NULL
     AND COALESCE(p.approved, false)
     AND NOT COALESCE(p.archived, false)
     AND (public.has_role(p.user_id, 'manager'::app_role)
          OR public.has_role(p.user_id, 'president'::app_role)
          OR public.has_role(p.user_id, 'admin'::app_role)
          OR public.has_role(p.user_id, 'owner'::app_role));

  _n := COALESCE(array_length(_mgrs, 1), 0);
  IF _n < 2 THEN
    RETURN jsonb_build_object('enabled', true, 'moved', 0, 'skipped', 0, 'note', 'fewer than two managers with access');
  END IF;

  BEGIN
    _cursor := NULLIF(public.setting_text('leads_cycle_cursor', ''), '')::uuid;
  EXCEPTION WHEN others THEN _cursor := NULL;
  END;

  IF _cursor IS NOT NULL THEN
    SELECT i INTO _start FROM generate_subscripts(_mgrs, 1) i WHERE _mgrs[i] = _cursor;
    _start := COALESCE(_start, 0);
  END IF;

  FOR _lead IN
    SELECT l.id, l.full_name, l.designated_to, l.designated_at, l.cycle_days
      FROM public.people_leads l
     WHERE l.bucket = 'lead'
       AND l.designated_to IS NOT NULL
       AND l.hold = false
       AND l.designated_at IS NOT NULL
       AND l.designated_at + make_interval(days => GREATEST(l.cycle_days, 1)) < now()
       AND NOT EXISTS (
             SELECT 1 FROM public.lead_activities a
              WHERE a.lead_id = l.id
                AND a.created_at >= l.designated_at + make_interval(days => GREATEST(l.cycle_days, 1))
           )
     ORDER BY l.designated_at
  LOOP
    _to := NULL;
    FOR _i IN 1.._n LOOP
      _start := (_start % _n) + 1;
      IF _mgrs[_start] IS DISTINCT FROM _lead.designated_to THEN
        SELECT COUNT(*)::int INTO _open
          FROM public.people_leads x
         WHERE x.bucket = 'lead'
           AND x.designated_to = _mgrs[_start]
           AND x.stage NOT IN ('excluded', 'dead');
        IF _open < _max_open THEN
          _to := _mgrs[_start];
          EXIT;
        END IF;
      END IF;
    END LOOP;

    IF _to IS NULL THEN
      _skipped := _skipped + 1;
      CONTINUE;
    END IF;

    _days := GREATEST(FLOOR(EXTRACT(EPOCH FROM (now() - _lead.designated_at)) / 86400)::int, 0);
    SELECT full_name INTO _from_name FROM public.profiles WHERE user_id = _lead.designated_to;
    SELECT full_name INTO _to_name FROM public.profiles WHERE user_id = _to;

    UPDATE public.people_leads
       SET designated_to = _to,
           designation_status = 'designated',
           claimed_by = NULL,
           claimed_at = NULL,
           updated_at = now()
     WHERE id = _lead.id;

    INSERT INTO public.lead_activities (lead_id, actor_id, kind, body)
    VALUES (_lead.id, NULL, 'cycle',
            'Cycled from ' || COALESCE(_from_name, 'unknown') || ' to ' || COALESCE(_to_name, 'unknown')
            || ' after ' || _days || ' days without activity');

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (_lead.designated_to, 'Lead moved on',
            _lead.full_name || ' moved to ' || COALESCE(_to_name, 'another manager')
            || ' after ' || _days || ' days without activity.', '/app/leads'),
           (_to, 'New lead designated to you',
            _lead.full_name || ' moved to you from ' || COALESCE(_from_name, 'another manager')
            || ' after ' || _days || ' days without activity.', '/app/leads');

    _moved := _moved + 1;
  END LOOP;

  IF _n > 0 THEN
    INSERT INTO public.app_settings (key, value)
    VALUES ('leads_cycle_cursor', _mgrs[GREATEST(LEAST(_start, _n), 1)]::text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END IF;

  RETURN jsonb_build_object('enabled', true, 'moved', _moved, 'skipped', _skipped);
END;
$$;

REVOKE ALL ON FUNCTION public.cycle_stale_people_leads() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cycle_stale_people_leads() FROM anon;
GRANT EXECUTE ON FUNCTION public.cycle_stale_people_leads() TO authenticated, service_role;

-- Lead list now carries cycling fields
DROP FUNCTION IF EXISTS public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer,text);

CREATE FUNCTION public.leads_list(
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
  _limit integer DEFAULT 200,
  _designation text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, profile_id uuid, full_name text, phone text, email text,
  system text, roster_status text, season_revenue numeric, rev_per_day numeric,
  start_date date, days_in_market integer, committed_last_day date,
  signed_2027 boolean, rep_year text, recruiter_name text, former_manager_name text,
  team_name text, role_title text, tags text[], notes text,
  stage text, designation_status text, designated_to uuid,
  designated_to_name text, designated_has_access boolean,
  next_call_at timestamptz, last_contact_at timestamptz, call_count integer,
  do_not_call boolean, last_outcome text, on_roster boolean,
  designated_at timestamptz, cycle_days integer, hold boolean, cycles_in_days integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer,text) TO authenticated, service_role;