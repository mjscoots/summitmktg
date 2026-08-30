-- Pass 135: referral tagging on the recruiting pool
ALTER TABLE public.recruiting_leads
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_at timestamptz;

CREATE INDEX IF NOT EXISTS recruiting_leads_referred_by_idx
  ON public.recruiting_leads (referred_by);

-- Three per user, enforced at the database
CREATE OR REPLACE FUNCTION public.enforce_referral_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer;
BEGIN
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO _n FROM public.recruiting_leads WHERE referred_by = NEW.referred_by;
  IF _n >= 3 THEN
    RAISE EXCEPTION 'Referral cap reached';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_referral_cap ON public.recruiting_leads;
CREATE TRIGGER trg_enforce_referral_cap
  BEFORE INSERT ON public.recruiting_leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_referral_cap();

-- What the rep sees about their own three, and nothing else
CREATE OR REPLACE FUNCTION public.my_your_three()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'count', (SELECT count(*)::int FROM public.recruiting_leads
               WHERE referred_by = auth.uid() AND auth.uid() IS NOT NULL),
    'names', COALESCE((SELECT jsonb_agg(x.first_name ORDER BY x.created_at)
               FROM (SELECT first_name, created_at FROM public.recruiting_leads
                     WHERE referred_by = auth.uid() AND auth.uid() IS NOT NULL) x), '[]'::jsonb)
  );
$$;

-- Submit up to three rows. Never returns pool contents.
CREATE OR REPLACE FUNCTION public.submit_your_three(_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _row jsonb;
  _name text;
  _digits text;
  _norm text;
  _used integer;
  _results jsonb := '[]'::jsonb;
  _dupe boolean;
BEGIN
  IF _u IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _u) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in first');
  END IF;

  SELECT count(*) INTO _used FROM public.recruiting_leads WHERE referred_by = _u;

  FOR _row IN SELECT * FROM jsonb_array_elements(coalesce(_rows, '[]'::jsonb))
  LOOP
    _name := btrim(coalesce(_row->>'name', ''));
    _digits := regexp_replace(coalesce(_row->>'phone', ''), '\D', '', 'g');
    _norm := public.norm_person_name(_name);

    IF char_length(_name) < 2 OR char_length(_digits) < 10 THEN
      _results := _results || jsonb_build_object('name', _name, 'status', 'incomplete');
      CONTINUE;
    END IF;

    IF _used >= 3 THEN
      _results := _results || jsonb_build_object('name', _name, 'status', 'cap');
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.recruiting_leads r
       WHERE regexp_replace(coalesce(r.phone, ''), '\D', '', 'g') = _digits
          OR public.norm_person_name(r.first_name) = _norm
    ) OR EXISTS (
      SELECT 1 FROM public.people_leads p
       WHERE regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = _digits
          OR public.norm_person_name(p.full_name) = _norm
    ) OR EXISTS (
      SELECT 1 FROM public.profiles pr
       WHERE regexp_replace(coalesce(pr.phone, ''), '\D', '', 'g') = _digits
          OR public.norm_person_name(pr.full_name) = _norm
    ) INTO _dupe;

    IF _dupe THEN
      _results := _results || jsonb_build_object('name', _name, 'status', 'duplicate');
      CONTINUE;
    END IF;

    INSERT INTO public.recruiting_leads
      (first_name, phone, status, source_type, referrer_user_id, sourced_by,
       referred_by, referred_at, vertical)
    VALUES (
      left(_name, 80),
      left(_digits, 30),
      'New',
      'rep_referral',
      _u,
      _u,
      _u,
      now(),
      coalesce((SELECT active_vertical FROM public.profiles WHERE user_id = _u), 'Pest')
    );

    _used := _used + 1;
    _results := _results || jsonb_build_object('name', _name, 'status', 'added');
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', _used, 'results', _results);
END;
$$;

-- Referral tag on the board and on claimed leads
DROP FUNCTION IF EXISTS public.get_lead_board();
CREATE FUNCTION public.get_lead_board()
RETURNS TABLE(id uuid, first_name text, city text, interest_reason text, ref_code text,
              created_at timestamp with time zone, referred_by_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.first_name, l.city, l.interest_reason, l.ref_code, l.created_at,
         rp.full_name AS referred_by_name
  FROM recruiting_leads l
  LEFT JOIN public.profiles rp ON rp.user_id = l.referred_by
  WHERE auth.uid() IS NOT NULL
    AND l.status = 'New' AND l.claimed_by IS NULL
  ORDER BY (
      CASE WHEN COALESCE(btrim(l.interest_reason), '') <> '' THEN 2 ELSE 0 END
      + CASE
          WHEN l.created_at > now() - interval '24 hours' THEN 3
          WHEN l.created_at > now() - interval '72 hours' THEN 2
          WHEN l.created_at > now() - interval '7 days' THEN 1
          ELSE 0
        END
    ) DESC, l.created_at DESC
  LIMIT 300;
$$;

DROP FUNCTION IF EXISTS public.get_my_leads();
CREATE FUNCTION public.get_my_leads()
RETURNS TABLE(id uuid, first_name text, phone text, city text, interest_reason text, ref_code text,
              status text, claimed_at timestamp with time zone,
              last_activity_at timestamp with time zone, notes text,
              created_at timestamp with time zone, referred_by_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.first_name, l.phone, l.city, l.interest_reason, l.ref_code,
         l.status, l.claimed_at, l.last_activity_at, l.notes, l.created_at,
         rp.full_name AS referred_by_name
  FROM recruiting_leads l
  LEFT JOIN public.profiles rp ON rp.user_id = l.referred_by
  WHERE auth.uid() IS NOT NULL AND l.claimed_by = auth.uid()
    AND COALESCE(l.ref_code, '') <> 'winback'
  ORDER BY l.claimed_at DESC NULLS LAST
  LIMIT 300;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_your_three(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_your_three() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_referral_cap() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lead_board() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_leads() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_your_three(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_your_three() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_board() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_leads() TO authenticated;
