-- 1. Daily fiber numbers
CREATE TABLE public.fiber_day_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.carriers(id) ON DELETE SET NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  note text,
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiber_day_numbers TO authenticated;
GRANT ALL ON public.fiber_day_numbers TO service_role;

ALTER TABLE public.fiber_day_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiber_day_numbers read"
ON public.fiber_day_numbers FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'manager') AND public.is_paired_manager_of(auth.uid(), user_id))
  OR public.is_vertical_lead_of_rep(auth.uid(), user_id)
);

CREATE POLICY "fiber_day_numbers own write"
ON public.fiber_day_numbers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "fiber_day_numbers own update"
ON public.fiber_day_numbers FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "fiber_day_numbers own delete"
ON public.fiber_day_numbers FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "fiber_day_numbers staff write"
ON public.fiber_day_numbers FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'manager') AND public.is_paired_manager_of(auth.uid(), user_id))
  OR public.is_vertical_lead_of_rep(auth.uid(), user_id)
);

CREATE POLICY "fiber_day_numbers staff update"
ON public.fiber_day_numbers FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'manager') AND public.is_paired_manager_of(auth.uid(), user_id))
  OR public.is_vertical_lead_of_rep(auth.uid(), user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'manager') AND public.is_paired_manager_of(auth.uid(), user_id))
  OR public.is_vertical_lead_of_rep(auth.uid(), user_id)
);

CREATE POLICY "fiber_day_numbers admin delete"
ON public.fiber_day_numbers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER fiber_day_numbers_updated_at
BEFORE UPDATE ON public.fiber_day_numbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Blitz opt-ins
CREATE TABLE public.blitz_optins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blitz_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blitz_key, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.blitz_optins TO authenticated;
GRANT ALL ON public.blitz_optins TO service_role;

ALTER TABLE public.blitz_optins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blitz_optins read"
ON public.blitz_optins FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "blitz_optins own insert"
ON public.blitz_optins FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "blitz_optins own delete"
ON public.blitz_optins FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 3. Save today's number and keep the weekly fiber total in step
CREATE OR REPLACE FUNCTION public.log_fiber_today(
  p_sold integer,
  p_carrier_id uuid DEFAULT NULL,
  p_day date DEFAULT CURRENT_DATE,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_carrier uuid := p_carrier_id;
  v_week date;
  v_total integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF p_sold IS NULL OR p_sold < 0 OR p_sold > 200 THEN
    RAISE EXCEPTION 'Enter a number between 0 and 200';
  END IF;

  IF v_carrier IS NULL THEN
    SELECT carrier_id INTO v_carrier
    FROM public.fiber_installs
    WHERE user_id = v_user
    ORDER BY week_start DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.fiber_day_numbers (user_id, carrier_id, day, sold, note, entered_by)
  VALUES (v_user, v_carrier, p_day, p_sold, NULLIF(btrim(coalesce(p_note, '')), ''), v_user)
  ON CONFLICT (user_id, day) DO UPDATE
    SET sold = EXCLUDED.sold,
        carrier_id = COALESCE(EXCLUDED.carrier_id, public.fiber_day_numbers.carrier_id),
        note = EXCLUDED.note,
        entered_by = v_user,
        updated_at = now();

  IF v_carrier IS NULL THEN
    RETURN;
  END IF;

  v_week := (date_trunc('week', p_day::timestamp))::date;

  SELECT coalesce(sum(sold), 0) INTO v_total
  FROM public.fiber_day_numbers
  WHERE user_id = v_user
    AND carrier_id = v_carrier
    AND day >= v_week
    AND day < v_week + 7;

  INSERT INTO public.fiber_installs (user_id, carrier_id, week_start, installs, cancels, entered_by)
  VALUES (v_user, v_carrier, v_week, v_total, 0, v_user)
  ON CONFLICT (user_id, carrier_id, week_start) DO UPDATE
    SET installs = CASE WHEN public.fiber_installs.batch_id IS NULL THEN v_total ELSE public.fiber_installs.installs END,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.log_fiber_today(integer, uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_fiber_today(integer, uuid, date, text) TO authenticated;

-- 4. Blitz opt-in counts, without exposing other people's rows
CREATE OR REPLACE FUNCTION public.blitz_optin_counts()
RETURNS TABLE (blitz_key text, optin_count integer, i_am_in boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.blitz_key,
         count(*)::integer,
         bool_or(b.user_id = auth.uid())
  FROM public.blitz_optins b
  WHERE auth.uid() IS NOT NULL
  GROUP BY b.blitz_key
$$;

REVOKE ALL ON FUNCTION public.blitz_optin_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.blitz_optin_counts() TO authenticated;