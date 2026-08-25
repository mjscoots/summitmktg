-- settings
INSERT INTO public.app_settings (key, value) VALUES
  ('stack_visibility','direct_leader'),
  ('show_stacks_to_rookies','false'),
  ('publish_stacks_publicly','false')
ON CONFLICT (key) DO NOTHING;

-- attribution placeholder until Pass 32
ALTER TABLE public.rep_vertical_enrollments
  ADD COLUMN IF NOT EXISTS stack_source text NOT NULL DEFAULT 'summit';

-- helper: app setting fetch
CREATE OR REPLACE FUNCTION public.get_setting(_key text, _default text DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key = _key), ''), _default);
$$;
REVOKE ALL ON FUNCTION public.get_setting(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_setting(text,text) TO authenticated, service_role;

-- fiber install helpers
CREATE OR REPLACE FUNCTION public.fiber_installs_total(_user uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE(SUM(installs),0)::int FROM public.fiber_installs WHERE user_id = _user; $$;
REVOKE ALL ON FUNCTION public.fiber_installs_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fiber_installs_total(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fiber_producing_reps(_leader uuid, _vertical text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT e.user_id)::int
  FROM public.rep_vertical_enrollments e
  WHERE e.paired_manager = _leader
    AND e.vertical = _vertical
    AND EXISTS (
      SELECT 1 FROM public.fiber_installs f
      WHERE f.user_id = e.user_id
        AND f.installs >= 1
        AND f.week_start >= (CURRENT_DATE - interval '28 days')
    );
$$;
REVOKE ALL ON FUNCTION public.fiber_producing_reps(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fiber_producing_reps(uuid,text) TO authenticated, service_role;

-- main money view
CREATE OR REPLACE FUNCTION public.get_my_money()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text;
  _is_staff boolean;
  _p record;
  _rank record;
  _next record;
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
  IF _rank.id IS NOT NULL THEN
    SELECT * INTO _next FROM public.ranks WHERE sort_order > _rank.sort_order ORDER BY sort_order LIMIT 1;
  END IF;

  _visibility := public.get_setting('stack_visibility','direct_leader');
  _rookies := COALESCE(public.get_setting('show_stacks_to_rookies','false'),'false') = 'true';
  _margin := public.get_setting('vertical_lead_margin', NULL);
  _allowance := public.get_setting('fiber_expense_allowance_per_install', NULL);
  _holdback := public.get_setting('fiber_holdback_percent', NULL);

  -- can this person see stacks above their own?
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

          -- one level up
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

    -- next rank requirements + progress for this vertical
    IF _next.id IS NOT NULL THEN
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
$$;
REVOKE ALL ON FUNCTION public.get_my_money() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_money() TO authenticated, service_role;

-- leader spread view
CREATE OR REPLACE FUNCTION public.get_my_spread()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text;
  _p record;
  _carrier record;
  _my_stack numeric;
  _allowance numeric;
  _margin text;
  _rows jsonb := '[]'::jsonb;
  _r record;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  SELECT public.get_user_role(_uid) INTO _role;
  IF _role NOT IN ('manager','admin','owner') THEN
    RETURN jsonb_build_object('rows','[]'::jsonb);
  END IF;

  SELECT * INTO _p FROM public.profiles WHERE user_id = _uid;
  SELECT * INTO _carrier FROM public.carriers WHERE vertical='Fiber' AND active ORDER BY name LIMIT 1;
  IF _carrier.id IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;

  SELECT value INTO _my_stack FROM public.rank_stacks
   WHERE vertical='Fiber' AND carrier_id=_carrier.id AND rank_id=_p.rank_id;

  _allowance := NULLIF(public.get_setting('fiber_expense_allowance_per_install', NULL),'')::numeric;
  _margin := public.get_setting('vertical_lead_margin', NULL);

  FOR _r IN
    SELECT e.user_id, e.stack_source, pr.full_name, rr.name AS rank_name, s.value AS rep_stack, s.confirmed
      FROM public.rep_vertical_enrollments e
      JOIN public.profiles pr ON pr.user_id = e.user_id
      LEFT JOIN public.ranks rr ON rr.id = pr.rank_id
      LEFT JOIN public.rank_stacks s ON s.rank_id = pr.rank_id AND s.vertical='Fiber' AND s.carrier_id=_carrier.id
     WHERE e.paired_manager = _uid AND e.vertical='Fiber' AND COALESCE(pr.archived,false)=false
     ORDER BY pr.full_name
  LOOP
    _rows := _rows || jsonb_build_array(jsonb_build_object(
      'user_id', _r.user_id,
      'name', _r.full_name,
      'rank', _r.rank_name,
      'rep_stack', _r.rep_stack,
      'my_stack', _my_stack,
      'spread', CASE WHEN _my_stack IS NOT NULL AND _r.rep_stack IS NOT NULL
                     THEN _my_stack - _r.rep_stack ELSE NULL END,
      'sourced_by', CASE WHEN _r.stack_source = 'self' THEN 'Me' ELSE 'Summit' END,
      'my_share', CASE
        WHEN _my_stack IS NULL OR _r.rep_stack IS NULL THEN NULL
        WHEN _r.stack_source = 'self' THEN _my_stack - _r.rep_stack
        WHEN _allowance IS NULL THEN NULL
        ELSE ((_my_stack - _r.rep_stack) - _allowance) / 2
      END
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'carrier', _carrier.name,
    'my_stack', _my_stack,
    'expense_allowance', _allowance,
    'vertical_lead_margin', _margin,
    'rows', _rows
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_spread() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_spread() TO authenticated, service_role;

-- admin override of stack source on an enrollment
CREATE OR REPLACE FUNCTION public.admin_set_stack_source(_user_id uuid, _vertical text, _source text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  IF _source NOT IN ('summit','self') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown source');
  END IF;
  UPDATE public.rep_vertical_enrollments
     SET stack_source = _source
   WHERE user_id = _user_id AND vertical = _vertical;
  PERFORM public.write_audit('stack_source','rep_vertical_enrollments', _user_id::text,
    jsonb_build_object('vertical', _vertical, 'source', _source));
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_stack_source(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_stack_source(uuid,text,text) TO authenticated, service_role;

-- public fiber pay table (empty unless published and confirmed)
CREATE OR REPLACE FUNCTION public.get_public_fiber_stacks()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _published boolean;
BEGIN
  _published := COALESCE(public.get_setting('publish_stacks_publicly','false'),'false') = 'true';
  IF NOT _published THEN
    RETURN jsonb_build_object('published', false, 'carriers', '[]'::jsonb, 'holdback_percent', NULL);
  END IF;
  RETURN jsonb_build_object(
    'published', true,
    'holdback_percent', public.get_setting('fiber_holdback_percent', NULL),
    'carriers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'carrier_id', c.id,
        'carrier', c.name,
        'rows', (SELECT jsonb_agg(jsonb_build_object('rank', r.name, 'sort_order', r.sort_order, 'value', s.value) ORDER BY r.sort_order)
                   FROM public.rank_stacks s JOIN public.ranks r ON r.id = s.rank_id
                  WHERE s.vertical='Fiber' AND s.carrier_id = c.id AND s.confirmed)
      ) ORDER BY c.name)
      FROM public.carriers c
     WHERE c.vertical='Fiber' AND c.active AND c.public
       AND EXISTS (SELECT 1 FROM public.rank_stacks s WHERE s.carrier_id = c.id AND s.confirmed)
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_fiber_stacks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_fiber_stacks() TO anon, authenticated, service_role;

-- admin/staff fiber pay table preview (in-app), respects draft flag labelling
CREATE OR REPLACE FUNCTION public.get_fiber_stack_table()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _role text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('carriers','[]'::jsonb); END IF;
  SELECT public.get_user_role(auth.uid()) INTO _role;
  RETURN jsonb_build_object(
    'is_staff', _role IN ('admin','owner'),
    'holdback_percent', public.get_setting('fiber_holdback_percent', NULL),
    'carriers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'carrier_id', c.id,
        'carrier', c.name,
        'confirmed', (SELECT bool_and(s.confirmed) FROM public.rank_stacks s WHERE s.carrier_id = c.id),
        'rows', (SELECT jsonb_agg(jsonb_build_object('rank', r.name, 'sort_order', r.sort_order, 'value',
                        CASE WHEN s.confirmed OR _role IN ('admin','owner') THEN s.value ELSE NULL END) ORDER BY r.sort_order)
                   FROM public.rank_stacks s JOIN public.ranks r ON r.id = s.rank_id
                  WHERE s.vertical='Fiber' AND s.carrier_id = c.id)
      ) ORDER BY c.name)
      FROM public.carriers c
     WHERE c.vertical='Fiber' AND c.active
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_fiber_stack_table() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fiber_stack_table() TO authenticated, service_role;