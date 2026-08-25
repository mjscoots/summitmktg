-- ============ A1. settings lockdown ============
REVOKE EXECUTE ON FUNCTION public.get_setting(text, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.value
  FROM public.app_settings s
  WHERE s.key = _key
    AND (
      _key LIKE 'calc\_%'
      OR _key IN (
        'public_fiber_starting_rate',
        'publish_stacks_publicly',
        'public_counter_min_reps',
        'public_counter_min_signs',
        'fiber_calc_default_weeks',
        'fiber_calc_min_weeks',
        'fiber_calc_max_weeks'
      )
    );
$$;
REVOKE ALL ON FUNCTION public.get_public_setting(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_setting(text) TO anon, authenticated, service_role;

-- sensitive settings keys are staff-only at the table level
DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
CREATE POLICY "Signed-in users read non-sensitive settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
    OR key NOT IN (
      'vertical_lead_margin',
      'fiber_expense_allowance_per_install',
      'fiber_holdback_percent'
    )
    AND key NOT LIKE 'summit\_stack\_%'
  );

-- ============ A2. fiber stack table visibility ============
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
    AND (_role IN ('manager') OR _rookies OR COALESCE(_rank_name,'Rookie') <> 'Rookie')
  );

  RETURN jsonb_build_object(
    'is_staff', _is_staff,
    'can_see_values', _can_see,
    'holdback_percent', CASE WHEN _is_staff THEN public.get_setting('fiber_holdback_percent', NULL) ELSE NULL END,
    'carriers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'carrier_id', c.id,
        'carrier', c.name,
        'confirmed', (SELECT bool_and(s.confirmed) FROM public.rank_stacks s WHERE s.carrier_id = c.id),
        'rows', (SELECT jsonb_agg(jsonb_build_object('rank', r.name, 'sort_order', r.sort_order, 'value',
                        CASE WHEN _is_staff THEN s.value
                             WHEN s.confirmed AND _can_see THEN s.value
                             ELSE NULL END) ORDER BY r.sort_order)
                   FROM public.rank_stacks s JOIN public.ranks r ON r.id = s.rank_id
                  WHERE s.vertical='Fiber' AND s.carrier_id = c.id)
      ) ORDER BY c.name)
      FROM public.carriers c
     WHERE c.vertical='Fiber' AND c.active
    ), '[]'::jsonb)
  );
END;
$function$;

-- ============ A3. revoke anon execute on non-public routines ============
DO $$
DECLARE r record;
  keep text[] := ARRAY[
    'get_public_counters','get_public_industry','get_public_fiber_stacks','get_recruiting_content',
    'get_recruiting_proof','get_ticket_config','get_ticket_series_status','validate_access_code',
    'resolve_source_code','get_current_season','get_public_calc','get_public_setting',
    'has_role','is_vertical_lead','is_vertical_lead_of_rep','region_lead_of','is_paired_manager_of','get_user_role'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND has_function_privilege('anon', p.oid, 'execute')
       AND NOT (p.proname = ANY(keep))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- ============ A4. team_resources ============
DROP POLICY IF EXISTS "Authenticated users can view team resources" ON public.team_resources;
CREATE POLICY "Signed-in users can view team resources"
  ON public.team_resources FOR SELECT TO authenticated USING (true);

-- ============ A6. manager profile scope + picker directory ============
DROP POLICY IF EXISTS "Managers can view team and rookie profiles" ON public.profiles;
CREATE POLICY "Managers view their vertical and their tree"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR auth.uid() = user_id
    OR (
      public.has_role(auth.uid(), 'manager')
      AND status <> 'nlc'
      AND (
        vertical IS NOT DISTINCT FROM (SELECT me.vertical FROM public.profiles me WHERE me.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.downline_edges e
           WHERE e.parent_user_id = auth.uid() AND e.child_user_id = profiles.user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.downline_edges e
           WHERE e.child_user_id = auth.uid() AND e.parent_user_id = profiles.user_id
        )
      )
    )
  );

CREATE OR REPLACE VIEW public.manager_directory
WITH (security_invoker = off) AS
  SELECT p.user_id, p.full_name, p.nickname, p.avatar_url, p.manager_intro,
         p.mentee_capacity, p.office_name, p.vertical, r.name AS rank_name,
         p.accepting_new_reps
    FROM public.profiles p
    LEFT JOIN public.ranks r ON r.id = p.rank_id
   WHERE p.archived = false
     AND p.status = 'active'
     AND public.has_role(p.user_id, 'manager');

REVOKE ALL ON public.manager_directory FROM anon;
GRANT SELECT ON public.manager_directory TO authenticated;

-- ============ B. rank backfill (idempotent) + data health ============
CREATE OR REPLACE FUNCTION public.recompute_missing_ranks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _fixed int := 0;
  _row record;
  _rank_id uuid;
  _rank_name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;

  FOR _row IN
    SELECT p.user_id, p.experience::text AS experience
      FROM public.profiles p
     WHERE p.status = 'active' AND p.archived = false AND p.rank_id IS NULL
  LOOP
    _rank_name := CASE
      WHEN public.has_role(_row.user_id, 'manager') THEN 'Manager'
      WHEN _row.experience = 'veteran' THEN 'Rep'
      ELSE 'Rookie' END;
    SELECT id INTO _rank_id FROM public.ranks WHERE name = _rank_name;
    IF _rank_id IS NULL THEN CONTINUE; END IF;

    UPDATE public.profiles SET rank_id = _rank_id WHERE user_id = _row.user_id AND rank_id IS NULL;
    _fixed := _fixed + 1;

    INSERT INTO public.audit_log (actor_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'rank_backfill', 'profiles', _row.user_id,
            jsonb_build_object('rank', _rank_name, 'reason', 'derived from role/experience'));
  END LOOP;

  RETURN jsonb_build_object('success', true, 'fixed', _fixed);
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_missing_ranks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_missing_ranks() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_data_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _out jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('error','Not allowed');
  END IF;

  SELECT jsonb_build_object(
    'no_rank', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.full_name) ORDER BY p.full_name)
        FROM public.profiles p WHERE p.status='active' AND NOT p.archived AND p.rank_id IS NULL), '[]'::jsonb),
    'no_manager', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.full_name) ORDER BY p.full_name)
        FROM public.profiles p WHERE p.status='active' AND NOT p.archived
          AND NOT EXISTS (SELECT 1 FROM public.downline_edges e WHERE e.child_user_id = p.user_id)), '[]'::jsonb),
    'no_vertical', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.full_name) ORDER BY p.full_name)
        FROM public.profiles p WHERE p.status='active' AND NOT p.archived
          AND COALESCE(p.vertical,'') = ''), '[]'::jsonb),
    'duplicate_names', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', x.full_name, 'count', x.n))
        FROM (SELECT p.full_name, count(*) n FROM public.profiles p
               WHERE p.status='active' AND NOT p.archived AND p.full_name IS NOT NULL
               GROUP BY p.full_name HAVING count(*) > 1) x), '[]'::jsonb),
    'vertical_mismatch', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.full_name,
             'profile_vertical',p.vertical,'enrollment_vertical',e.vertical))
        FROM public.rep_vertical_enrollments e JOIN public.profiles p ON p.user_id = e.user_id
       WHERE p.status='active' AND NOT p.archived AND e.status = 'active'
         AND COALESCE(p.vertical,'') <> '' AND p.vertical <> e.vertical), '[]'::jsonb),
    'picker_gaps', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.full_name,
             'missing', CASE WHEN COALESCE(p.manager_intro,'') = '' AND COALESCE(p.mentee_capacity,0) = 0 THEN 'intro and capacity'
                             WHEN COALESCE(p.manager_intro,'') = '' THEN 'intro' ELSE 'capacity' END) ORDER BY p.full_name)
        FROM public.profiles p
       WHERE p.status='active' AND NOT p.archived AND p.accepting_new_reps
         AND (COALESCE(p.manager_intro,'') = '' OR COALESCE(p.mentee_capacity,0) = 0)), '[]'::jsonb)
  ) INTO _out;

  RETURN _out;
END;
$$;
REVOKE ALL ON FUNCTION public.get_data_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_data_health() TO authenticated, service_role;

-- ============ E. hot-path indexes ============
CREATE INDEX IF NOT EXISTS idx_profiles_status_archived ON public.profiles (status, archived);
CREATE INDEX IF NOT EXISTS idx_profiles_vertical ON public.profiles (vertical);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles (team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_rank_id ON public.profiles (rank_id);
CREATE INDEX IF NOT EXISTS idx_profiles_region_id ON public.profiles (region_id);
CREATE INDEX IF NOT EXISTS idx_fiber_installs_user_week ON public.fiber_installs (user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_rep_revenue_user_period ON public.rep_revenue (user_id, month);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages (channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_vertical ON public.rep_vertical_enrollments (user_id, vertical);