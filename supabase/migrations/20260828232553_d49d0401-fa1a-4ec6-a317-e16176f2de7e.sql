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

  WITH RECURSIVE downline AS (
    SELECT e.child_user_id AS uid, 1 AS lvl
    FROM public.downline_edges e
    WHERE e.parent_user_id = _uid AND e.edge_type = 'manages'
    UNION ALL
    SELECT e.child_user_id, d.lvl + 1
    FROM public.downline_edges e
    JOIN downline d ON e.parent_user_id = d.uid
    WHERE e.edge_type = 'manages' AND d.lvl < 10
  ),
  people AS (
    SELECT p.user_id
    FROM public.profiles p
    WHERE COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'active') <> 'nlc'
      AND p.user_id IS NOT NULL
      AND p.user_id <> _uid
      AND (
        _scope = 'all'
        OR (_scope = 'vertical' AND p.vertical = _vertical)
        OR (_scope = 'downline' AND (
              p.user_id IN (SELECT uid FROM downline) OR p.manager_id = _uid
        ))
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM public.daily_training_time d
      WHERE d.user_id = op.user_id AND d.date >= _monday AND COALESCE(d.training_minutes,0) > 0)),
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_one_on_ones_rookie r
      WHERE r.rookie_user_id = op.user_id AND r.submitted_at >= _monday)),
    COUNT(*) FILTER (WHERE (
      SELECT COUNT(*) FROM public.recruiting_leads rl WHERE rl.referrer_user_id = op.user_id) < 3)
  INTO _no_training, _no_oneonone, _no_three
  FROM people op;

  RETURN jsonb_build_object(
    'scope', _scope,
    'calls_due', _calls,
    'apps_owned', _apps_mine,
    'apps_unclaimed_old', _apps_stale,
    'reps_no_training', COALESCE(_no_training,0),
    'one_on_ones_missing', COALESCE(_no_oneonone,0),
    'reps_no_three', COALESCE(_no_three,0),
    'total', _calls + _apps_mine + _apps_stale + COALESCE(_no_training,0) + COALESCE(_no_oneonone,0) + COALESCE(_no_three,0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.manager_owed(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_owed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_owed(uuid) TO service_role;