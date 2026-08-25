CREATE OR REPLACE FUNCTION public.get_my_money()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _role text;
  _is_staff boolean;
  _p record;
  _rank record;
  _next record;
  _has_next boolean := false;
  _visibility text;
  _rookies boolean;
  _margin text;
  _allowance text;
  _holdback text;
  _out jsonb := '[]'::jsonb;
  _v record;
  _enr record;
  _carrier record;
  _stack record;
  _mgr_stack record;
  _mgr_rank record;
  _mgr record;
  _reqs jsonb;
  _card jsonb;
  _can_see_up boolean;
  _chain jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('verticals','[]'::jsonb); END IF;

  SELECT * INTO _p FROM public.profiles WHERE user_id = _uid;
  SELECT public.get_user_role(_uid) INTO _role;
  _is_staff := _role IN ('manager','admin','owner');

  SELECT * INTO _rank FROM public.ranks WHERE id = _p.rank_id;
  SELECT * INTO _next FROM public.ranks
    WHERE _rank.id IS NOT NULL AND sort_order > _rank.sort_order
    ORDER BY sort_order LIMIT 1;
  _has_next := _next.id IS NOT NULL;

  _visibility := public.get_setting('stack_visibility','direct_leader');
  _rookies := COALESCE(public.get_setting('show_stacks_to_rookies','false'),'false') = 'true';
  _margin := public.get_setting('vertical_lead_margin', NULL);
  _allowance := public.get_setting('fiber_expense_allowance_per_install', NULL);
  _holdback := public.get_setting('fiber_holdback_percent', NULL);

  _can_see_up := _visibility <> 'self'
    AND (_is_staff OR _rookies OR COALESCE(_rank.name,'') <> 'Rookie');

  FOR _v IN SELECT vertical, label, description FROM public.vertical_paths ORDER BY display_order, vertical LOOP
    SELECT * INTO _enr FROM public.rep_vertical_enrollments
      WHERE user_id = _uid AND vertical = _v.vertical
      ORDER BY created_at DESC LIMIT 1;

    _card := jsonb_build_object(
      'vertical', _v.vertical,
      'label', _v.label,
      'enrolled', _enr.id IS NOT NULL,
      'enrollment_status', _enr.status,
      'stack_value', NULL,
      'stack_unit', NULL,
      'stack_note', NULL,
      'carrier', NULL,
      'draft', false,
      'leader', NULL,
      'chain', NULL
    );

    IF _enr.id IS NOT NULL AND _v.vertical = 'Fiber' THEN
      SELECT c.* INTO _carrier FROM public.carriers c
        WHERE c.vertical = 'Fiber' AND c.active
        ORDER BY c.name LIMIT 1;

      IF _carrier.id IS NOT NULL AND _rank.id IS NOT NULL THEN
        SELECT * INTO _stack FROM public.rank_stacks
          WHERE vertical='Fiber' AND carrier_id = _carrier.id AND rank_id = _rank.id;

        IF _stack.id IS NULL THEN
          _card := _card || jsonb_build_object('stack_note','Not set yet','carrier',_carrier.name);
        ELSIF NOT _stack.confirmed AND NOT _is_staff THEN
          _card := _card || jsonb_build_object('stack_note','Pay table not published yet','carrier',_carrier.name,'draft',true);
        ELSE
          _card := _card || jsonb_build_object(
            'stack_value', _stack.value,
            'stack_unit', COALESCE(_stack.unit,'per install'),
            'stack_note', CASE WHEN _stack.value IS NULL THEN 'Not set yet' ELSE NULL END,
            'carrier', _carrier.name,
            'draft', NOT _stack.confirmed
          );

          IF _can_see_up THEN
            SELECT p.* INTO _mgr FROM public.profiles p WHERE p.user_id = _enr.paired_manager;
            IF _mgr.user_id IS NOT NULL THEN
              SELECT * INTO _mgr_rank FROM public.ranks WHERE id = _mgr.rank_id;
              SELECT * INTO _mgr_stack FROM public.rank_stacks
                WHERE vertical='Fiber' AND carrier_id=_carrier.id AND rank_id=_mgr.rank_id;
              IF _mgr_stack.id IS NOT NULL AND (_mgr_stack.confirmed OR _is_staff) THEN
                _card := _card || jsonb_build_object('leader', jsonb_build_object(
                  'name', _mgr.full_name,
                  'rank', _mgr_rank.name,
                  'stack', _mgr_stack.value,
                  'spread', CASE WHEN _mgr_stack.value IS NOT NULL AND _stack.value IS NOT NULL
                                 THEN _mgr_stack.value - _stack.value ELSE NULL END
                ));
              END IF;
            END IF;

            IF _visibility = 'full_chain' THEN
              SELECT jsonb_agg(jsonb_build_object('rank', r.name, 'stack', s.value) ORDER BY r.sort_order)
                INTO _chain
                FROM public.ranks r
                JOIN public.rank_stacks s ON s.rank_id = r.id AND s.vertical='Fiber' AND s.carrier_id=_carrier.id
               WHERE r.sort_order > COALESCE(_rank.sort_order,0)
                 AND (s.confirmed OR _is_staff);
              _card := _card || jsonb_build_object('chain', COALESCE(_chain,'[]'::jsonb),
                'summit_stack', public.get_setting('summit_stack_fiber_' || lower(_carrier.name), NULL));
            END IF;
          END IF;
        END IF;
      ELSIF _rank.id IS NULL THEN
        _card := _card || jsonb_build_object('stack_note','No rank set');
      END IF;
    ELSIF _enr.id IS NOT NULL AND _v.vertical = 'Pest' THEN
      _card := _card || jsonb_build_object('stack_note','Pay scale engine');
    ELSIF _enr.id IS NOT NULL THEN
      _card := _card || jsonb_build_object('stack_note','Not set yet');
    END IF;

    IF _has_next THEN
      SELECT jsonb_agg(jsonb_build_object(
        'rule_type', q.rule_type,
        'value', q.value,
        'window_weeks', q.window_weeks,
        'description', q.description,
        'progress', CASE
          WHEN q.rule_type = 'installs_total' THEN public.fiber_installs_total(_uid)
          WHEN q.rule_type = 'weeks_active' THEN (
            SELECT COUNT(DISTINCT week_start)::int FROM public.fiber_installs
             WHERE user_id = _uid AND installs > 0)
          WHEN q.rule_type = 'installs_per_week' THEN (
            SELECT COUNT(*)::int FROM public.fiber_installs
             WHERE user_id = _uid
               AND installs >= COALESCE(q.value,0)
               AND week_start >= (CURRENT_DATE - (COALESCE(q.window_weeks,4) * 7 || ' days')::interval))
          WHEN q.rule_type = 'producing_reps' THEN public.fiber_producing_reps(_uid, _v.vertical)
          WHEN q.rule_type = 'team_leads_under' THEN (
            SELECT COUNT(*)::int FROM public.rep_vertical_enrollments e
              JOIN public.profiles pr ON pr.user_id = e.user_id
              JOIN public.ranks rr ON rr.id = pr.rank_id
             WHERE e.paired_manager = _uid AND e.vertical = _v.vertical
               AND rr.name IN ('Team Lead','Senior Team Lead'))
          WHEN q.rule_type = 'managers_under' THEN (
            SELECT COUNT(*)::int FROM public.rep_vertical_enrollments e
              JOIN public.profiles pr ON pr.user_id = e.user_id
              JOIN public.ranks rr ON rr.id = pr.rank_id
             WHERE e.paired_manager = _uid AND e.vertical = _v.vertical
               AND rr.name IN ('Manager','Rising Regional','Regional','Senior Regional'))
          ELSE NULL END
      ) ORDER BY q.rule_type)
      INTO _reqs
      FROM public.rank_requirements q
      WHERE q.from_rank_id = _rank.id
        AND (q.vertical IS NULL OR q.vertical = _v.vertical)
        AND (q.confirmed OR _is_staff);
    ELSE
      _reqs := NULL;
    END IF;

    _card := _card || jsonb_build_object('requirements', COALESCE(_reqs,'[]'::jsonb));
    _out := _out || jsonb_build_array(_card);
  END LOOP;

  RETURN jsonb_build_object(
    'rank', _rank.name,
    'rank_is_summit', _rank.id IS NULL AND _role IN ('owner','admin'),
    'next_rank', _next.name,
    'visibility', _visibility,
    'vertical_lead_margin', _margin,
    'fiber_expense_allowance_per_install', _allowance,
    'fiber_holdback_percent', _holdback,
    'producing_rep_definition', public.get_setting('producing_rep_definition', NULL),
    'verticals', _out
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_money() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_money() TO authenticated, service_role;