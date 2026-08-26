CREATE TABLE public.sales_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vertical text NOT NULL DEFAULT 'Pest',
  sold_at timestamptz NOT NULL DEFAULT now(),
  plan text,
  initial numeric,
  recurring numeric,
  frequency text,
  customer_first text,
  city text,
  notes text,
  source text NOT NULL DEFAULT 'self',
  reconciled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_log TO authenticated;
GRANT ALL ON public.sales_log TO service_role;

ALTER TABLE public.sales_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_log_select_visible" ON public.sales_log
  FOR SELECT TO authenticated
  USING (public.can_view_person(user_id) IN ('self','manager','staff'));

CREATE POLICY "sales_log_insert_own" ON public.sales_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sales_log_update_own_48h" ON public.sales_log
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND created_at > now() - interval '48 hours')
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  )
  WITH CHECK (
    (user_id = auth.uid() AND created_at > now() - interval '48 hours')
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );

CREATE POLICY "sales_log_delete_own_48h" ON public.sales_log
  FOR DELETE TO authenticated
  USING (
    (user_id = auth.uid() AND created_at > now() - interval '48 hours')
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );

CREATE INDEX sales_log_user_sold_idx ON public.sales_log (user_id, sold_at DESC);
CREATE INDEX sales_log_sold_idx ON public.sales_log (sold_at DESC);

-- Win post, points and manager notification, all server-side.
CREATE OR REPLACE FUNCTION public.sales_log_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_team uuid;
  v_slug text := 'wins';
  v_mgr uuid;
  v_earlier int;
  v_place text;
BEGIN
  SELECT full_name, team_id, manager_id INTO v_name, v_team, v_mgr
  FROM public.profiles WHERE user_id = NEW.user_id;

  IF v_team IS NOT NULL THEN
    SELECT COALESCE(public.team_channel_slug(t.name), 'wins') INTO v_slug
    FROM public.teams t WHERE t.id = v_team;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.slug = v_slug AND c.is_active) THEN
    v_slug := 'wins';
  END IF;

  v_place := COALESCE(NULLIF(TRIM(NEW.city), ''), 'the field');

  INSERT INTO public.chat_messages (user_id, channel, content, kind, ref_id, meta)
  VALUES (
    NEW.user_id,
    v_slug,
    COALESCE(v_name, 'A rep') || ' sold a ' || COALESCE(NULLIF(TRIM(NEW.plan), ''), 'plan') || ' in ' || v_place,
    'win',
    NEW.id,
    jsonb_build_object('plan', NEW.plan, 'city', NEW.city, 'source', 'sales_log')
  );

  PERFORM public.award_points_v2(NEW.user_id, 'sale', 25, jsonb_build_object('sale_id', NEW.id));

  SELECT COUNT(*) INTO v_earlier
  FROM public.sales_log s
  WHERE s.user_id = NEW.user_id
    AND s.id <> NEW.id
    AND (s.sold_at AT TIME ZONE 'America/Los_Angeles')::date
        = (NEW.sold_at AT TIME ZONE 'America/Los_Angeles')::date;

  IF v_earlier = 0 AND v_mgr IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (
      v_mgr,
      'First sale today',
      COALESCE(v_name, 'A rep') || ' logged a sale in ' || v_place,
      '/app/leaderboard'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_log_after_insert_trg
AFTER INSERT ON public.sales_log
FOR EACH ROW EXECUTE FUNCTION public.sales_log_after_insert();

GRANT EXECUTE ON FUNCTION public.sales_log_after_insert() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_log_after_insert() FROM anon;

-- Weekly self-reported standings, per rep.
CREATE OR REPLACE FUNCTION public.get_self_reported_week(p_week_start date DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  team_name text,
  sales bigint,
  revenue numeric,
  first_sale timestamptz,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH wk AS (
    SELECT COALESCE(
      p_week_start,
      (date_trunc('week', (now() AT TIME ZONE 'America/Los_Angeles'))::date)
    ) AS start
  ),
  agg AS (
    SELECT s.user_id,
           COUNT(*) AS sales,
           COALESCE(SUM(COALESCE(s.initial,0)),0) AS revenue,
           MIN(s.sold_at) AS first_sale
    FROM public.sales_log s, wk
    WHERE s.vertical = 'Pest'
      AND s.sold_at >= wk.start
      AND s.sold_at < wk.start + 7
    GROUP BY s.user_id
  )
  SELECT a.user_id,
         p.full_name,
         t.name AS team_name,
         a.sales,
         a.revenue,
         a.first_sale,
         RANK() OVER (ORDER BY a.sales DESC, a.first_sale ASC) AS rank
  FROM agg a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN public.teams t ON t.id = p.team_id
  ORDER BY a.sales DESC, a.first_sale ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_self_reported_week(date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_self_reported_week(date) TO authenticated;

-- Weekly self-reported standings, per team.
CREATE OR REPLACE FUNCTION public.get_self_reported_week_teams(p_week_start date DEFAULT NULL)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  sales bigint,
  revenue numeric,
  first_sale timestamptz,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH wk AS (
    SELECT COALESCE(
      p_week_start,
      (date_trunc('week', (now() AT TIME ZONE 'America/Los_Angeles'))::date)
    ) AS start
  ),
  agg AS (
    SELECT p.team_id,
           COUNT(*) AS sales,
           COALESCE(SUM(COALESCE(s.initial,0)),0) AS revenue,
           MIN(s.sold_at) AS first_sale
    FROM public.sales_log s
    JOIN public.profiles p ON p.user_id = s.user_id
    CROSS JOIN wk
    WHERE s.vertical = 'Pest'
      AND p.team_id IS NOT NULL
      AND s.sold_at >= wk.start
      AND s.sold_at < wk.start + 7
    GROUP BY p.team_id
  )
  SELECT a.team_id, t.name, a.sales, a.revenue, a.first_sale,
         RANK() OVER (ORDER BY a.sales DESC, a.first_sale ASC) AS rank
  FROM agg a
  LEFT JOIN public.teams t ON t.id = a.team_id
  ORDER BY a.sales DESC, a.first_sale ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_self_reported_week_teams(date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_self_reported_week_teams(date) TO authenticated;

-- Staff reconciliation view: self-reported versus imported, per rep, for a month.
CREATE OR REPLACE FUNCTION public.get_sales_reconciliation(p_month date)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  logged_sales bigint,
  logged_revenue numeric,
  imported_revenue numeric,
  reconciled boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  WITH m AS (SELECT date_trunc('month', p_month)::date AS start),
  logged AS (
    SELECT s.user_id,
           COUNT(*) AS logged_sales,
           COALESCE(SUM(COALESCE(s.initial,0)),0) AS logged_revenue,
           BOOL_AND(s.reconciled) AS reconciled
    FROM public.sales_log s, m
    WHERE s.sold_at >= m.start AND s.sold_at < (m.start + interval '1 month')
    GROUP BY s.user_id
  )
  SELECT l.user_id,
         p.full_name,
         l.logged_sales,
         l.logged_revenue,
         COALESCE((
           SELECT SUM(r.revenue) FROM public.rep_revenue r, m
           WHERE r.user_id = l.user_id AND r.month = m.start
         ), 0) AS imported_revenue,
         COALESCE(l.reconciled, false)
  FROM logged l
  LEFT JOIN public.profiles p ON p.user_id = l.user_id
  ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sales_reconciliation(date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sales_reconciliation(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_sales_reconciled(p_user_id uuid, p_month date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_start date := date_trunc('month', p_month)::date; v_n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.sales_log SET reconciled = true
  WHERE user_id = p_user_id
    AND sold_at >= v_start
    AND sold_at < (v_start + interval '1 month');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_sales_reconciled(uuid, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_sales_reconciled(uuid, date) TO authenticated;