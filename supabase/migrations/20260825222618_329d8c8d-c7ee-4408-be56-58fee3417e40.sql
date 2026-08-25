-- 1. Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS showed_up_date date,
  ADD COLUMN IF NOT EXISTS last_sweep_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sweep_by uuid;

-- keep new roster fields staff-only
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
  NEW.showed_up_date := OLD.showed_up_date;
  NEW.last_sweep_at := OLD.last_sweep_at;
  NEW.last_sweep_by := OLD.last_sweep_by;
  RETURN NEW;
END;
$function$;

-- 2. Sweep session log
CREATE TABLE IF NOT EXISTS public.sweep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_action_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.sweep_sessions TO authenticated;
GRANT ALL ON public.sweep_sessions TO service_role;

ALTER TABLE public.sweep_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sweep_sessions_own_read" ON public.sweep_sessions;
CREATE POLICY "sweep_sessions_own_read" ON public.sweep_sessions
FOR SELECT TO authenticated
USING (actor_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

DROP POLICY IF EXISTS "sweep_sessions_own_write" ON public.sweep_sessions;
CREATE POLICY "sweep_sessions_own_write" ON public.sweep_sessions
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS "sweep_sessions_own_update" ON public.sweep_sessions;
CREATE POLICY "sweep_sessions_own_update" ON public.sweep_sessions
FOR UPDATE TO authenticated
USING (actor_id = auth.uid())
WITH CHECK (actor_id = auth.uid());

DROP TRIGGER IF EXISTS sweep_sessions_updated_at ON public.sweep_sessions;
CREATE TRIGGER sweep_sessions_updated_at BEFORE UPDATE ON public.sweep_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Permission helper
CREATE OR REPLACE FUNCTION public.can_sweep_person(_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _my_name text;
  _their_mgr text;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF public.has_role(_uid,'admin') OR public.has_role(_uid,'owner') THEN RETURN true; END IF;
  IF NOT public.has_role(_uid,'manager') THEN RETURN false; END IF;
  IF public.is_in_my_downline(_target) THEN RETURN true; END IF;
  SELECT full_name INTO _my_name FROM profiles WHERE user_id = _uid;
  SELECT direct_manager INTO _their_mgr FROM profiles WHERE user_id = _target;
  RETURN _my_name IS NOT NULL AND _their_mgr IS NOT NULL
     AND lower(btrim(_my_name)) = lower(btrim(_their_mgr));
END;
$$;

REVOKE ALL ON FUNCTION public.can_sweep_person(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_sweep_person(uuid) TO authenticated, service_role;

-- 4. Sweep queue
CREATE OR REPLACE FUNCTION public.get_sweep_queue(
  _office_id uuid DEFAULT NULL,
  _leader uuid DEFAULT NULL,
  _gap text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _is_mgr boolean;
  _my_name text;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  _staff := public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');
  _is_mgr := public.has_role(_uid,'manager');
  IF NOT (_staff OR _is_mgr) THEN RETURN jsonb_build_object('error','Managers only'); END IF;

  SELECT full_name INTO _my_name FROM profiles WHERE user_id = _uid;

  WITH scoped AS (
    SELECT p.*
    FROM profiles p
    WHERE COALESCE(p.alumni,false) = false
      AND p.user_id <> _uid
      AND (
        _staff
        OR public.is_in_my_downline(p.user_id)
        OR (_my_name IS NOT NULL AND lower(btrim(COALESCE(p.direct_manager,''))) = lower(btrim(_my_name)))
      )
      AND (_office_id IS NULL OR p.office_id = _office_id)
      AND (_leader IS NULL OR p.user_id IN (
            SELECT d.user_id FROM public.get_downline_from_edges(_leader) d
          ))
  ),
  flagged AS (
    SELECT s.*,
      (s.archived IS TRUE AND NULLIF(btrim(COALESCE(s.departure_reason,'')),'') IS NULL) AS gap_reason,
      (s.archived IS NOT TRUE AND s.committed_last_day IS NULL) AS gap_last_day,
      (s.archived IS NOT TRUE AND NULLIF(btrim(COALESCE(s.next_year_status,'')),'') IS NULL) AS gap_status
    FROM scoped s
  ),
  filtered AS (
    SELECT f.* FROM flagged f
    WHERE CASE COALESCE(_gap,'none')
      WHEN 'reason' THEN f.gap_reason
      WHEN 'last_day' THEN f.gap_last_day
      WHEN 'status' THEN f.gap_status
      WHEN 'any' THEN (f.gap_reason OR f.gap_last_day OR f.gap_status)
      ELSE true END
  ),
  rows AS (
    SELECT jsonb_build_object(
      'user_id', f.user_id,
      'full_name', f.full_name,
      'avatar_url', f.avatar_url,
      'office', COALESCE(o.name, NULLIF(btrim(f.office_name),'')),
      'office_id', f.office_id,
      'rank', r.name,
      'rep_year', f.rep_year,
      'manager', NULLIF(btrim(COALESCE(f.direct_manager,'')),''),
      'recruiter', COALESCE(NULLIF(btrim(COALESCE(f.recruited_by_name,'')),''), NULLIF(btrim(COALESCE(f.recruiter,'')),'')),
      'archived', COALESCE(f.archived,false),
      'departure_type', f.departure_type,
      'departure_reason', f.departure_reason,
      'last_day_worked', f.last_day_worked,
      'committed_last_day', f.committed_last_day,
      'next_year_status', f.next_year_status,
      'showed_up_date', f.showed_up_date,
      'last_sweep_at', f.last_sweep_at,
      'resolved', NOT (f.gap_reason OR f.gap_last_day OR f.gap_status),
      'latest_revenue_month', (
        SELECT to_char(rv.month,'YYYY-MM') FROM rep_revenue rv
        WHERE rv.user_id = f.user_id ORDER BY rv.month DESC LIMIT 1
      ),
      'latest_revenue', (
        SELECT rv.revenue FROM rep_revenue rv
        WHERE rv.user_id = f.user_id ORDER BY rv.month DESC LIMIT 1
      )
    ) AS j,
    (NOT (f.gap_reason OR f.gap_last_day OR f.gap_status)) AS resolved,
    f.full_name
    FROM filtered f
    LEFT JOIN offices o ON o.id = f.office_id
    LEFT JOIN ranks r ON r.id = f.rank_id
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM rows),
    'resolved', (SELECT count(*) FROM rows WHERE resolved),
    'people', (SELECT COALESCE(jsonb_agg(j ORDER BY resolved, full_name), '[]'::jsonb) FROM rows),
    'offices', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', o2.id, 'name', o2.name) ORDER BY o2.name), '[]'::jsonb) FROM offices o2)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sweep_queue(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sweep_queue(uuid, uuid, text) TO authenticated, service_role;

-- 5. Sweep writes
CREATE OR REPLACE FUNCTION public.sweep_mark_gone(
  _user_id uuid,
  _departure_type text DEFAULT 'unknown',
  _reason text DEFAULT NULL,
  _last_sale_date date DEFAULT NULL,
  _session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t text := COALESCE(NULLIF(btrim(_departure_type),''), 'unknown');
  _prev jsonb;
BEGIN
  IF NOT public.can_sweep_person(_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed for that person');
  END IF;
  IF _t NOT IN ('quit','fired','home_early','unknown') THEN _t := 'unknown'; END IF;

  SELECT jsonb_build_object(
    'user_id', user_id, 'archived', archived, 'archived_at', archived_at,
    'archived_reason', archived_reason, 'pre_archive_status', pre_archive_status,
    'departure_type', departure_type, 'departure_reason', departure_reason,
    'last_day_worked', last_day_worked, 'committed_last_day', committed_last_day,
    'next_year_status', next_year_status, 'showed_up_date', showed_up_date,
    'office_id', office_id
  ) INTO _prev FROM profiles WHERE user_id = _user_id;

  IF _prev IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Person not found');
  END IF;

  UPDATE profiles SET
    archived = true,
    archived_at = COALESCE(archived_at, now()),
    archived_reason = COALESCE(archived_reason, 'departed'),
    pre_archive_status = COALESCE(pre_archive_status, status),
    departure_type = _t,
    departure_reason = COALESCE(NULLIF(btrim(COALESCE(_reason,'')),''), departure_reason),
    last_day_worked = COALESCE(_last_sale_date, last_day_worked),
    last_sweep_at = now(),
    last_sweep_by = _uid,
    updated_at = now()
  WHERE user_id = _user_id;

  IF _session_id IS NOT NULL THEN
    UPDATE sweep_sessions
    SET resolved_count = resolved_count + 1, last_action_at = now()
    WHERE id = _session_id AND actor_id = _uid;
  END IF;

  RETURN jsonb_build_object('success', true, 'prev', _prev);
END;
$$;

CREATE OR REPLACE FUNCTION public.sweep_mark_here(
  _user_id uuid,
  _committed_last_day date DEFAULT NULL,
  _next_year_status text DEFAULT NULL,
  _office_id uuid DEFAULT NULL,
  _showed_up_date date DEFAULT NULL,
  _session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _prev jsonb;
BEGIN
  IF NOT public.can_sweep_person(_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed for that person');
  END IF;
  IF _next_year_status IS NOT NULL
     AND _next_year_status NOT IN ('Signed','Verbal','Undecided','Not returning','No answer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid next-season status');
  END IF;

  SELECT jsonb_build_object(
    'user_id', user_id, 'archived', archived, 'archived_at', archived_at,
    'archived_reason', archived_reason, 'pre_archive_status', pre_archive_status,
    'departure_type', departure_type, 'departure_reason', departure_reason,
    'last_day_worked', last_day_worked, 'committed_last_day', committed_last_day,
    'next_year_status', next_year_status, 'showed_up_date', showed_up_date,
    'office_id', office_id
  ) INTO _prev FROM profiles WHERE user_id = _user_id;

  IF _prev IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Person not found');
  END IF;

  UPDATE profiles SET
    archived = false,
    archived_at = NULL,
    archived_reason = NULL,
    departure_type = NULL,
    departure_reason = NULL,
    committed_last_day = COALESCE(_committed_last_day, committed_last_day),
    next_year_status = COALESCE(_next_year_status, next_year_status),
    next_year_status_at = CASE WHEN _next_year_status IS NULL THEN next_year_status_at ELSE now() END,
    next_year_updated_by = CASE WHEN _next_year_status IS NULL THEN next_year_updated_by ELSE _uid END,
    office_id = COALESCE(_office_id, office_id),
    showed_up_date = COALESCE(_showed_up_date, showed_up_date),
    last_sweep_at = now(),
    last_sweep_by = _uid,
    updated_at = now()
  WHERE user_id = _user_id;

  IF _session_id IS NOT NULL THEN
    UPDATE sweep_sessions
    SET resolved_count = resolved_count + 1, last_action_at = now()
    WHERE id = _session_id AND actor_id = _uid;
  END IF;

  RETURN jsonb_build_object('success', true, 'prev', _prev);
END;
$$;

CREATE OR REPLACE FUNCTION public.sweep_restore(_prev jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _target uuid := NULLIF(_prev->>'user_id','')::uuid;
BEGIN
  IF _target IS NULL THEN RETURN jsonb_build_object('success', false, 'error','Nothing to undo'); END IF;
  IF NOT public.can_sweep_person(_target) THEN
    RETURN jsonb_build_object('success', false, 'error','Not allowed for that person');
  END IF;

  UPDATE profiles SET
    archived = COALESCE((_prev->>'archived')::boolean, false),
    archived_at = NULLIF(_prev->>'archived_at','')::timestamptz,
    archived_reason = NULLIF(_prev->>'archived_reason',''),
    pre_archive_status = CASE WHEN NULLIF(_prev->>'pre_archive_status','') IS NULL
                              THEN NULL ELSE (_prev->>'pre_archive_status')::user_status END,
    departure_type = NULLIF(_prev->>'departure_type',''),
    departure_reason = NULLIF(_prev->>'departure_reason',''),
    last_day_worked = NULLIF(_prev->>'last_day_worked','')::date,
    committed_last_day = NULLIF(_prev->>'committed_last_day','')::date,
    next_year_status = NULLIF(_prev->>'next_year_status',''),
    showed_up_date = NULLIF(_prev->>'showed_up_date','')::date,
    office_id = NULLIF(_prev->>'office_id','')::uuid,
    last_sweep_at = now(),
    last_sweep_by = _uid,
    updated_at = now()
  WHERE user_id = _target;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.start_sweep_session(_filter jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error','Managers only');
  END IF;
  INSERT INTO sweep_sessions (actor_id, filter) VALUES (_uid, COALESCE(_filter,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN jsonb_build_object('success', true, 'session_id', _id);
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_mark_gone(uuid, text, text, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sweep_mark_here(uuid, date, text, uuid, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sweep_restore(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_sweep_session(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_mark_gone(uuid, text, text, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sweep_mark_here(uuid, date, text, uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sweep_restore(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_sweep_session(jsonb) TO authenticated, service_role;

-- 6. Gap counters
CREATE OR REPLACE FUNCTION public.get_roster_gaps()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _is_mgr boolean;
  _my_name text;
  _res jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  _staff := public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');
  _is_mgr := public.has_role(_uid,'manager');
  IF NOT (_staff OR _is_mgr) THEN RETURN jsonb_build_object('error','Managers only'); END IF;

  SELECT full_name INTO _my_name FROM profiles WHERE user_id = _uid;

  WITH scoped AS (
    SELECT p.* FROM profiles p
    WHERE COALESCE(p.alumni,false) = false
      AND p.user_id <> _uid
      AND (
        _staff
        OR public.is_in_my_downline(p.user_id)
        OR (_my_name IS NOT NULL AND lower(btrim(COALESCE(p.direct_manager,''))) = lower(btrim(_my_name)))
      )
  )
  SELECT jsonb_build_object(
    'no_committed_last_day', (SELECT count(*) FROM scoped WHERE archived IS NOT TRUE AND committed_last_day IS NULL),
    'no_departure_reason', (SELECT count(*) FROM scoped WHERE archived IS TRUE AND NULLIF(btrim(COALESCE(departure_reason,'')),'') IS NULL),
    'no_next_season_status', (SELECT count(*) FROM scoped WHERE archived IS NOT TRUE AND NULLIF(btrim(COALESCE(next_year_status,'')),'') IS NULL),
    'total', (SELECT count(*) FROM scoped)
  ) INTO _res;

  RETURN _res;
END;
$$;

REVOKE ALL ON FUNCTION public.get_roster_gaps() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_roster_gaps() TO authenticated, service_role;

-- 7. Region sheet: funnel by office / leader + production for every name
CREATE OR REPLACE FUNCTION public.get_region_sheet()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  season_start date;
  season_end date;
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT s.starts_on, s.ends_on INTO season_start, season_end
  FROM public.seasons s
  WHERE s.is_active
  ORDER BY s.starts_on DESC
  LIMIT 1;

  WITH roster AS (
    SELECT p.user_id,
           p.full_name,
           p.avatar_url,
           COALESCE(o.name, NULLIF(btrim(p.office_name), '')) AS office,
           t.name AS team,
           COALESCE(NULLIF(btrim(p.direct_manager), ''), NULLIF(btrim(p.recruiter), '')) AS manager,
           p.rep_year,
           COALESCE(NULLIF(btrim(p.recruited_by_name), ''), NULLIF(btrim(p.referred_by), '')) AS recruited_by,
           p.vertical,
           p.runs_vertical,
           p.status::text AS status,
           p.status_detail,
           p.approved,
           p.archived,
           p.alumni,
           p.archived_at,
           p.departure_type,
           p.departure_reason,
           p.last_day_worked,
           p.revenue_to_date,
           p.committed_last_day,
           p.next_year_status,
           p.showed_up_date,
           p.created_at,
           p.last_active_at,
           (SELECT COALESCE(sum(rv.revenue),0) FROM rep_revenue rv WHERE rv.user_id = p.user_id) AS revenue_total,
           (SELECT count(*) FROM rep_revenue rv WHERE rv.user_id = p.user_id AND COALESCE(rv.revenue,0) > 0) AS months_active,
           (SELECT to_char(max(rv.month),'YYYY-MM') FROM rep_revenue rv WHERE rv.user_id = p.user_id AND COALESCE(rv.revenue,0) > 0) AS last_revenue_month
    FROM public.profiles p
    LEFT JOIN public.offices o ON o.id = p.office_id
    LEFT JOIN public.teams t ON t.id = p.team_id
  ),
  active AS (SELECT * FROM roster WHERE archived IS NOT TRUE),
  departed AS (SELECT * FROM roster WHERE archived IS TRUE),
  season_roster AS (
    SELECT * FROM roster
    WHERE season_start IS NULL
       OR (created_at::date <= COALESCE(season_end, CURRENT_DATE))
  ),
  funnel_office AS (
    SELECT COALESCE(office,'') AS label,
           count(*) AS recruited,
           count(*) FILTER (WHERE showed_up_date IS NOT NULL OR last_active_at IS NOT NULL) AS showed_up,
           count(*) FILTER (WHERE archived IS NOT TRUE) AS still_here,
           count(*) FILTER (WHERE archived IS TRUE) AS fell_off,
           count(*) FILTER (WHERE archived IS TRUE AND departure_type = 'fired') AS fired,
           count(*) FILTER (WHERE archived IS TRUE AND departure_type = 'quit') AS quit,
           count(*) FILTER (WHERE archived IS TRUE AND departure_type = 'home_early') AS home_early,
           count(*) FILTER (WHERE archived IS TRUE AND COALESCE(departure_type,'unknown') = 'unknown') AS unknown
    FROM season_roster GROUP BY COALESCE(office,'')
  ),
  funnel_leader AS (
    SELECT COALESCE(manager,'') AS label,
           count(*) AS recruited,
           count(*) FILTER (WHERE showed_up_date IS NOT NULL OR last_active_at IS NOT NULL) AS showed_up,
           count(*) FILTER (WHERE archived IS NOT TRUE) AS still_here,
           count(*) FILTER (WHERE archived IS TRUE) AS fell_off,
           count(*) FILTER (WHERE archived IS TRUE AND departure_type = 'fired') AS fired,
           count(*) FILTER (WHERE archived IS TRUE AND departure_type = 'quit') AS quit,
           count(*) FILTER (WHERE archived IS TRUE AND departure_type = 'home_early') AS home_early,
           count(*) FILTER (WHERE archived IS TRUE AND COALESCE(departure_type,'unknown') = 'unknown') AS unknown
    FROM season_roster GROUP BY COALESCE(manager,'')
  )
  SELECT jsonb_build_object(
    'season', CASE WHEN season_start IS NULL THEN NULL ELSE jsonb_build_object('starts_on', season_start, 'ends_on', season_end) END,
    'totals', jsonb_build_object(
      'active', (SELECT count(*) FROM active),
      'departed', (SELECT count(*) FROM departed),
      'by_office', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'label'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('label', COALESCE(office, ''), 'count', count(*)) x
          FROM active GROUP BY office) s),
      'by_vertical', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'label'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('label', COALESCE(vertical, ''), 'count', count(*)) x
          FROM active GROUP BY vertical) s),
      'by_rep_year', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'label'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('label', COALESCE(rep_year, ''), 'count', count(*)) x
          FROM active GROUP BY rep_year) s)
    ),
    'funnel', jsonb_build_object(
      'ever_on_roster', (SELECT count(*) FROM season_roster),
      'recruited', (SELECT count(*) FROM season_roster),
      'showed_up', (SELECT count(*) FROM season_roster WHERE showed_up_date IS NOT NULL OR last_active_at IS NOT NULL),
      'still_active', (SELECT count(*) FROM season_roster WHERE archived IS NOT TRUE),
      'departed', (SELECT count(*) FROM season_roster WHERE archived IS TRUE),
      'quit', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND departure_type = 'quit'),
      'fired', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND departure_type = 'fired'),
      'home_early', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND departure_type = 'home_early'),
      'unknown', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND COALESCE(departure_type,'unknown') = 'unknown')
    ),
    'funnel_by_office', (SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.label), '[]'::jsonb) FROM funnel_office f),
    'funnel_by_leader', (SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.label), '[]'::jsonb) FROM funnel_leader f),
    'rows', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.archived, r.full_name), '[]'::jsonb) FROM roster r)
  ) INTO result;

  RETURN result;
END;
$function$;
