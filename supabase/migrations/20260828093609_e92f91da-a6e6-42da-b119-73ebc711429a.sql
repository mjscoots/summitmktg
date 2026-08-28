-- 1. Effective manager helper
CREATE OR REPLACE FUNCTION public.is_effective_manager(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _uid IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _uid AND ur.role::text IN ('manager','president','admin','owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.downline_edges e
      JOIN public.profiles c ON c.user_id = e.child_user_id
      WHERE e.parent_user_id = _uid AND e.edge_type = 'manages'
        AND COALESCE(c.archived,false) = false
        AND COALESCE(c.status::text,'active') <> 'nlc'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles c
      WHERE c.manager_id = _uid
        AND COALESCE(c.archived,false) = false
        AND COALESCE(c.status::text,'active') <> 'nlc'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_effective_manager(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_effective_manager(uuid) TO authenticated;

-- 2. manager_owed uses the helper for scope
CREATE OR REPLACE FUNCTION public.manager_owed(_manager uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _scope text;
  _vertical text;
  _monday date := (date_trunc('week', (now() at time zone 'America/Los_Angeles'))::date);
  _calls int := 0;
  _apps_mine int := 0;
  _apps_stale int := 0;
  _no_training int := 0;
  _no_oneonone int := 0;
  _no_three int := 0;
  _zero jsonb := jsonb_build_object(
    'scope','none','calls_due',0,'apps_owned',0,'apps_unclaimed_old',0,
    'reps_no_training',0,'one_on_ones_missing',0,'reps_no_three',0,'total',0);
BEGIN
  IF auth.uid() IS NULL THEN RETURN _zero; END IF;
  IF _manager IS NOT NULL AND _manager <> auth.uid()
     AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN _zero;
  END IF;
  _uid := COALESCE(_manager, auth.uid());

  IF public.has_role(_uid,'owner') OR public.has_role(_uid,'admin') THEN
    _scope := 'all';
  ELSIF public.has_role(_uid,'president') THEN
    _scope := 'vertical';
    SELECT p.vertical INTO _vertical FROM public.profiles p WHERE p.user_id = _uid;
  ELSIF public.is_effective_manager(_uid) THEN
    _scope := 'downline';
  ELSE
    RETURN _zero;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _owed_people (user_id uuid) ON COMMIT DROP;
  DELETE FROM _owed_people;

  WITH RECURSIVE downline AS (
    SELECT e.child_user_id AS uid, 1 AS lvl
    FROM public.downline_edges e
    WHERE e.parent_user_id = _uid AND e.edge_type = 'manages'
    UNION ALL
    SELECT e.child_user_id, d.lvl + 1
    FROM public.downline_edges e
    JOIN downline d ON e.parent_user_id = d.uid
    WHERE e.edge_type = 'manages' AND d.lvl < 10
  )
  INSERT INTO _owed_people (user_id)
  SELECT p.user_id
  FROM public.profiles p
  WHERE COALESCE(p.archived,false) = false
    AND COALESCE(p.status::text,'active') <> 'nlc'
    AND p.user_id <> _uid
    AND (
      _scope = 'all'
      OR (_scope = 'vertical' AND p.vertical = _vertical)
      OR (_scope = 'downline' AND (
            p.user_id IN (SELECT uid FROM downline) OR p.manager_id = _uid
      ))
    );

  SELECT COUNT(*) INTO _calls
  FROM public.people_leads l
  WHERE COALESCE(l.do_not_call,false) = false
    AND COALESCE(l.hold,false) = false
    AND (_scope = 'all' OR l.designated_to = _uid)
    AND (
      (l.next_call_at IS NOT NULL AND l.next_call_at <= now())
      OR (l.next_call_at IS NULL AND l.last_contact_at IS NULL AND l.designated_to IS NOT NULL)
    );

  SELECT COUNT(*) INTO _apps_mine
  FROM public.applications a
  WHERE a.status = 'pending' AND a.reviewed_by = _uid AND a.first_touch_at IS NULL;

  SELECT COUNT(*) INTO _apps_stale
  FROM public.applications a
  WHERE a.status = 'pending' AND a.reviewed_by IS NULL AND a.created_at < now() - interval '24 hours';

  SELECT COUNT(*) INTO _no_training
  FROM _owed_people op
  WHERE NOT EXISTS (
    SELECT 1 FROM public.daily_training_time d
    WHERE d.user_id = op.user_id AND d.date >= _monday AND COALESCE(d.training_minutes,0) > 0
  );

  SELECT COUNT(*) INTO _no_oneonone
  FROM _owed_people op
  WHERE NOT EXISTS (
    SELECT 1 FROM public.weekly_one_on_ones_rookie r
    WHERE r.rookie_user_id = op.user_id AND r.submitted_at >= _monday
  );

  SELECT COUNT(*) INTO _no_three
  FROM _owed_people op
  WHERE (
    SELECT COUNT(*) FROM public.recruiting_leads rl WHERE rl.referrer_user_id = op.user_id
  ) < 3;

  RETURN jsonb_build_object(
    'scope', _scope,
    'calls_due', _calls,
    'apps_owned', _apps_mine,
    'apps_unclaimed_old', _apps_stale,
    'reps_no_training', _no_training,
    'one_on_ones_missing', _no_oneonone,
    'reps_no_three', _no_three,
    'total', _calls + _apps_mine + _apps_stale + _no_training + _no_oneonone + _no_three
  );
END;
$function$;

-- 3. owed_by_manager lists effective managers
CREATE OR REPLACE FUNCTION public.owed_by_manager()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _out jsonb := '[]'::jsonb;
  _r record;
  _o jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR _r IN
    SELECT p.user_id, COALESCE(p.full_name,'Manager') AS full_name
    FROM public.profiles p
    WHERE COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'active') <> 'nlc'
      AND p.user_id IS NOT NULL
      AND public.is_effective_manager(p.user_id)
  LOOP
    _o := public.manager_owed(_r.user_id);
    _out := _out || jsonb_build_array(jsonb_build_object(
      'user_id', _r.user_id,
      'full_name', _r.full_name,
      'total', COALESCE((_o->>'total')::int, 0)
    ));
  END LOOP;

  RETURN _out;
END;
$function$;

-- 4. Seats report
CREATE OR REPLACE FUNCTION public.seats_rows()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  _rows jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb,'never_signed_in',0,'no_invite',0,'managers_missing_role',0);
  END IF;

  WITH act AS (
    SELECT p.user_id, COALESCE(p.full_name,'Unnamed') AS full_name, p.team_id, p.manager_id,
           COALESCE(p.active_vertical, p.vertical) AS vertical, p.region
    FROM public.profiles p
    WHERE COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'active') <> 'nlc'
      AND p.user_id IS NOT NULL
  ), inv AS (
    SELECT DISTINCT ON (i.manager_target) i.manager_target, i.id, i.token, i.expires_at, i.used_at, i.revoked_at
    FROM (
      SELECT (i.note)::text AS note, i.*, (NULLIF(split_part(COALESCE(i.note,''), 'seat:', 2), ''))::uuid AS manager_target
      FROM public.invites i
      WHERE i.note LIKE 'seat:%'
    ) i
    ORDER BY i.manager_target, i.created_at DESC
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', a.user_id,
    'full_name', a.full_name,
    'team_name', t.name,
    'team_id', a.team_id,
    'vertical', a.vertical,
    'region', a.region,
    'manager_id', a.manager_id,
    'manager_name', m.full_name,
    'manager_departed', (a.manager_id IS NOT NULL AND (COALESCE(m.archived,false) OR COALESCE(m.status::text,'active') = 'nlc')),
    'signed_in', (u.last_sign_in_at IS NOT NULL),
    'last_sign_in_at', u.last_sign_in_at,
    'role', (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = a.user_id
             ORDER BY CASE ur.role::text WHEN 'owner' THEN 5 WHEN 'admin' THEN 4 WHEN 'president' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END DESC LIMIT 1),
    'has_manager_role', EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = a.user_id AND ur.role::text IN ('manager','president','admin','owner')),
    'effective_manager', public.is_effective_manager(a.user_id),
    'invite_id', iv.id,
    'invite_token', iv.token,
    'invite_state', CASE
        WHEN iv.id IS NULL THEN 'none'
        WHEN iv.used_at IS NOT NULL THEN 'used'
        WHEN iv.revoked_at IS NOT NULL THEN 'revoked'
        WHEN iv.expires_at < now() THEN 'expired'
        ELSE 'open' END
  ) ORDER BY (u.last_sign_in_at IS NOT NULL), a.full_name), '[]'::jsonb)
  INTO _rows
  FROM act a
  LEFT JOIN public.teams t ON t.id = a.team_id
  LEFT JOIN public.profiles m ON m.user_id = a.manager_id
  LEFT JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN inv iv ON iv.manager_target = a.user_id;

  RETURN jsonb_build_object(
    'rows', _rows,
    'never_signed_in', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r WHERE (r->>'signed_in')::boolean = false),
    'no_invite', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r WHERE r->>'invite_state' = 'none'),
    'managers_missing_role', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r
        WHERE (r->>'effective_manager')::boolean AND (r->>'has_manager_role')::boolean = false)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.seats_rows() FROM anon;
GRANT EXECUTE ON FUNCTION public.seats_rows() TO authenticated;

-- 5. Create a seat invite
CREATE OR REPLACE FUNCTION public.create_seat_invite(_user_id uuid, _days int DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _p record;
  _token text;
  _role text;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT user_id, full_name, team_id, manager_id, COALESCE(active_vertical, vertical) AS vertical, region
  INTO _p FROM public.profiles WHERE user_id = _user_id;
  IF _p.user_id IS NULL THEN RAISE EXCEPTION 'No such person'; END IF;

  SELECT CASE WHEN public.is_effective_manager(_user_id) THEN 'manager' ELSE 'rep' END INTO _role;
  _token := public.new_invite_token();

  INSERT INTO public.invites (token, created_by, role, vertical, team_id, region, manager_id, note, expires_at)
  VALUES (_token, auth.uid(), _role, _p.vertical, _p.team_id, _p.region, _p.manager_id,
          'seat:' || _user_id::text, now() + make_interval(days => GREATEST(COALESCE(_days,14),1)));

  RETURN jsonb_build_object('token', _token, 'full_name', _p.full_name);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_seat_invite(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_seat_invite(uuid, int) TO authenticated;

-- 6. Revoke a seat invite
CREATE OR REPLACE FUNCTION public.revoke_seat_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.invites SET revoked_at = now() WHERE id = _invite_id AND used_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.revoke_seat_invite(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_seat_invite(uuid) TO authenticated;

-- 7. Owner grants or removes manager access
CREATE OR REPLACE FUNCTION public.set_manager_seat(_user_id uuid, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'owner') THEN
    RAISE EXCEPTION 'Owner only';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'manager'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'manager'::public.app_role;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_manager_seat(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_manager_seat(uuid, boolean) TO authenticated;

-- 8. Move a rep to a live manager
CREATE OR REPLACE FUNCTION public.seat_set_manager(_user_id uuid, _new_manager uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _user_id = _new_manager THEN RAISE EXCEPTION 'A person cannot manage themselves'; END IF;

  SELECT full_name INTO _name FROM public.profiles WHERE user_id = _new_manager
    AND COALESCE(archived,false) = false AND COALESCE(status::text,'active') <> 'nlc';
  IF _name IS NULL THEN RAISE EXCEPTION 'Pick a live manager'; END IF;

  UPDATE public.profiles SET manager_id = _new_manager, direct_manager = _name WHERE user_id = _user_id;

  DELETE FROM public.downline_edges WHERE child_user_id = _user_id AND edge_type = 'manages';
  INSERT INTO public.downline_edges (parent_user_id, child_user_id, edge_type)
  VALUES (_new_manager, _user_id, 'manages')
  ON CONFLICT DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.seat_set_manager(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.seat_set_manager(uuid, uuid) TO authenticated;