-- ---------- public calculator chips ----------
CREATE TABLE IF NOT EXISTS public.public_calc_chips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  value integer NOT NULL,
  label text,
  display_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_calc_chips TO authenticated;
GRANT ALL ON public.public_calc_chips TO service_role;
ALTER TABLE public.public_calc_chips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calc_chips_read" ON public.public_calc_chips;
CREATE POLICY "calc_chips_read" ON public.public_calc_chips FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "calc_chips_admin_write" ON public.public_calc_chips;
CREATE POLICY "calc_chips_admin_write" ON public.public_calc_chips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

INSERT INTO public.public_calc_chips (vertical, value, display_order)
SELECT v, x.val, x.ord FROM (VALUES ('Pest'),('Fiber')) AS t(v),
  (VALUES (5,1),(10,2),(15,3),(20,4)) AS x(val, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.public_calc_chips c WHERE c.vertical = t.v AND c.value = x.val);

-- ---------- public pay scales (public site only) ----------
CREATE TABLE IF NOT EXISTS public.public_pay_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  vertical text NOT NULL DEFAULT 'Pest',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.public_pay_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id uuid NOT NULL REFERENCES public.public_pay_scales(id) ON DELETE CASCADE,
  min_revenue numeric NOT NULL,
  max_revenue numeric,
  rate numeric NOT NULL,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_pay_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_pay_bands TO authenticated;
GRANT ALL ON public.public_pay_scales TO service_role;
GRANT ALL ON public.public_pay_bands TO service_role;
ALTER TABLE public.public_pay_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_pay_bands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pay_scales_read" ON public.public_pay_scales;
CREATE POLICY "pay_scales_read" ON public.public_pay_scales FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pay_scales_admin_write" ON public.public_pay_scales;
CREATE POLICY "pay_scales_admin_write" ON public.public_pay_scales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
DROP POLICY IF EXISTS "pay_bands_read" ON public.public_pay_bands;
CREATE POLICY "pay_bands_read" ON public.public_pay_bands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pay_bands_admin_write" ON public.public_pay_bands;
CREATE POLICY "pay_bands_admin_write" ON public.public_pay_bands FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

INSERT INTO public.public_pay_scales (key, label, vertical)
VALUES ('rookie_2027', '2027 season — Rookie (ECH-01)', 'Pest')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO public.public_pay_bands (scale_id, min_revenue, max_revenue, rate, display_order)
SELECT s.id, b.mn, b.mx, b.rate, b.ord
FROM public.public_pay_scales s,
  (VALUES
    (0, 74999, 0.18, 1),
    (75000, 124999, 0.24, 2),
    (125000, 174999, 0.28, 3),
    (175000, 249999, 0.32, 4),
    (250000, 399999, 0.40, 5),
    (400000, 499999, 0.52, 6),
    (500000, 599999, 0.58, 7),
    (600000, NULL, 0.65, 8)
  ) AS b(mn, mx, rate, ord)
WHERE s.key = 'rookie_2027'
  AND NOT EXISTS (SELECT 1 FROM public.public_pay_bands pb WHERE pb.scale_id = s.id);

-- ---------- settings ----------
INSERT INTO public.app_settings (key, value)
VALUES
  ('calc_avg_contract_value','1000'),
  ('calc_default_accounts_per_week','10'),
  ('calc_default_weeks','20'),
  ('calc_min_weeks','18'),
  ('calc_max_weeks','30'),
  ('calc_active_reduction_pct','25'),
  ('public_fiber_starting_rate',''),
  ('fiber_calc_default_weeks','12'),
  ('fiber_calc_min_weeks','8'),
  ('fiber_calc_max_weeks','26')
ON CONFLICT (key) DO NOTHING;
UPDATE public.app_settings SET value = '1000' WHERE key = 'calc_avg_contract_value';
UPDATE public.app_settings SET value = '20' WHERE key = 'calc_default_weeks';
UPDATE public.app_settings SET value = '10' WHERE key = 'calc_default_accounts_per_week';

-- ---------- veteran leads ----------
CREATE TABLE IF NOT EXISTS public.vet_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  current_company text,
  years_d2d text,
  last_season_active_revenue numeric,
  markets text,
  best_time_to_call text,
  bid_requested boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'new',
  source_type text,
  source_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_leads TO authenticated;
GRANT ALL ON public.vet_leads TO service_role;
ALTER TABLE public.vet_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vet_leads_staff_read" ON public.vet_leads;
CREATE POLICY "vet_leads_staff_read" ON public.vet_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'recruiter'));
DROP POLICY IF EXISTS "vet_leads_staff_write" ON public.vet_leads;
CREATE POLICY "vet_leads_staff_write" ON public.vet_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

-- ---------- public industry content blocks ----------
ALTER TABLE public.vertical_paths
  ADD COLUMN IF NOT EXISTS public_how_it_works text[],
  ADD COLUMN IF NOT EXISTS public_note text;

UPDATE public.vertical_paths
SET public_how_it_works = ARRAY['Train','Knock','Install','Paid per install'],
    public_note = 'Sold to homes in areas where the network has already been built.'
WHERE vertical = 'Fiber' AND public_how_it_works IS NULL;

UPDATE public.vertical_paths
SET public_note = 'In development — the setup steps and pay are being finalized.'
WHERE vertical = 'Life' AND public_note IS NULL;

-- audit changes to public industry content
CREATE OR REPLACE FUNCTION public.audit_vertical_paths() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    PERFORM public.write_audit('industry_content_edited','vertical', NEW.vertical, NEW.label, 'description',
      left(COALESCE(OLD.description,''), 200), left(COALESCE(NEW.description,''), 200));
  END IF;
  IF NEW.public_note IS DISTINCT FROM OLD.public_note THEN
    PERFORM public.write_audit('industry_content_edited','vertical', NEW.vertical, NEW.label, 'public_note',
      left(COALESCE(OLD.public_note,''), 200), left(COALESCE(NEW.public_note,''), 200));
  END IF;
  IF NEW.public_how_it_works IS DISTINCT FROM OLD.public_how_it_works THEN
    PERFORM public.write_audit('industry_content_edited','vertical', NEW.vertical, NEW.label, 'public_how_it_works',
      array_to_string(COALESCE(OLD.public_how_it_works, '{}'), ' / '),
      array_to_string(COALESCE(NEW.public_how_it_works, '{}'), ' / '));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_audit_vertical_paths ON public.vertical_paths;
CREATE TRIGGER trg_audit_vertical_paths AFTER UPDATE ON public.vertical_paths
  FOR EACH ROW EXECUTE FUNCTION public.audit_vertical_paths();

-- ---------- public industry payload (extended) ----------
CREATE OR REPLACE FUNCTION public.get_public_industry(p_vertical text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _publish boolean; _result jsonb;
BEGIN
  SELECT COALESCE((SELECT value::text = 'true' FROM public.app_settings WHERE key = 'publish_stacks_publicly'), false)
    INTO _publish;

  SELECT jsonb_build_object(
    'vertical', vp.vertical,
    'label', vp.label,
    'description', vp.description,
    'public_note', vp.public_note,
    'how_it_works', COALESCE(to_jsonb(vp.public_how_it_works), '[]'::jsonb),
    'carriers', COALESCE((
      SELECT jsonb_agg(c.name ORDER BY c.name)
      FROM public.carriers c
      WHERE c.vertical = vp.vertical AND c.active AND c.public
    ), '[]'::jsonb),
    'ranks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', r.name,
        'value', CASE WHEN _publish THEN (
          SELECT rs.value FROM public.rank_stacks rs
          WHERE rs.rank_id = r.id AND rs.vertical = vp.vertical AND rs.confirmed
          ORDER BY rs.value DESC LIMIT 1
        ) ELSE NULL END
      ) ORDER BY r.sort_order)
      FROM public.ranks r
    ), '[]'::jsonb),
    'leads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'intro', p.manager_intro
      ) ORDER BY p.full_name)
      FROM public.profiles p
      WHERE COALESCE(p.runs_vertical,false) = true
        AND p.vertical = vp.vertical
        AND COALESCE(p.archived,false) = false
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.vertical_paths vp
  WHERE lower(vp.vertical) = lower(p_vertical);

  RETURN _result;
END; $$;
REVOKE ALL ON FUNCTION public.get_public_industry(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_industry(text) TO anon, authenticated, service_role;

-- ---------- public calculator payload ----------
CREATE OR REPLACE FUNCTION public.get_public_calc()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'settings', COALESCE((
      SELECT jsonb_object_agg(key, value) FROM public.app_settings
      WHERE key IN ('calc_avg_contract_value','calc_default_accounts_per_week','calc_default_weeks',
                    'calc_min_weeks','calc_max_weeks','calc_active_reduction_pct',
                    'public_fiber_starting_rate','fiber_calc_default_weeks','fiber_calc_min_weeks','fiber_calc_max_weeks')
    ), '{}'::jsonb),
    'chips', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('vertical', vertical, 'value', value, 'label', label)
                       ORDER BY vertical, display_order, value)
      FROM public.public_calc_chips WHERE is_active
    ), '[]'::jsonb),
    'pay_scale', (
      SELECT jsonb_build_object(
        'key', s.key,
        'label', s.label,
        'bands', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('min', b.min_revenue, 'max', b.max_revenue, 'rate', b.rate)
                           ORDER BY b.display_order, b.min_revenue)
          FROM public.public_pay_bands b WHERE b.scale_id = s.id
        ), '[]'::jsonb)
      )
      FROM public.public_pay_scales s WHERE s.key = 'rookie_2027' AND s.is_active
    )
  );
$$;
REVOKE ALL ON FUNCTION public.get_public_calc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_calc() TO anon, authenticated, service_role;