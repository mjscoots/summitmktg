CREATE OR REPLACE FUNCTION public.get_my_money_summary(_target uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _t uuid := COALESCE(_target, auth.uid());
  _role text;
  _is_staff boolean;
  _allowed boolean;
  _com record;
  _house record;
  _carrier record;
  _rank_id uuid;
  _stack record;
  _holdback numeric;
  _pest_verticals jsonb;
  _fiber jsonb;
  _months jsonb;
  _events jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT public.get_user_role(_uid) INTO _role;
  _is_staff := _role IN ('admin','owner');
  _allowed := _t = _uid OR _is_staff OR public.is_in_my_downline(_t);
  IF NOT _allowed THEN RETURN NULL; END IF;

  SELECT * INTO _com FROM public.rep_commission WHERE user_id = _t;
  SELECT * INTO _house FROM public.rep_housing WHERE user_id = _t;
  SELECT rank_id INTO _rank_id FROM public.profiles WHERE user_id = _t;

  SELECT c.* INTO _carrier FROM public.carriers c
    WHERE c.vertical='Fiber' AND c.active ORDER BY c.name LIMIT 1;
  IF _carrier.id IS NOT NULL AND _rank_id IS NOT NULL THEN
    SELECT * INTO _stack FROM public.rank_stacks
      WHERE vertical='Fiber' AND carrier_id=_carrier.id AND rank_id=_rank_id;
  END IF;
  BEGIN
    _holdback := NULLIF(public.get_setting('fiber_holdback_percent', NULL),'')::numeric;
  EXCEPTION WHEN others THEN _holdback := NULL;
  END;

  _pest_verticals := jsonb_build_object(
    'pay_scale', _com.pay_scale,
    'signs', _com.signs,
    'avg_account_value', _com.avg_account_value,
    'active_revenue', _com.active_revenue,
    'rate_override', _com.rate_override,
    'logged_sales', (SELECT count(*) FROM public.sales_log s WHERE s.user_id=_t AND COALESCE(s.vertical,'Pest')='Pest')
  );

  _fiber := jsonb_build_object(
    'carrier', _carrier.name,
    'installs', COALESCE((SELECT sum(installs) FROM public.fiber_installs WHERE user_id=_t),0),
    'cancels', COALESCE((SELECT sum(cancels) FROM public.fiber_installs WHERE user_id=_t),0),
    'per_install', CASE WHEN _stack.id IS NOT NULL AND COALESCE(_stack.confirmed,false) THEN _stack.value ELSE NULL END,
    'holdback_percent', _holdback
  );

  _months := COALESCE((
    SELECT jsonb_agg(x ORDER BY x->>'month')
    FROM (
      SELECT jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'pest_revenue', pest_rev, 'fiber_installs', fi) AS x, m
      FROM (
        SELECT date_trunc('month', r.month)::date AS m, sum(r.revenue) AS pest_rev, 0::bigint AS fi
        FROM public.rep_revenue r WHERE r.user_id=_t GROUP BY 1
        UNION ALL
        SELECT date_trunc('month', f.week_start)::date AS m, 0::numeric, sum(f.installs)::bigint
        FROM public.fiber_installs f WHERE f.user_id=_t GROUP BY 1
      ) u
      GROUP BY m, pest_rev, fi
    ) y
  ), '[]'::jsonb);

  _events := COALESCE((
    SELECT jsonb_agg(e ORDER BY (e->>'at') DESC)
    FROM (
      SELECT jsonb_build_object(
        'at', s.sold_at, 'vertical', COALESCE(s.vertical,'Pest'), 'kind', 'sale',
        'description', COALESCE(NULLIF(s.plan,''), 'Sale logged'),
        'amount', NULL, 'detail', COALESCE(s.city,'')
      ) AS e, s.sold_at AS ts
      FROM public.sales_log s WHERE s.user_id=_t
      UNION ALL
      SELECT jsonb_build_object(
        'at', f.week_start, 'vertical', 'Fiber', 'kind', 'install',
        'description', f.installs || ' installs logged',
        'amount', NULL, 'detail', ''
      ), f.week_start::timestamptz
      FROM public.fiber_installs f WHERE f.user_id=_t
      UNION ALL
      SELECT jsonb_build_object(
        'at', _house.updated_at, 'vertical', 'Pest', 'kind', 'housing',
        'description', 'Housing', 'amount', -1 * _house.monthly_cost, 'detail', COALESCE(_house.location,'')
      ), _house.updated_at
      WHERE _house.monthly_cost IS NOT NULL
      ORDER BY ts DESC
      LIMIT 20
    ) z
  ), '[]'::jsonb);

  RETURN jsonb_build_object(
    'user_id', _t,
    'pest', _pest_verticals,
    'fiber', _fiber,
    'months', _months,
    'events', _events
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_money_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_money_summary(uuid) TO authenticated;