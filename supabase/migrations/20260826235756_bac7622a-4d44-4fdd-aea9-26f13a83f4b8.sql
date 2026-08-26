CREATE OR REPLACE FUNCTION public.get_fiber_stack_table()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _is_staff boolean;
  _rank_name text;
  _visibility text;
  _rookies boolean;
  _can_see boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('carriers','[]'::jsonb); END IF;
  SELECT public.get_user_role(auth.uid()) INTO _role;
  _is_staff := _role IN ('admin','owner');

  SELECT r.name INTO _rank_name
    FROM public.profiles p LEFT JOIN public.ranks r ON r.id = p.rank_id
   WHERE p.user_id = auth.uid();

  _visibility := public.get_setting('stack_visibility','direct_leader');
  _rookies := COALESCE(public.get_setting('show_stacks_to_rookies','false'),'false') = 'true';

  _can_see := _is_staff OR (
    _visibility <> 'self'
    AND (_role IN ('manager') OR _rookies OR COALESCE(_rank_name,'Tier 1 · Start') NOT LIKE 'Tier 1%')
  );

  RETURN jsonb_build_object(
    'is_staff', _is_staff,
    'can_see_values', _can_see,
    'source', public.get_setting('fiber_pay_source', NULL),
    'rules', public.get_setting('fiber_pay_rules', NULL),
    'holdback_percent', CASE WHEN _is_staff THEN public.get_setting('fiber_holdback_percent', NULL) ELSE NULL END,
    'carriers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'carrier_id', c.id,
        'carrier', c.name,
        'confirmed', (SELECT bool_and(s.confirmed) FROM public.rank_stacks s WHERE s.carrier_id = c.id),
        'rows', (SELECT jsonb_agg(jsonb_build_object(
                        'rank', COALESCE(s.label, r.name),
                        'sort_order', COALESCE(s.sort_order, r.sort_order),
                        'value', CASE WHEN _is_staff THEN s.value
                             WHEN s.confirmed AND _can_see THEN s.value
                             ELSE NULL END) ORDER BY COALESCE(s.sort_order, r.sort_order))
                   FROM public.rank_stacks s LEFT JOIN public.ranks r ON r.id = s.rank_id
                  WHERE s.vertical='Fiber' AND s.carrier_id = c.id)
      ) ORDER BY c.name)
      FROM public.carriers c
     WHERE c.vertical='Fiber' AND c.active
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_fiber_stacks()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'rows', (SELECT jsonb_agg(jsonb_build_object(
                          'rank', COALESCE(s.label, r.name),
                          'sort_order', COALESCE(s.sort_order, r.sort_order),
                          'value', s.value) ORDER BY COALESCE(s.sort_order, r.sort_order))
                   FROM public.rank_stacks s LEFT JOIN public.ranks r ON r.id = s.rank_id
                  WHERE s.vertical='Fiber' AND s.carrier_id = c.id AND s.confirmed)
      ) ORDER BY c.name)
      FROM public.carriers c
     WHERE c.vertical='Fiber' AND c.active AND c.public
       AND EXISTS (SELECT 1 FROM public.rank_stacks s WHERE s.carrier_id = c.id AND s.confirmed)
    ), '[]'::jsonb)
  );
END;
$function$;

-- The rep's fiber tier and the next tier, read from the loaded v5 rows.
CREATE OR REPLACE FUNCTION public.my_fiber_tier(_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _carrier record;
  _rank_id uuid;
  _cur record;
  _next record;
  _installs int;
  _threshold int;
BEGIN
  SELECT rank_id INTO _rank_id FROM public.profiles WHERE user_id = _uid;
  SELECT c.* INTO _carrier FROM public.carriers c
    WHERE c.vertical='Fiber' AND c.active ORDER BY c.name LIMIT 1;
  IF _carrier.id IS NULL OR _rank_id IS NULL THEN
    RETURN jsonb_build_object('rank_label', NULL, 'next_tier_label', NULL,
      'next_tier_gap', NULL, 'next_tier_progress', NULL, 'per_install', NULL);
  END IF;

  SELECT s.*, COALESCE(s.label, r.name) AS row_label, COALESCE(s.sort_order, r.sort_order) AS row_order
    INTO _cur
    FROM public.rank_stacks s LEFT JOIN public.ranks r ON r.id = s.rank_id
   WHERE s.vertical='Fiber' AND s.carrier_id = _carrier.id AND s.rank_id = _rank_id;

  SELECT s.*, COALESCE(s.label, r.name) AS row_label
    INTO _next
    FROM public.rank_stacks s LEFT JOIN public.ranks r ON r.id = s.rank_id
   WHERE s.vertical='Fiber' AND s.carrier_id = _carrier.id
     AND COALESCE(s.sort_order, r.sort_order) > COALESCE(_cur.row_order, 0)
     AND s.value IS NOT NULL
     AND (_cur.value IS NULL OR s.value > _cur.value)
   ORDER BY COALESCE(s.sort_order, r.sort_order)
   LIMIT 1;

  _installs := public.fiber_installs_total(_uid);
  _threshold := NULLIF(substring(COALESCE(_next.row_label,'') from '([0-9]+) installs'), '')::int;

  RETURN jsonb_build_object(
    'rank_label', _cur.row_label,
    'per_install', CASE WHEN COALESCE(_cur.confirmed,false) THEN _cur.value ELSE NULL END,
    'next_tier_label', _next.row_label,
    'next_tier_gap', CASE WHEN _threshold IS NULL THEN NULL ELSE GREATEST(_threshold - _installs, 0) END,
    'next_tier_progress', CASE WHEN _threshold IS NULL OR _threshold = 0 THEN NULL
                               ELSE LEAST(_installs::numeric / _threshold, 1) END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.my_fiber_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_fiber_tier(uuid) TO authenticated;