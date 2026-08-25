-- 1. Revenue table
CREATE TABLE IF NOT EXISTS public.rep_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  serviced_amount numeric(12,2),
  pending_amount numeric(12,2),
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_revenue TO authenticated;
GRANT ALL ON public.rep_revenue TO service_role;

ALTER TABLE public.rep_revenue ENABLE ROW LEVEL SECURITY;

-- downline helper (security definer, avoids recursive policy problems)
CREATE OR REPLACE FUNCTION public.is_in_my_downline(_child uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE dl AS (
    SELECT e.child_user_id AS uid, 1 AS lvl
    FROM downline_edges e
    WHERE e.parent_user_id = auth.uid() AND e.edge_type = 'manages'
    UNION ALL
    SELECT e.child_user_id, d.lvl + 1
    FROM downline_edges e
    JOIN dl d ON e.parent_user_id = d.uid
    WHERE e.edge_type = 'manages' AND d.lvl < 10
  )
  SELECT EXISTS (SELECT 1 FROM dl WHERE uid = _child)
$$;
REVOKE EXECUTE ON FUNCTION public.is_in_my_downline(uuid) FROM anon;

CREATE POLICY "Reps read own revenue" ON public.rep_revenue
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Managers read downline revenue" ON public.rep_revenue
FOR SELECT TO authenticated
USING (public.is_in_my_downline(user_id));

CREATE POLICY "Staff read all revenue" ON public.rep_revenue
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Staff write revenue" ON public.rep_revenue
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE TRIGGER update_rep_revenue_updated_at
BEFORE UPDATE ON public.rep_revenue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- season goal setting
INSERT INTO public.app_settings (key, value)
VALUES ('season_revenue_goal', '')
ON CONFLICT (key) DO NOTHING;

-- 2. Admin entry / read RPCs
CREATE OR REPLACE FUNCTION public.get_revenue_month(_month date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m date := date_trunc('month', _month)::date; res jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;

  SELECT jsonb_build_object('month', m, 'rows', COALESCE(jsonb_agg(x ORDER BY x->>'full_name'), '[]'::jsonb))
  INTO res
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'office', o.name,
      'vertical', COALESCE(p.vertical,'Pest'),
      'revenue', r.revenue,
      'serviced_amount', r.serviced_amount,
      'pending_amount', r.pending_amount
    ) AS x
    FROM profiles p
    LEFT JOIN offices o ON o.id = p.office_id
    LEFT JOIN rep_revenue r ON r.user_id = p.user_id AND r.month = m
    WHERE COALESCE(p.is_archived,false) = false
  ) s;

  RETURN res;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_revenue_month(date) FROM anon;

CREATE OR REPLACE FUNCTION public.upsert_rep_revenue(
  _user_id uuid, _month date, _revenue numeric,
  _serviced numeric DEFAULT NULL, _pending numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date := date_trunc('month', _month)::date;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authorized'); END IF;

  INSERT INTO rep_revenue (user_id, month, revenue, serviced_amount, pending_amount, entered_by)
  VALUES (_user_id, m, COALESCE(_revenue,0), _serviced, _pending, auth.uid())
  ON CONFLICT (user_id, month) DO UPDATE
    SET revenue = COALESCE(EXCLUDED.revenue,0),
        serviced_amount = EXCLUDED.serviced_amount,
        pending_amount = EXCLUDED.pending_amount,
        entered_by = auth.uid(),
        updated_at = now();

  RETURN jsonb_build_object('success', true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.upsert_rep_revenue(uuid, date, numeric, numeric, numeric) FROM anon;

CREATE OR REPLACE FUNCTION public.match_revenue_import(_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out_rows jsonb := '[]'::jsonb; r jsonb; hit record; cnt int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_rows,'[]'::jsonb)) LOOP
    SELECT count(*) INTO cnt FROM profiles p
    WHERE COALESCE(p.is_archived,false) = false
      AND lower(trim(p.full_name)) = lower(trim(r->>'name'));

    IF cnt = 1 THEN
      SELECT p.user_id, p.full_name INTO hit FROM profiles p
      WHERE COALESCE(p.is_archived,false) = false
        AND lower(trim(p.full_name)) = lower(trim(r->>'name'));
      out_rows := out_rows || jsonb_build_array(r || jsonb_build_object('user_id', hit.user_id, 'matched_name', hit.full_name));
    ELSE
      out_rows := out_rows || jsonb_build_array(r || jsonb_build_object('user_id', NULL, 'matched_name', NULL));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('rows', out_rows);
END; $$;
REVOKE EXECUTE ON FUNCTION public.match_revenue_import(jsonb) FROM anon;

CREATE OR REPLACE FUNCTION public.apply_revenue_import(_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; applied int := 0; m date;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authorized'); END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_rows,'[]'::jsonb)) LOOP
    CONTINUE WHEN (r->>'user_id') IS NULL OR (r->>'month') IS NULL;
    m := date_trunc('month', (r->>'month')::date)::date;

    INSERT INTO rep_revenue (user_id, month, revenue, entered_by)
    VALUES ((r->>'user_id')::uuid, m, COALESCE((r->>'revenue')::numeric, 0), auth.uid())
    ON CONFLICT (user_id, month) DO UPDATE
      SET revenue = COALESCE(EXCLUDED.revenue,0), entered_by = auth.uid(), updated_at = now();

    applied := applied + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'applied', applied);
END; $$;
REVOKE EXECUTE ON FUNCTION public.apply_revenue_import(jsonb) FROM anon;

-- rep + manager views
CREATE OR REPLACE FUNCTION public.get_my_revenue()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'month', r.month, 'revenue', r.revenue,
        'serviced_amount', r.serviced_amount, 'pending_amount', r.pending_amount
      ) ORDER BY r.month DESC)
      FROM rep_revenue r WHERE r.user_id = auth.uid()
    ), '[]'::jsonb)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_revenue() FROM anon;

CREATE OR REPLACE FUNCTION public.get_team_revenue()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb; staff boolean;
BEGIN
  IF NOT (has_role(auth.uid(),'manager') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  staff := has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner');

  SELECT jsonb_build_object('rows', COALESCE(jsonb_agg(x ORDER BY x->>'month' DESC, x->>'full_name'), '[]'::jsonb))
  INTO res
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id, 'full_name', p.full_name, 'avatar_url', p.avatar_url,
      'month', r.month, 'revenue', r.revenue,
      'serviced_amount', r.serviced_amount, 'pending_amount', r.pending_amount
    ) AS x
    FROM rep_revenue r
    JOIN profiles p ON p.user_id = r.user_id
    WHERE staff OR public.is_in_my_downline(r.user_id)
  ) s;

  RETURN res;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_team_revenue() FROM anon;

-- 3. Region pace
CREATE OR REPLACE FUNCTION public.get_region_pace()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total numeric; goal numeric; months int; recent numeric;
  by_office jsonb; by_vertical jsonb; row_count int; last_month date; first_month date;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;

  SELECT count(*), min(month), max(month) INTO row_count, first_month, last_month FROM rep_revenue;
  IF row_count = 0 THEN
    RETURN jsonb_build_object('has_data', false);
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(serviced_amount,0) + COALESCE(pending_amount,0), revenue)), 0)
  INTO total FROM rep_revenue;

  SELECT NULLIF(value,'')::numeric INTO goal FROM app_settings WHERE key = 'season_revenue_goal';

  months := GREATEST(1, (EXTRACT(YEAR FROM last_month)::int - EXTRACT(YEAR FROM first_month)::int) * 12
            + (EXTRACT(MONTH FROM last_month)::int - EXTRACT(MONTH FROM first_month)::int) + 1);
  recent := total / months;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'total', t) ORDER BY t DESC), '[]'::jsonb)
  INTO by_office
  FROM (
    SELECT COALESCE(o.name, 'No office') AS label,
           SUM(GREATEST(COALESCE(r.serviced_amount,0) + COALESCE(r.pending_amount,0), r.revenue)) AS t
    FROM rep_revenue r
    JOIN profiles p ON p.user_id = r.user_id
    LEFT JOIN offices o ON o.id = p.office_id
    GROUP BY 1
  ) a;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'total', t) ORDER BY t DESC), '[]'::jsonb)
  INTO by_vertical
  FROM (
    SELECT COALESCE(p.vertical, 'Pest') AS label,
           SUM(GREATEST(COALESCE(r.serviced_amount,0) + COALESCE(r.pending_amount,0), r.revenue)) AS t
    FROM rep_revenue r
    JOIN profiles p ON p.user_id = r.user_id
    GROUP BY 1
  ) b;

  RETURN jsonb_build_object(
    'has_data', true,
    'total', total,
    'goal', goal,
    'months_recorded', months,
    'monthly_average', recent,
    'projection', total + recent,
    'first_month', first_month,
    'last_month', last_month,
    'by_office', by_office,
    'by_vertical', by_vertical
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_region_pace() FROM anon;

-- 4. Session prep sheet
CREATE OR REPLACE FUNCTION public.get_session_prep(_since date DEFAULT (CURRENT_DATE - 30))
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;

  SELECT jsonb_build_object(
    'since', _since,
    'new_reps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('full_name', p.full_name, 'created_at', p.created_at) ORDER BY p.created_at DESC)
      FROM profiles p
      WHERE COALESCE(p.is_archived,false) = false AND p.created_at::date >= _since
    ), '[]'::jsonb),
    'departed', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'full_name', p.full_name, 'departure_type', p.departure_type,
        'departure_reason', p.departure_reason, 'last_day_worked', p.last_day_worked,
        'revenue_to_date', p.revenue_to_date) ORDER BY p.last_day_worked DESC NULLS LAST)
      FROM profiles p
      WHERE COALESCE(p.is_archived,false) = true
        AND COALESCE(p.last_day_worked, p.updated_at::date) >= _since
    ), '[]'::jsonb),
    'active_by_office', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', label, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT COALESCE(o.name,'No office') AS label, count(*) AS c
        FROM profiles p LEFT JOIN offices o ON o.id = p.office_id
        WHERE COALESCE(p.is_archived,false) = false GROUP BY 1
      ) x
    ), '[]'::jsonb),
    'active_by_vertical', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', label, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT COALESCE(p.vertical,'Pest') AS label, count(*) AS c
        FROM profiles p WHERE COALESCE(p.is_archived,false) = false GROUP BY 1
      ) y
    ), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'ever_on_roster', (SELECT count(*) FROM profiles),
      'active', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = false),
      'departed', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = true),
      'quit', (SELECT count(*) FROM profiles WHERE departure_type = 'Quit'),
      'fired', (SELECT count(*) FROM profiles WHERE departure_type = 'Fired'),
      'home_early', (SELECT count(*) FROM profiles WHERE departure_type = 'Went home early'),
      'unknown', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = true AND (departure_type IS NULL OR departure_type = 'Unknown'))
    ),
    'resigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', COALESCE(next_year_status,'No answer'), 'count', c) ORDER BY c DESC)
      FROM (
        SELECT next_year_status, count(*) AS c FROM profiles
        WHERE COALESCE(is_archived,false) = false GROUP BY 1
      ) z
    ), '[]'::jsonb),
    'commitment_coverage', jsonb_build_object(
      'done', (SELECT count(DISTINCT rep_user_id) FROM commitment_interviews),
      'active', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = false),
      'no_committed_date', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = false AND committed_last_day IS NULL)
    ),
    'winback', jsonb_build_object(
      'contacted', (SELECT count(*) FROM winback_contacts WHERE created_at::date >= _since),
      'returning', (SELECT count(*) FROM recruiting_leads WHERE status = 'Returning')
    ),
    'attendance', COALESCE((
      SELECT jsonb_build_object(
        'marked', count(*),
        'present', count(*) FILTER (WHERE present),
        'rate', ROUND(100.0 * count(*) FILTER (WHERE present) / GREATEST(count(*),1), 1))
      FROM calendar_attendance ca
      JOIN calendar_events e ON e.id = ca.event_id
      WHERE e.event_date >= _since
    ), '{}'::jsonb),
    'my_action_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', a.title, 'due_date', a.due_date) ORDER BY a.due_date NULLS LAST)
      FROM action_items a
      WHERE a.owner_user_id = auth.uid() AND COALESCE(a.completed,false) = false
    ), '[]'::jsonb),
    'revenue', (SELECT CASE WHEN EXISTS (SELECT 1 FROM rep_revenue)
      THEN jsonb_build_object(
        'total', (SELECT SUM(GREATEST(COALESCE(serviced_amount,0)+COALESCE(pending_amount,0), revenue)) FROM rep_revenue),
        'goal', (SELECT NULLIF(value,'')::numeric FROM app_settings WHERE key = 'season_revenue_goal'))
      ELSE NULL END)
  ) INTO res;

  RETURN res;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_session_prep(date) FROM anon;