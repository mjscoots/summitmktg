-- Pass 150: the Pillar model, permanent pillar recruit links, onboarding tracker.

-- 1. Each pillar (team) belongs to one industry.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS vertical text NOT NULL DEFAULT 'Pest';

-- 2. Permanent recruit link per pillar.
CREATE TABLE IF NOT EXISTS public.pillar_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pillar_links TO authenticated;
GRANT ALL ON public.pillar_links TO service_role;
ALTER TABLE public.pillar_links ENABLE ROW LEVEL SECURITY;

-- 3. Who placed whom.
CREATE TABLE IF NOT EXISTS public.placement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  placed_by uuid,
  team_id uuid,
  manager_id uuid,
  vertical text,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.placement_log TO authenticated;
GRANT ALL ON public.placement_log TO service_role;
ALTER TABLE public.placement_log ENABLE ROW LEVEL SECURITY;

-- 4. The two manual onboarding ticks. Everything else is derived.
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step text NOT NULL CHECK (step IN ('agreement_signed','payroll_setup')),
  checked_by uuid,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step)
);
GRANT SELECT ON public.onboarding_steps TO authenticated;
GRANT ALL ON public.onboarding_steps TO service_role;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- 5. Scope helpers.
CREATE OR REPLACE FUNCTION public.can_manage_pillar(_uid uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND _team_id IS NOT NULL AND (
    public.has_role(_uid,'owner')
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.leader_id = _uid)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_in_my_system(_uid uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND _target IS NOT NULL AND (
    public.has_role(_uid,'owner')
    OR _uid = _target
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.teams t ON t.id = p.team_id
      WHERE p.user_id = _target AND t.leader_id = _uid
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _target AND p.manager_id = _uid)
    OR EXISTS (
      SELECT 1 FROM public.downline_edges e
      WHERE e.parent_user_id = _uid AND e.child_user_id = _target AND e.edge_type = 'manages'
    )
  );
$$;

-- 6. RLS built on those helpers.
DROP POLICY IF EXISTS "Pillar leaders and the owner read their pillar link" ON public.pillar_links;
CREATE POLICY "Pillar leaders and the owner read their pillar link"
  ON public.pillar_links FOR SELECT TO authenticated
  USING (public.can_manage_pillar(auth.uid(), team_id));

DROP POLICY IF EXISTS "Own system placements are readable" ON public.placement_log;
CREATE POLICY "Own system placements are readable"
  ON public.placement_log FOR SELECT TO authenticated
  USING (public.is_in_my_system(auth.uid(), user_id));

DROP POLICY IF EXISTS "Own steps and own system steps are readable" ON public.onboarding_steps;
CREATE POLICY "Own steps and own system steps are readable"
  ON public.onboarding_steps FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_in_my_system(auth.uid(), user_id));

-- 7. Pillar link read, create and regenerate.
CREATE OR REPLACE FUNCTION public.pillar_link_lookup(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'valid', true,
      'pillar_name', t.name,
      'vertical', t.vertical
    )
    FROM public.pillar_links l
    JOIN public.teams t ON t.id = l.team_id
    WHERE l.token = p_token
      AND COALESCE(t.retired, false) = false
    LIMIT 1
  ), jsonb_build_object('valid', false));
$$;

CREATE OR REPLACE FUNCTION public.pillar_link_ensure(_team_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _tok text;
BEGIN
  IF NOT public.can_manage_pillar(_uid, _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this pillar leader or the owner can do that.');
  END IF;
  SELECT token INTO _tok FROM public.pillar_links WHERE team_id = _team_id;
  IF _tok IS NULL THEN
    _tok := encode(gen_random_bytes(16), 'hex');
    INSERT INTO public.pillar_links (team_id, token, created_by) VALUES (_team_id, _tok, _uid);
  END IF;
  RETURN jsonb_build_object('success', true, 'token', _tok);
END;
$$;

CREATE OR REPLACE FUNCTION public.pillar_link_regenerate(_team_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _tok text := encode(gen_random_bytes(16), 'hex');
BEGIN
  IF NOT public.can_manage_pillar(_uid, _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this pillar leader or the owner can do that.');
  END IF;
  INSERT INTO public.pillar_links (team_id, token, created_by)
  VALUES (_team_id, _tok, _uid)
  ON CONFLICT (team_id) DO UPDATE SET token = _tok, created_by = _uid, updated_at = now();
  RETURN jsonb_build_object('success', true, 'token', _tok);
END;
$$;

-- Pillars a person leads, with their link. The owner sees every pillar.
CREATE OR REPLACE FUNCTION public.my_pillars()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'team_id', t.id,
      'name', t.name,
      'vertical', t.vertical,
      'leader_id', t.leader_id,
      'leader_name', (SELECT p.full_name FROM public.profiles p WHERE p.user_id = t.leader_id),
      'token', l.token
    ) ORDER BY t.name)
    FROM public.teams t
    LEFT JOIN public.pillar_links l ON l.team_id = t.id
    WHERE COALESCE(t.retired, false) = false
      AND auth.uid() IS NOT NULL
      AND (public.has_role(auth.uid(),'owner') OR t.leader_id = auth.uid())
  ), '[]'::jsonb);
$$;

-- 8. Place a person inside your own system.
CREATE OR REPLACE FUNCTION public.place_person(_user_id uuid, _manager_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _team uuid; _mgr_name text; _owner boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in first.');
  END IF;
  _owner := public.has_role(_uid,'owner');

  IF NOT _owner AND NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.leader_id = _uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only a pillar leader or the owner can place people.');
  END IF;
  IF NOT public.is_in_my_system(_uid, _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person is not in your system.');
  END IF;
  IF _manager_id IS NULL OR NOT public.is_in_my_system(_uid, _manager_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pick a manager from your own system.');
  END IF;
  IF _manager_id = _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'A person cannot report to themselves.');
  END IF;

  SELECT team_id, full_name INTO _team, _mgr_name FROM public.profiles WHERE user_id = _manager_id;

  UPDATE public.profiles
     SET manager_id = _manager_id,
         direct_manager = _mgr_name,
         team_id = COALESCE(_team, team_id),
         updated_at = now()
   WHERE user_id = _user_id;

  DELETE FROM public.downline_edges WHERE child_user_id = _user_id AND edge_type = 'manages';
  INSERT INTO public.downline_edges (parent_user_id, child_user_id, edge_type)
  VALUES (_manager_id, _user_id, 'manages')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.placement_log (user_id, placed_by, team_id, manager_id, action)
  VALUES (_user_id, _uid, _team, _manager_id, 'place');

  RETURN jsonb_build_object('success', true, 'manager_name', _mgr_name);
END;
$$;

-- 9. Owner only move: pillar, manager and industry.
CREATE OR REPLACE FUNCTION public.owner_move_person(_user_id uuid, _team_id uuid, _manager_id uuid, _vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _mgr_name text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid,'owner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can move people.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person no longer has a profile.');
  END IF;
  IF _manager_id = _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'A person cannot report to themselves.');
  END IF;

  IF _manager_id IS NOT NULL THEN
    SELECT full_name INTO _mgr_name FROM public.profiles WHERE user_id = _manager_id;
  END IF;

  UPDATE public.profiles
     SET team_id = COALESCE(_team_id, team_id),
         manager_id = COALESCE(_manager_id, manager_id),
         direct_manager = COALESCE(_mgr_name, direct_manager),
         updated_at = now()
   WHERE user_id = _user_id;

  IF _manager_id IS NOT NULL THEN
    DELETE FROM public.downline_edges WHERE child_user_id = _user_id AND edge_type = 'manages';
    INSERT INTO public.downline_edges (parent_user_id, child_user_id, edge_type)
    VALUES (_manager_id, _user_id, 'manages')
    ON CONFLICT DO NOTHING;
  END IF;

  IF _vertical IS NOT NULL AND EXISTS (SELECT 1 FROM public.verticals v WHERE v.vertical = _vertical) THEN
    INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
    VALUES (_user_id, _vertical, 'active', now(), now())
    ON CONFLICT (user_id, vertical) DO UPDATE
      SET status = 'active',
          activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now()),
          approved_at = COALESCE(public.rep_vertical_enrollments.approved_at, now()),
          rejected_at = NULL,
          reject_reason = NULL,
          updated_at = now();
    UPDATE public.profiles SET active_vertical = _vertical, vertical = _vertical WHERE user_id = _user_id;
  END IF;

  INSERT INTO public.placement_log (user_id, placed_by, team_id, manager_id, vertical, action)
  VALUES (_user_id, _uid, _team_id, _manager_id, _vertical, 'move');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Onboarding tracker.
CREATE OR REPLACE FUNCTION public.day_one_done(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ids AS (SELECT public.day_one_video_ids() AS v)
  SELECT CASE
    WHEN COALESCE(array_length((SELECT v FROM ids), 1), 0) = 0 THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM unnest((SELECT v FROM ids)) AS u(vid)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.video_progress vp
        WHERE vp.user_id = _user_id AND vp.video_id = u.vid AND vp.watched = true
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.onboarding_state(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (
    SELECT
      EXISTS (SELECT 1 FROM public.invites i WHERE i.joined_user_id = _user_id)
        OR EXISTS (SELECT 1 FROM public.placement_log l WHERE l.user_id = _user_id)
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user_id) AS invite_accepted,
      EXISTS (SELECT 1 FROM public.onboarding_steps o WHERE o.user_id = _user_id AND o.step = 'agreement_signed') AS agreement_signed,
      public.day_one_done(_user_id) AS training_done,
      EXISTS (SELECT 1 FROM public.onboarding_steps o WHERE o.user_id = _user_id AND o.step = 'payroll_setup') AS payroll_setup
  )
  SELECT jsonb_build_object(
    'invite_accepted', s.invite_accepted,
    'agreement_signed', s.agreement_signed,
    'training_done', s.training_done,
    'payroll_setup', s.payroll_setup,
    'fully_onboarded', (s.invite_accepted AND s.agreement_signed AND s.training_done AND s.payroll_setup),
    'done', (s.invite_accepted::int + s.agreement_signed::int + s.training_done::int + s.payroll_setup::int
             + (s.invite_accepted AND s.agreement_signed AND s.training_done AND s.payroll_setup)::int),
    'total', 5
  ) FROM s;
$$;

CREATE OR REPLACE FUNCTION public.my_onboarding_state()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN '{}'::jsonb ELSE public.onboarding_state(auth.uid()) END;
$$;

CREATE OR REPLACE FUNCTION public.set_onboarding_step(_user_id uuid, _step text, _on boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _step NOT IN ('agreement_signed','payroll_setup') THEN
    RETURN jsonb_build_object('success', false, 'error', 'That step is not a manual tick.');
  END IF;
  IF _uid IS NULL OR _uid = _user_id OR NOT public.is_in_my_system(_uid, _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this person manager, their pillar or the owner can tick that.');
  END IF;

  IF _on THEN
    INSERT INTO public.onboarding_steps (user_id, step, checked_by)
    VALUES (_user_id, _step, _uid)
    ON CONFLICT (user_id, step) DO UPDATE SET checked_by = _uid, checked_at = now(), updated_at = now();
  ELSE
    DELETE FROM public.onboarding_steps WHERE user_id = _user_id AND step = _step;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.onboarding_tracker(_vertical text, _only_active boolean)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'team_name', (SELECT t.name FROM public.teams t WHERE t.id = p.team_id),
      'manager_name', (SELECT m.full_name FROM public.profiles m WHERE m.user_id = p.manager_id),
      'last_active_at', p.last_active_at,
      'is_active', (p.last_active_at IS NOT NULL AND p.last_active_at > now() - interval '7 days'),
      'agreement_checked_by', (SELECT c.full_name FROM public.onboarding_steps o
                                JOIN public.profiles c ON c.user_id = o.checked_by
                                WHERE o.user_id = p.user_id AND o.step = 'agreement_signed'),
      'payroll_checked_by', (SELECT c.full_name FROM public.onboarding_steps o
                                JOIN public.profiles c ON c.user_id = o.checked_by
                                WHERE o.user_id = p.user_id AND o.step = 'payroll_setup'),
      'state', public.onboarding_state(p.user_id)
    ) ORDER BY p.full_name)
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL
      AND COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND p.user_id <> auth.uid()
      AND public.is_in_my_system(auth.uid(), p.user_id)
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
      AND (COALESCE(_only_active, false) = false
           OR (p.last_active_at IS NOT NULL AND p.last_active_at > now() - interval '7 days'))
  ), '[]'::jsonb);
$$;

-- 11. Pillar scoped acceptance, and the waiting list a pillar can see.
CREATE OR REPLACE FUNCTION public.accept_into_industry(_user_id uuid, _vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in first.');
  END IF;
  IF NOT (public.has_role(_uid,'owner') OR public.is_in_my_system(_uid, _user_id)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person is not in your pillar.');
  END IF;
  IF NOT public.has_role(_uid,'owner') AND NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.leader_id = _uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only a pillar leader or the owner can accept a joiner.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.verticals v WHERE v.vertical = _vertical) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That industry does not exist.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person no longer has a profile.');
  END IF;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  VALUES (_user_id, _vertical, 'active', now(), now())
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = COALESCE(public.rep_vertical_enrollments.approved_at, now()),
        rejected_at = NULL,
        reject_reason = NULL,
        updated_at = now();

  UPDATE public.profiles
     SET active_vertical = _vertical,
         vertical = COALESCE(vertical, _vertical)
   WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true, 'vertical', _vertical);
END;
$$;

CREATE OR REPLACE FUNCTION public.people_awaiting_industry()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'created_at', p.created_at,
      'invited_vertical', p.vertical,
      'team_name', (SELECT t.name FROM public.teams t WHERE t.id = p.team_id),
      'manager_name', (SELECT m.full_name FROM public.profiles m WHERE m.user_id = p.manager_id)
    ) ORDER BY p.created_at DESC)
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL
      AND COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND (public.has_role(auth.uid(),'owner') OR public.is_in_my_system(auth.uid(), p.user_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.rep_vertical_enrollments e
        WHERE e.user_id = p.user_id
          AND e.status IN ('approved','onboarding','active','paused')
      )
  ), '[]'::jsonb);
$$;

-- 12. The ladder reads Owner, Pillar, Manager, Rep.
CREATE OR REPLACE FUNCTION public.role_chips(_user_ids uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_object_agg(t.user_id::text, t.label), '{}'::jsonb)
  FROM (
    SELECT p.user_id,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'owner'::app_role) THEN 'Owner'
        WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'admin'::app_role) THEN 'Pillar'
        WHEN public.is_effective_manager(p.user_id) THEN 'Manager'
        WHEN p.rep_year IS NULL OR btrim(p.rep_year) = '' THEN NULL
        WHEN public.parse_rep_year_text(p.rep_year) >= 2 THEN 'Vet'
        ELSE 'Rookie'
      END AS label
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
      AND auth.uid() IS NOT NULL
  ) t
  WHERE t.label IS NOT NULL
$$;

-- 13. Privileges. Only the public pillar lookup is open to anon.
REVOKE ALL ON FUNCTION public.can_manage_pillar(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_in_my_system(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pillar_link_ensure(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pillar_link_regenerate(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_pillars() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_person(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_move_person(uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.day_one_done(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.onboarding_state(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_onboarding_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_onboarding_step(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.onboarding_tracker(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_into_industry(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.people_awaiting_industry() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.role_chips(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pillar_link_lookup(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_pillar(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_in_my_system(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pillar_link_ensure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pillar_link_regenerate(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_pillars() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_person(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owner_move_person(uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.day_one_done(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_state(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_onboarding_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_onboarding_step(uuid, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_tracker(text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_into_industry(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.people_awaiting_industry() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.role_chips(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pillar_link_lookup(text) TO anon, authenticated, service_role;