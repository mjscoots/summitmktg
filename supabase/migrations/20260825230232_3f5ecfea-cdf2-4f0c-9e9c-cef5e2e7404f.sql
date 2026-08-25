CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.norm_person_name(_t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(lower(coalesce(_t, '')), '[^a-z ]', ' ', 'g'));
$$;

-- ============ import batches ============
CREATE TABLE public.revenue_import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'review',
  note text,
  period_label text,
  extracted jsonb NOT NULL DEFAULT '[]'::jsonb,
  committed_rows jsonb,
  committed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT revenue_import_batches_status_check CHECK (status IN ('review', 'committed', 'discarded'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_import_batches TO authenticated;
GRANT ALL ON public.revenue_import_batches TO service_role;
ALTER TABLE public.revenue_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage revenue import batches"
  ON public.revenue_import_batches FOR ALL TO authenticated
  USING (public.is_staff_data_reader())
  WITH CHECK (public.is_staff_data_reader());

CREATE TABLE public.revenue_import_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.revenue_import_batches(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_import_images TO authenticated;
GRANT ALL ON public.revenue_import_images TO service_role;
ALTER TABLE public.revenue_import_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage revenue import images"
  ON public.revenue_import_images FOR ALL TO authenticated
  USING (public.is_staff_data_reader())
  WITH CHECK (public.is_staff_data_reader());

CREATE TRIGGER trg_revenue_import_batches_updated
  BEFORE UPDATE ON public.revenue_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.recruiting_leads ADD COLUMN IF NOT EXISTS outreach_task_id uuid;

-- ============ fuzzy matching ============
CREATE OR REPLACE FUNCTION public.match_leaderboard_rows(_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb;
  out_rows jsonb := '[]'::jsonb;
  cands jsonb;
  nm text;
  per text;
  mo date;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_rows, '[]'::jsonb)) LOOP
    nm := public.norm_person_name(r->>'name');
    per := COALESCE(NULLIF(btrim(r->>'period'), ''), '');
    mo := CASE WHEN per ~ '^\d{4}-\d{2}$' THEN (per || '-01')::date ELSE NULL END;

    SELECT COALESCE(jsonb_agg(c ORDER BY (c->>'score')::numeric DESC), '[]'::jsonb) INTO cands
    FROM (
      SELECT jsonb_build_object(
        'kind', 'profile',
        'id', p.user_id,
        'name', p.full_name,
        'score', round(similarity(public.norm_person_name(p.full_name), nm)::numeric, 3),
        'archived', COALESCE(p.archived, false),
        'office', p.office_name,
        'manager', p.direct_manager,
        'existing_revenue', CASE
          WHEN mo IS NOT NULL THEN (SELECT rv.revenue FROM rep_revenue rv WHERE rv.user_id = p.user_id AND rv.month = mo)
          ELSE p.revenue_to_date END
      ) AS c
      FROM profiles p
      WHERE nm <> '' AND similarity(public.norm_person_name(p.full_name), nm) >= 0.35
      ORDER BY similarity(public.norm_person_name(p.full_name), nm) DESC
      LIMIT 3
    ) s;

    SELECT cands || COALESCE(jsonb_agg(c ORDER BY (c->>'score')::numeric DESC), '[]'::jsonb) INTO cands
    FROM (
      SELECT jsonb_build_object(
        'kind', 'lead',
        'id', l.id,
        'name', l.first_name,
        'score', round(similarity(public.norm_person_name(l.first_name), nm)::numeric, 3),
        'archived', true,
        'office', l.city,
        'manager', NULL,
        'existing_revenue', l.revenue_total
      ) AS c
      FROM recruiting_leads l
      WHERE nm <> ''
        AND l.status = 'Winback'
        AND similarity(public.norm_person_name(l.first_name), nm) >= 0.35
        AND (l.source_profile_id IS NULL)
      ORDER BY similarity(public.norm_person_name(l.first_name), nm) DESC
      LIMIT 2
    ) s2;

    out_rows := out_rows || jsonb_build_array(
      r || jsonb_build_object(
        'candidates', cands,
        'auto_kind', CASE
          WHEN jsonb_array_length(cands) >= 1
            AND (cands->0->>'score')::numeric >= 0.9
            AND (jsonb_array_length(cands) = 1 OR (cands->0->>'score')::numeric - (cands->1->>'score')::numeric >= 0.15)
          THEN cands->0->>'kind' END,
        'auto_id', CASE
          WHEN jsonb_array_length(cands) >= 1
            AND (cands->0->>'score')::numeric >= 0.9
            AND (jsonb_array_length(cands) = 1 OR (cands->0->>'score')::numeric - (cands->1->>'score')::numeric >= 0.15)
          THEN cands->0->>'id' END
      )
    );
  END LOOP;

  RETURN jsonb_build_object('rows', out_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_leaderboard_import(_batch_id uuid, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb;
  mo date;
  applied int := 0;
  skipped int := 0;
  leads_updated int := 0;
  existing numeric;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authorized');
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_rows, '[]'::jsonb)) LOOP
    CONTINUE WHEN (r->>'id') IS NULL OR (r->>'kind') IS NULL;

    IF (r->>'kind') = 'lead' THEN
      UPDATE recruiting_leads
         SET revenue_total = COALESCE((r->>'revenue')::numeric, revenue_total),
             last_sale_date = COALESCE(NULLIF(r->>'last_sale_date', '')::date, last_sale_date)
       WHERE id = (r->>'id')::uuid;
      leads_updated := leads_updated + 1;
      CONTINUE;
    END IF;

    IF COALESCE(btrim(r->>'period'), '') ~ '^\d{4}-\d{2}$' THEN
      mo := ((r->>'period') || '-01')::date;
      SELECT rv.revenue INTO existing FROM rep_revenue rv
        WHERE rv.user_id = (r->>'id')::uuid AND rv.month = mo;
      IF existing IS NOT NULL AND COALESCE((r->>'overwrite')::boolean, false) = false THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      INSERT INTO rep_revenue (user_id, month, revenue, serviced_amount, pending_amount, entered_by)
      VALUES (
        (r->>'id')::uuid, mo,
        COALESCE((NULLIF(r->>'revenue', ''))::numeric, 0),
        NULLIF(r->>'serviced', '')::numeric,
        NULLIF(r->>'pending_or_active', '')::numeric,
        auth.uid()
      )
      ON CONFLICT (user_id, month) DO UPDATE
        SET revenue = EXCLUDED.revenue,
            serviced_amount = COALESCE(EXCLUDED.serviced_amount, rep_revenue.serviced_amount),
            pending_amount = COALESCE(EXCLUDED.pending_amount, rep_revenue.pending_amount),
            entered_by = auth.uid(),
            updated_at = now();
      applied := applied + 1;
    ELSIF lower(COALESCE(r->>'period', '')) = 'ytd' THEN
      SELECT p.revenue_to_date INTO existing FROM profiles p WHERE p.user_id = (r->>'id')::uuid;
      IF existing IS NOT NULL AND COALESCE((r->>'overwrite')::boolean, false) = false THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      UPDATE profiles
         SET revenue_to_date = COALESCE(NULLIF(r->>'revenue', '')::numeric, revenue_to_date)
       WHERE user_id = (r->>'id')::uuid;
      applied := applied + 1;
    ELSE
      skipped := skipped + 1;
    END IF;
  END LOOP;

  IF _batch_id IS NOT NULL THEN
    UPDATE revenue_import_batches
       SET status = 'committed', committed_rows = _rows, committed_at = now()
     WHERE id = _batch_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'applied', applied, 'skipped', skipped, 'leads_updated', leads_updated);
END;
$$;

-- ============ leader scorecard ============
CREATE OR REPLACE FUNCTION public.get_leader_scorecard(_user_id uuid, _office text DEFAULT NULL, _season_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  s_start date;
  s_end date;
  allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  allowed := public.is_staff_data_reader() OR _user_id = auth.uid();

  IF NOT allowed THEN
    WITH RECURSIVE dn AS (
      SELECT e.child_user_id AS uid, 1 AS lvl FROM downline_edges e
        WHERE e.parent_user_id = auth.uid() AND e.edge_type = 'manages'
      UNION ALL
      SELECT e.child_user_id, d.lvl + 1 FROM downline_edges e
        JOIN dn d ON e.parent_user_id = d.uid
       WHERE e.edge_type = 'manages' AND d.lvl < 10
    )
    SELECT EXISTS (SELECT 1 FROM dn WHERE uid = _user_id) INTO allowed;
  END IF;

  IF NOT allowed THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  IF _season_id IS NOT NULL THEN
    SELECT starts_on, ends_on INTO s_start, s_end FROM seasons WHERE id = _season_id;
  END IF;

  WITH RECURSIVE dn AS (
    SELECT e.child_user_id AS uid, 1 AS lvl FROM downline_edges e
      WHERE e.parent_user_id = _user_id AND e.edge_type = 'manages'
    UNION ALL
    SELECT e.child_user_id, d.lvl + 1 FROM downline_edges e
      JOIN dn d ON e.parent_user_id = d.uid
     WHERE e.edge_type = 'manages' AND d.lvl < 10
  ),
  tree AS (
    SELECT p.* FROM profiles p JOIN dn ON dn.uid = p.user_id
    WHERE (_office IS NULL OR p.office_name = _office)
  ),
  rev AS (
    SELECT rv.user_id, sum(rv.revenue) AS total
    FROM rep_revenue rv JOIN tree t ON t.user_id = rv.user_id
    WHERE (s_start IS NULL OR rv.month >= date_trunc('month', s_start)::date)
      AND (s_end IS NULL OR rv.month <= s_end)
    GROUP BY rv.user_id
  ),
  own AS (
    SELECT COALESCE(sum(rv.revenue), 0) AS total FROM rep_revenue rv
    WHERE rv.user_id = _user_id
      AND (s_start IS NULL OR rv.month >= date_trunc('month', s_start)::date)
      AND (s_end IS NULL OR rv.month <= s_end)
  )
  SELECT jsonb_build_object(
    'source_tables', jsonb_build_array('downline_edges', 'profiles', 'rep_revenue'),
    'leader', (SELECT jsonb_build_object(
        'name', p.full_name, 'office', p.office_name, 'vertical', p.vertical,
        'committed_last_day', p.committed_last_day,
        'next_year_status', p.next_year_status
      ) FROM profiles p WHERE p.user_id = _user_id),
    'season', CASE WHEN _season_id IS NULL THEN NULL ELSE jsonb_build_object('starts_on', s_start, 'ends_on', s_end) END,
    'office_filter', _office,
    'recruited', (SELECT count(*) FROM tree),
    'showed_up', (SELECT count(*) FROM tree WHERE showed_up_date IS NOT NULL),
    'active_now', (SELECT count(*) FROM tree WHERE COALESCE(archived, false) = false),
    'departed', (SELECT count(*) FROM tree WHERE COALESCE(archived, false) = true),
    'departed_fired', (SELECT count(*) FROM tree WHERE COALESCE(archived, false) AND departure_type = 'fired'),
    'departed_quit', (SELECT count(*) FROM tree WHERE COALESCE(archived, false) AND departure_type = 'quit'),
    'departed_unknown', (SELECT count(*) FROM tree WHERE COALESCE(archived, false) AND COALESCE(departure_type, 'unknown') NOT IN ('fired', 'quit')),
    'tree_revenue', (SELECT COALESCE(sum(total), 0) FROM rev),
    'tree_revenue_months', (SELECT count(*) FROM rev),
    'own_revenue', (SELECT total FROM own),
    'committed_coverage_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(committed_last_day) / count(*)) END
      FROM tree WHERE COALESCE(archived, false) = false),
    'committed_missing', (SELECT count(*) FROM tree WHERE COALESCE(archived, false) = false AND committed_last_day IS NULL),
    'next_season', (
      SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (
        SELECT COALESCE(next_year_status, 'no_answer') AS k, count(*) AS c
        FROM tree WHERE COALESCE(archived, false) = false GROUP BY 1
      ) q)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaders_list()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  SELECT jsonb_build_object(
    'source_tables', jsonb_build_array('profiles', 'downline_edges'),
    'leaders', COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', x.user_id,
      'name', x.full_name,
      'office', x.office_name,
      'vertical', x.vertical,
      'tree_size', x.tree_size
    ) ORDER BY x.tree_size DESC, x.full_name), '[]'::jsonb)
  ) INTO result
  FROM (
    SELECT p.user_id, p.full_name, p.office_name, p.vertical,
      (SELECT count(*) FROM downline_edges e WHERE e.parent_user_id = p.user_id AND e.edge_type = 'manages') AS tree_size
    FROM profiles p
    WHERE COALESCE(p.archived, false) = false
      AND EXISTS (SELECT 1 FROM downline_edges e WHERE e.parent_user_id = p.user_id AND e.edge_type = 'manages')
  ) x;

  RETURN result;
END;
$$;

-- ============ under-led ============
CREATE OR REPLACE FUNCTION public.get_under_led(_max_weeks numeric DEFAULT NULL, _min_revenue numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  mw numeric;
  mr numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  mw := COALESCE(_max_weeks, NULLIF((SELECT value FROM app_settings WHERE key = 'under_led_max_weeks'), '')::numeric, 8);
  mr := COALESCE(_min_revenue, NULLIF((SELECT value FROM app_settings WHERE key = 'under_led_min_revenue'), '')::numeric);

  SELECT jsonb_build_object(
    'source_tables', jsonb_build_array('recruiting_leads', 'profiles'),
    'max_weeks', mw,
    'min_revenue', mr,
    'not_in_outreach', count(*) FILTER (WHERE outreach_task_id IS NULL),
    'people', COALESCE(jsonb_agg(jsonb_build_object(
      'lead_id', lead_id,
      'name', name,
      'revenue_total', revenue_total,
      'weeks_active', weeks_active,
      'revenue_per_week', revenue_per_week,
      'last_sale_date', last_sale_date,
      'former_manager', former_manager,
      'departure_type', departure_type,
      'departure_reason', departure_reason,
      'story', story,
      'in_outreach', outreach_task_id IS NOT NULL
    ) ORDER BY revenue_per_week DESC NULLS LAST), '[]'::jsonb)
  ) INTO result
  FROM (
    SELECT l.id AS lead_id, l.first_name AS name, l.revenue_total, l.weeks_active,
      CASE WHEN l.weeks_active IS NOT NULL AND l.weeks_active > 0 AND l.revenue_total IS NOT NULL
        THEN round(l.revenue_total / l.weeks_active, 2) END AS revenue_per_week,
      l.last_sale_date, l.story, l.outreach_task_id,
      p.direct_manager AS former_manager, p.departure_type, p.departure_reason
    FROM recruiting_leads l
    LEFT JOIN profiles p ON p.id = l.source_profile_id
    WHERE l.status = 'Winback'
      AND (l.weeks_active IS NULL OR l.weeks_active <= mw)
      AND (mr IS NULL OR COALESCE(l.revenue_total, 0) >= mr)
  ) q;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_data_under_led()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;
  RETURN public.get_under_led(NULL, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_under_led_outreach(_lead_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_id uuid;
  lead_row record;
  new_id uuid;
  t text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authorized');
  END IF;

  SELECT * INTO lead_row FROM recruiting_leads WHERE id = _lead_id AND status = 'Winback';
  IF lead_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'that name is not on the win-back board');
  END IF;
  IF lead_row.outreach_task_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already in outreach');
  END IF;

  SELECT ur.user_id INTO owner_id FROM user_roles ur WHERE ur.role = 'owner' ORDER BY ur.user_id LIMIT 1;
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no owner account to assign to');
  END IF;

  t := 'Under-led win-back call: ' || COALESCE(lead_row.first_name, 'unnamed');
  IF COALESCE(btrim(lead_row.story), '') <> '' THEN
    t := t || ' — ' || btrim(lead_row.story);
  END IF;

  INSERT INTO action_items (title, assigned_to, created_by, source, status)
  VALUES (left(t, 500), owner_id, auth.uid(), 'manual', 'open')
  RETURNING id INTO new_id;

  UPDATE recruiting_leads SET outreach_task_id = new_id WHERE id = _lead_id;

  RETURN jsonb_build_object('success', true, 'action_item_id', new_id);
END;
$$;

-- fix stale column reference in the older text import matcher
CREATE OR REPLACE FUNCTION public.match_revenue_import(_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out_rows jsonb := '[]'::jsonb; r jsonb; hit record; cnt int;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_rows, '[]'::jsonb)) LOOP
    SELECT count(*) INTO cnt FROM profiles p
    WHERE COALESCE(p.archived, false) = false
      AND lower(trim(p.full_name)) = lower(trim(r->>'name'));

    IF cnt = 1 THEN
      SELECT p.user_id, p.full_name INTO hit FROM profiles p
      WHERE COALESCE(p.archived, false) = false
        AND lower(trim(p.full_name)) = lower(trim(r->>'name'));
      out_rows := out_rows || jsonb_build_array(r || jsonb_build_object('user_id', hit.user_id, 'matched_name', hit.full_name));
    ELSE
      out_rows := out_rows || jsonb_build_array(r || jsonb_build_object('user_id', NULL, 'matched_name', NULL));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('rows', out_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.match_leaderboard_rows(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_leaderboard_import(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_leader_scorecard(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_leaders_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_under_led(numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_under_led_outreach(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.match_leaderboard_rows(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_leaderboard_import(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leader_scorecard(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leaders_list() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_under_led(numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_under_led_outreach(uuid) TO authenticated, service_role;