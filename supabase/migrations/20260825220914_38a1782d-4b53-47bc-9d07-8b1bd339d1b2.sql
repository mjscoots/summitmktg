-- 1. REGIONS
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  name text NOT NULL,
  lead_user_id uuid NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical, name)
);

GRANT SELECT ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read regions" ON public.regions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage regions" ON public.regions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.regions (vertical, name) VALUES ('Fiber','East'), ('Fiber','West')
ON CONFLICT (vertical, name) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region_id uuid NULL REFERENCES public.regions(id) ON DELETE SET NULL;
ALTER TABLE public.rep_vertical_enrollments ADD COLUMN IF NOT EXISTS region_id uuid NULL REFERENCES public.regions(id) ON DELETE SET NULL;

-- 2. HELPERS
CREATE OR REPLACE FUNCTION public.region_lead_of(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id FROM public.regions r
  WHERE r.lead_user_id = _uid AND r.active = true
  ORDER BY r.name LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_vertical_lead(_uid uuid, _vertical text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _uid AND COALESCE(p.runs_vertical,false) = true
      AND COALESCE(p.vertical,'Pest') = _vertical
      AND COALESCE(p.archived,false) = false
  )
$$;

REVOKE ALL ON FUNCTION public.region_lead_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_vertical_lead(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.region_lead_of(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_vertical_lead(uuid, text) TO authenticated, service_role;

-- Region leads can see everyone in their own region
CREATE POLICY "Region leads can view their region" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    region_id IS NOT NULL
    AND region_id = public.region_lead_of(auth.uid())
  );

-- 3. ADMIN ASSIGNMENT RPCs (audit logged)
CREATE OR REPLACE FUNCTION public.admin_set_region_lead(_region_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _before uuid; _actor uuid := auth.uid(); _label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error','Not allowed');
  END IF;
  SELECT lead_user_id, vertical || ' — ' || name INTO _before, _label FROM public.regions WHERE id = _region_id;
  IF _label IS NULL THEN RETURN jsonb_build_object('success', false, 'error','Region not found'); END IF;

  UPDATE public.regions SET lead_user_id = _user_id WHERE id = _region_id;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, field, before_value, after_value)
  VALUES (_actor,
          (SELECT full_name FROM public.profiles WHERE user_id = _actor),
          'update', 'region', _region_id::text, _label, 'lead_user_id',
          (SELECT full_name FROM public.profiles WHERE user_id = _before),
          (SELECT full_name FROM public.profiles WHERE user_id = _user_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_person_region(_user_id uuid, _region_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _before uuid; _actor uuid := auth.uid(); _label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error','Not allowed');
  END IF;
  SELECT region_id, full_name INTO _before, _label FROM public.profiles WHERE user_id = _user_id;
  IF _label IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error','Person not found');
  END IF;

  UPDATE public.profiles SET region_id = _region_id WHERE user_id = _user_id;
  UPDATE public.rep_vertical_enrollments SET region_id = _region_id
   WHERE user_id = _user_id AND vertical = 'Fiber';

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, field, before_value, after_value)
  VALUES (_actor,
          (SELECT full_name FROM public.profiles WHERE user_id = _actor),
          'update', 'profile', _user_id::text, _label, 'region',
          (SELECT vertical || ' — ' || name FROM public.regions WHERE id = _before),
          (SELECT vertical || ' — ' || name FROM public.regions WHERE id = _region_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_region_lead(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_person_region(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_region_lead(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_person_region(uuid, uuid) TO authenticated, service_role;

-- 4. PICKER: region-aware deck
CREATE OR REPLACE FUNCTION public.get_eligible_managers(_vertical text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _my_region uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  SELECT region_id INTO _my_region FROM public.profiles WHERE user_id = _uid;

  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(r ORDER BY same_region DESC, (r->>'mentee_count')::int) FROM (
      SELECT jsonb_build_object(
        'user_id', pr.user_id,
        'full_name', pr.full_name,
        'avatar_url', pr.avatar_url,
        'rep_year', pr.rep_year,
        'vertical', COALESCE(pr.vertical,'Pest'),
        'runs_vertical', COALESCE(pr.runs_vertical,false),
        'intro', NULLIF(btrim(COALESCE(pr.manager_intro,'')), ''),
        'capacity', pr.mentee_capacity,
        'mentee_count', public.mentee_count(pr.user_id),
        'region_id', pr.region_id,
        'region_name', (SELECT g.name FROM public.regions g WHERE g.id = pr.region_id),
        'teams_led', COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                               FROM public.teams t WHERE t.manager_id = pr.user_id), '{}')
      ) AS r,
      (_my_region IS NOT NULL AND pr.region_id = _my_region) AS same_region
      FROM public.profiles pr
      WHERE pr.user_id <> _uid
        AND COALESCE(pr.archived,false) = false
        AND COALESCE(pr.approved,false) = true
        AND COALESCE(pr.accepting_new_reps,false) = true
        AND COALESCE(pr.vertical,'Pest') = _vertical
        AND (public.has_role(pr.user_id,'manager') OR public.has_role(pr.user_id,'admin') OR public.has_role(pr.user_id,'owner'))
        AND (pr.mentee_capacity IS NULL OR public.mentee_count(pr.user_id) < pr.mentee_capacity)
        AND NOT EXISTS (
          SELECT 1 FROM public.pairing_requests q
          WHERE q.rep_id = _uid AND q.manager_id = pr.user_id AND q.vertical = _vertical
            AND q.status = 'declined' AND q.responded_at > now() - interval '7 days'
        )
    ) x
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_pair(_vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pick uuid; _my_region uuid;
BEGIN
  SELECT region_id INTO _my_region FROM public.profiles WHERE user_id = auth.uid();

  SELECT (m->>'user_id')::uuid INTO _pick
  FROM jsonb_array_elements(public.get_eligible_managers(_vertical)->'rows') m
  ORDER BY (_my_region IS NOT NULL AND (m->>'region_id')::uuid = _my_region) DESC,
           (m->>'mentee_count')::int ASC, m->>'full_name' ASC LIMIT 1;

  IF _pick IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error','No managers are accepting new reps right now');
  END IF;
  RETURN public.request_pairing(_vertical, _pick);
END;
$$;

-- 5. STACK: regions + partner tags
CREATE OR REPLACE FUNCTION public.get_the_stack()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _out jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('verticals','[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'owner', (SELECT jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'avatar_url',p.avatar_url)
                FROM public.profiles p
                JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'owner'
               WHERE COALESCE(p.archived,false) = false
               ORDER BY p.created_at LIMIT 1),
    'verticals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', vp.vertical,
        'label', vp.label,
        'lead', (SELECT jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'avatar_url',p.avatar_url)
                   FROM public.profiles p
                  WHERE p.vertical = vp.vertical AND COALESCE(p.runs_vertical,false) = true
                    AND COALESCE(p.archived,false) = false
                  ORDER BY p.full_name LIMIT 1),
        'total_reps', (SELECT COUNT(*) FROM public.profiles p
                        WHERE p.vertical = vp.vertical AND COALESCE(p.archived,false) = false
                          AND COALESCE(p.approved,false) = true),
        'regions', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'lead', (SELECT jsonb_build_object('user_id',lp.user_id,'full_name',lp.full_name,'avatar_url',lp.avatar_url)
                       FROM public.profiles lp WHERE lp.user_id = g.lead_user_id),
            'rep_count', (SELECT COUNT(*) FROM public.profiles p
                           WHERE p.region_id = g.id AND COALESCE(p.archived,false) = false),
            'managers', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'user_id', m.user_id,
                'full_name', m.full_name,
                'avatar_url', m.avatar_url,
                'reps', COALESCE((
                  SELECT jsonb_agg(jsonb_build_object(
                    'user_id', d.user_id,
                    'full_name', d.full_name,
                    'partner_name', (SELECT pt.name FROM public.rep_vertical_enrollments e
                                      LEFT JOIN public.partners pt ON pt.id = e.partner_id
                                     WHERE e.user_id = d.user_id AND e.vertical = vp.vertical
                                       AND e.partner_id IS NOT NULL LIMIT 1)
                  ) ORDER BY d.full_name)
                  FROM public.profiles d
                  WHERE d.direct_manager = m.user_id AND COALESCE(d.archived,false) = false
                ), '[]'::jsonb)
              ) ORDER BY m.full_name)
              FROM public.profiles m
              WHERE m.region_id = g.id
                AND COALESCE(m.archived,false) = false
                AND COALESCE(m.runs_vertical,false) = false
                AND m.user_id IS DISTINCT FROM g.lead_user_id
                AND EXISTS (SELECT 1 FROM public.user_roles r
                             WHERE r.user_id = m.user_id AND r.role IN ('manager','admin'))
            ), '[]'::jsonb)
          ) ORDER BY g.name)
          FROM public.regions g
          WHERE g.vertical = vp.vertical AND g.active = true
        ), '[]'::jsonb),
        'managers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'full_name', m.full_name,
            'avatar_url', m.avatar_url,
            'accepting', COALESCE(m.accepting_new_reps,false),
            'capacity', m.mentee_capacity,
            'region_name', (SELECT g.name FROM public.regions g WHERE g.id = m.region_id),
            'mentee_count', (SELECT COUNT(*) FROM public.rep_vertical_enrollments e
                              WHERE e.paired_manager = m.user_id AND e.vertical = vp.vertical),
            'rep_count', (SELECT COUNT(*) FROM public.profiles d
                           WHERE d.direct_manager = m.user_id AND COALESCE(d.archived,false) = false)
          ) ORDER BY m.full_name)
          FROM public.profiles m
          WHERE m.vertical = vp.vertical
            AND COALESCE(m.archived,false) = false
            AND COALESCE(m.runs_vertical,false) = false
            AND m.region_id IS NULL
            AND EXISTS (SELECT 1 FROM public.user_roles r
                         WHERE r.user_id = m.user_id AND r.role IN ('manager','admin'))
        ), '[]'::jsonb)
      ) ORDER BY vp.display_order)
      FROM public.vertical_paths vp
    ), '[]'::jsonb)
  ) INTO _out;

  RETURN _out;
END;
$$;

-- 6. FIBER INSTALL REPORT
CREATE OR REPLACE FUNCTION public.get_fiber_report(_weeks integer DEFAULT 4, _region_id uuid DEFAULT NULL, _carrier_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
  _scope uuid := _region_id;
  _since date := (date_trunc('week', now())::date - ((GREATEST(COALESCE(_weeks,4),1) - 1) * 7));
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  _is_admin := public.has_role(_uid,'admin') OR public.has_role(_uid,'owner') OR public.is_vertical_lead(_uid,'Fiber');

  IF NOT _is_admin THEN
    _scope := public.region_lead_of(_uid);
    IF _scope IS NULL THEN
      RETURN jsonb_build_object('rows','[]'::jsonb,'region_totals','[]'::jsonb,'trend','[]'::jsonb);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', f.user_id,
        'full_name', p.full_name,
        'region_name', g.name,
        'carrier_name', c.name,
        'week_start', f.week_start,
        'installs', f.installs,
        'cancels', f.cancels
      ) ORDER BY f.week_start DESC, p.full_name)
      FROM public.fiber_installs f
      JOIN public.profiles p ON p.user_id = f.user_id
      LEFT JOIN public.regions g ON g.id = p.region_id
      LEFT JOIN public.carriers c ON c.id = f.carrier_id
      WHERE f.week_start >= _since
        AND COALESCE(p.archived,false) = false
        AND (_scope IS NULL OR p.region_id = _scope)
        AND (_carrier_id IS NULL OR f.carrier_id = _carrier_id)
    ), '[]'::jsonb),
    'region_totals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'region_name', COALESCE(t.name,'No region'),
        'installs', t.installs,
        'cancels', t.cancels,
        'reps', t.reps
      ) ORDER BY COALESCE(t.name,'zzz'))
      FROM (
        SELECT g.name, SUM(f.installs)::int AS installs, SUM(f.cancels)::int AS cancels,
               COUNT(DISTINCT f.user_id)::int AS reps
        FROM public.fiber_installs f
        JOIN public.profiles p ON p.user_id = f.user_id
        LEFT JOIN public.regions g ON g.id = p.region_id
        WHERE f.week_start >= _since
          AND COALESCE(p.archived,false) = false
          AND (_scope IS NULL OR p.region_id = _scope)
          AND (_carrier_id IS NULL OR f.carrier_id = _carrier_id)
        GROUP BY g.name
      ) t
    ), '[]'::jsonb),
    'trend', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'week_start', t.week_start,
        'installs', t.installs,
        'cancels', t.cancels
      ) ORDER BY t.week_start)
      FROM (
        SELECT f.week_start, SUM(f.installs)::int AS installs, SUM(f.cancels)::int AS cancels
        FROM public.fiber_installs f
        JOIN public.profiles p ON p.user_id = f.user_id
        WHERE f.week_start >= _since
          AND COALESCE(p.archived,false) = false
          AND (_scope IS NULL OR p.region_id = _scope)
          AND (_carrier_id IS NULL OR f.carrier_id = _carrier_id)
        GROUP BY f.week_start
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_fiber_report(integer, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fiber_report(integer, uuid, uuid) TO authenticated, service_role;
