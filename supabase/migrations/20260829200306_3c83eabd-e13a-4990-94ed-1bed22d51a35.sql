CREATE TABLE public.blitz_markets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wave integer NOT NULL,
  market text NOT NULL,
  state text NOT NULL,
  window_start date NOT NULL,
  window_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  official_event_id uuid NULL REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blitz_markets TO authenticated;
GRANT ALL ON public.blitz_markets TO service_role;

ALTER TABLE public.blitz_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and above can read blitz markets"
ON public.blitz_markets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'president')
);

CREATE POLICY "Admins and owners can write blitz markets"
ON public.blitz_markets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.make_blitz_official(
  p_market_id uuid,
  p_start date,
  p_end date,
  p_host text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.blitz_markets;
  v_event_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT * INTO v_market FROM public.blitz_markets WHERE id = p_market_id;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'market not found';
  END IF;
  IF v_market.status = 'official' THEN
    RAISE EXCEPTION 'already official';
  END IF;
  IF p_end < p_start THEN
    RAISE EXCEPTION 'end before start';
  END IF;

  INSERT INTO public.calendar_events (
    title, description, event_date, end_date, location, event_kind,
    scope, is_team_wide, vertical, created_by
  ) VALUES (
    v_market.market || ' Blitz',
    NULLIF(btrim(coalesce(p_host, '')), ''),
    (p_start::timestamp + interval '15 hours') AT TIME ZONE 'UTC',
    (p_end::timestamp) AT TIME ZONE 'UTC',
    NULLIF(btrim(coalesce(p_location, '')), ''),
    'blitz',
    'everyone',
    true,
    'Pest',
    auth.uid()
  )
  RETURNING id INTO v_event_id;

  UPDATE public.blitz_markets
  SET status = 'official',
      official_event_id = v_event_id,
      window_start = p_start,
      window_end = p_end
  WHERE id = p_market_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_blitz_official(p_market_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT official_event_id INTO v_event_id FROM public.blitz_markets WHERE id = p_market_id;

  IF v_event_id IS NOT NULL THEN
    UPDATE public.calendar_events SET is_cancelled = true, updated_at = now() WHERE id = v_event_id;
  END IF;

  UPDATE public.blitz_markets
  SET status = 'open', official_event_id = NULL
  WHERE id = p_market_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.make_blitz_official(uuid, date, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revert_blitz_official(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.make_blitz_official(uuid, date, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_blitz_official(uuid) TO authenticated;