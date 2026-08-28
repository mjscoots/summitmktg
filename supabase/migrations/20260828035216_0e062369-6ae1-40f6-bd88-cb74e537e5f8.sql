-- 1) Fiber weekly pay table
CREATE TABLE public.fiber_pay_weeks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  gross numeric,
  overrides numeric,
  costs numeric,
  batch_id uuid,
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT ON public.fiber_pay_weeks TO authenticated;
GRANT ALL ON public.fiber_pay_weeks TO service_role;

ALTER TABLE public.fiber_pay_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own fiber pay weeks are readable"
ON public.fiber_pay_weeks FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff and managers read fiber pay weeks"
ON public.fiber_pay_weeks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner') OR public.is_in_my_downline(user_id));

CREATE TRIGGER update_fiber_pay_weeks_updated_at
BEFORE UPDATE ON public.fiber_pay_weeks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Batch bookkeeping
ALTER TABLE public.revenue_import_batches
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'pest_revenue',
  ADD COLUMN IF NOT EXISTS prior_rows jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.fiber_installs ADD COLUMN IF NOT EXISTS batch_id uuid;
ALTER TABLE public.rep_revenue ADD COLUMN IF NOT EXISTS batch_id uuid;

CREATE INDEX IF NOT EXISTS fiber_installs_batch_idx ON public.fiber_installs(batch_id);
CREATE INDEX IF NOT EXISTS rep_revenue_batch_idx ON public.rep_revenue(batch_id);
CREATE INDEX IF NOT EXISTS fiber_pay_weeks_batch_idx ON public.fiber_pay_weeks(batch_id);

-- 3) Fiber weekly sheet ingestion
CREATE OR REPLACE FUNCTION public.ingest_fiber_week(batch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _mgr boolean;
  _batch_id uuid;
  _carrier uuid;
  _rows jsonb := COALESCE(batch->'rows','[]'::jsonb);
  r jsonb;
  _t uuid;
  _wk date;
  _prior jsonb := '[]'::jsonb;
  _applied int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  _staff := has_role(_uid,'admin') OR has_role(_uid,'owner');
  _mgr := has_role(_uid,'manager');
  IF NOT (_staff OR _mgr) THEN RAISE EXCEPTION 'not authorized'; END IF;

  _carrier := NULLIF(batch->>'carrier_id','')::uuid;
  IF _carrier IS NULL THEN
    SELECT c.id INTO _carrier FROM carriers c WHERE c.vertical='Fiber' AND c.active ORDER BY c.name LIMIT 1;
  END IF;
  IF _carrier IS NULL THEN RAISE EXCEPTION 'no fiber carrier configured'; END IF;

  INSERT INTO revenue_import_batches (created_by, status, kind, period_label, note, extracted)
  VALUES (_uid, 'committed', 'fiber_week', batch->>'period_label', batch->>'note', _rows)
  RETURNING id INTO _batch_id;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _t := NULLIF(r->>'user_id','')::uuid;
    _wk := NULLIF(r->>'week_start','')::date;
    CONTINUE WHEN _t IS NULL OR _wk IS NULL;
    IF NOT _staff AND NOT is_in_my_downline(_t) AND _t <> _uid THEN
      RAISE EXCEPTION 'not authorized for one or more reps';
    END IF;

    _prior := _prior || jsonb_build_array(jsonb_build_object(
      'user_id', _t, 'week_start', _wk,
      'installs', (SELECT fi.installs FROM fiber_installs fi WHERE fi.user_id=_t AND fi.carrier_id=_carrier AND fi.week_start=_wk),
      'cancels', (SELECT fi.cancels FROM fiber_installs fi WHERE fi.user_id=_t AND fi.carrier_id=_carrier AND fi.week_start=_wk),
      'pay', (SELECT to_jsonb(fp) FROM fiber_pay_weeks fp WHERE fp.user_id=_t AND fp.week_start=_wk)
    ));

    INSERT INTO fiber_installs (user_id, carrier_id, week_start, installs, cancels, entered_by, batch_id)
    VALUES (_t, _carrier, _wk, COALESCE((r->>'installs')::int,0), COALESCE((r->>'cancels')::int,0), _uid, _batch_id)
    ON CONFLICT (user_id, carrier_id, week_start) DO UPDATE
      SET installs = EXCLUDED.installs, cancels = EXCLUDED.cancels,
          entered_by = _uid, batch_id = _batch_id, updated_at = now();

    INSERT INTO fiber_pay_weeks (user_id, week_start, gross, overrides, costs, batch_id, entered_by)
    VALUES (_t, _wk, NULLIF(r->>'gross','')::numeric, NULLIF(r->>'overrides','')::numeric,
            NULLIF(r->>'costs','')::numeric, _batch_id, _uid)
    ON CONFLICT (user_id, week_start) DO UPDATE
      SET gross = EXCLUDED.gross, overrides = EXCLUDED.overrides, costs = EXCLUDED.costs,
          batch_id = _batch_id, entered_by = _uid, updated_at = now();

    _applied := _applied + 1;
  END LOOP;

  UPDATE revenue_import_batches
    SET prior_rows = _prior, committed_rows = _rows, committed_at = now(), updated_at = now()
    WHERE id = _batch_id;

  RETURN jsonb_build_object('success', true, 'batch_id', _batch_id, 'applied', _applied);
END; $$;

-- 4) Pest revenue ingestion
CREATE OR REPLACE FUNCTION public.ingest_pest_revenue(batch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _batch_id uuid;
  _rows jsonb := COALESCE(batch->'rows','[]'::jsonb);
  r jsonb;
  _t uuid;
  _m date;
  _prior jsonb := '[]'::jsonb;
  _applied int := 0;
BEGIN
  IF _uid IS NULL OR NOT (has_role(_uid,'admin') OR has_role(_uid,'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO revenue_import_batches (created_by, status, kind, period_label, note, extracted)
  VALUES (_uid, 'committed', 'pest_revenue', batch->>'period_label', batch->>'note', _rows)
  RETURNING id INTO _batch_id;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _t := NULLIF(r->>'user_id','')::uuid;
    _m := date_trunc('month', NULLIF(r->>'month','')::date)::date;
    CONTINUE WHEN _t IS NULL OR _m IS NULL;

    _prior := _prior || jsonb_build_array(jsonb_build_object(
      'user_id', _t, 'month', _m,
      'row', (SELECT to_jsonb(rr) FROM rep_revenue rr WHERE rr.user_id=_t AND rr.month=_m)
    ));

    INSERT INTO rep_revenue (user_id, month, revenue, serviced_amount, entered_by, batch_id)
    VALUES (_t, _m, NULLIF(r->>'revenue','')::numeric, NULLIF(r->>'serviced_amount','')::numeric, _uid, _batch_id)
    ON CONFLICT (user_id, month) DO UPDATE
      SET revenue = EXCLUDED.revenue,
          serviced_amount = COALESCE(EXCLUDED.serviced_amount, rep_revenue.serviced_amount),
          entered_by = _uid, batch_id = _batch_id, updated_at = now();

    _applied := _applied + 1;
  END LOOP;

  UPDATE revenue_import_batches
    SET prior_rows = _prior, committed_rows = _rows, committed_at = now(), updated_at = now()
    WHERE id = _batch_id;

  RETURN jsonb_build_object('success', true, 'batch_id', _batch_id, 'applied', _applied);
END; $$;

-- 5) Undo one batch
CREATE OR REPLACE FUNCTION public.undo_import_batch(_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _b record;
  p jsonb;
  _t uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  _staff := has_role(_uid,'admin') OR has_role(_uid,'owner');
  SELECT * INTO _b FROM revenue_import_batches WHERE id = _batch_id;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'batch not found'; END IF;
  IF NOT _staff AND _b.created_by <> _uid THEN RAISE EXCEPTION 'not authorized'; END IF;

  FOR p IN SELECT * FROM jsonb_array_elements(COALESCE(_b.prior_rows,'[]'::jsonb)) LOOP
    _t := (p->>'user_id')::uuid;
    IF _b.kind = 'fiber_week' THEN
      IF (p->>'installs') IS NULL THEN
        DELETE FROM fiber_installs WHERE user_id=_t AND week_start=(p->>'week_start')::date AND batch_id=_batch_id;
      ELSE
        UPDATE fiber_installs SET installs=(p->>'installs')::int, cancels=COALESCE((p->>'cancels')::int,0),
               batch_id=NULL, updated_at=now()
         WHERE user_id=_t AND week_start=(p->>'week_start')::date AND batch_id=_batch_id;
      END IF;

      IF (p->'pay') IS NULL OR p->'pay' = 'null'::jsonb THEN
        DELETE FROM fiber_pay_weeks WHERE user_id=_t AND week_start=(p->>'week_start')::date AND batch_id=_batch_id;
      ELSE
        UPDATE fiber_pay_weeks SET gross=(p->'pay'->>'gross')::numeric,
               overrides=(p->'pay'->>'overrides')::numeric, costs=(p->'pay'->>'costs')::numeric,
               batch_id=NULLIF(p->'pay'->>'batch_id','')::uuid, updated_at=now()
         WHERE user_id=_t AND week_start=(p->>'week_start')::date AND batch_id=_batch_id;
      END IF;
    ELSE
      IF (p->'row') IS NULL OR p->'row' = 'null'::jsonb THEN
        DELETE FROM rep_revenue WHERE user_id=_t AND month=(p->>'month')::date AND batch_id=_batch_id;
      ELSE
        UPDATE rep_revenue SET revenue=(p->'row'->>'revenue')::numeric,
               serviced_amount=(p->'row'->>'serviced_amount')::numeric,
               batch_id=NULLIF(p->'row'->>'batch_id','')::uuid, updated_at=now()
         WHERE user_id=_t AND month=(p->>'month')::date AND batch_id=_batch_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE revenue_import_batches SET status='reversed', updated_at=now() WHERE id=_batch_id;
  RETURN jsonb_build_object('success', true);
END; $$;

-- 6) Batch list for the admin screens
CREATE OR REPLACE FUNCTION public.get_import_batches(_kind text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', b.id, 'kind', b.kind, 'status', b.status,
      'period_label', b.period_label, 'note', b.note,
      'rows', jsonb_array_length(COALESCE(b.committed_rows,'[]'::jsonb)),
      'created_at', b.created_at, 'created_by_name', p.full_name
    ) AS x
    FROM revenue_import_batches b
    LEFT JOIN profiles p ON p.user_id = b.created_by
    WHERE b.kind = _kind
      AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner') OR b.created_by = auth.uid())
    ORDER BY b.created_at DESC
    LIMIT 25
  ) s
$$;

-- 7) Last-loaded dates for the truth labels
CREATE OR REPLACE FUNCTION public.get_money_sources()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'fiber_loaded_at', (SELECT max(committed_at) FROM revenue_import_batches WHERE kind='fiber_week' AND status='committed'),
    'pest_loaded_at', (SELECT max(committed_at) FROM revenue_import_batches WHERE kind='pest_revenue' AND status='committed')
  )
$$;

REVOKE ALL ON FUNCTION public.ingest_fiber_week(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.ingest_pest_revenue(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.undo_import_batch(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_import_batches(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ingest_fiber_week(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_pest_revenue(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_import_batch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_import_batches(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_money_sources() TO authenticated;