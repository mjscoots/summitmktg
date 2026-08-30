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
    _name := btrim(regexp_replace(coalesce(_row->>'name', ''), '\s+', ' ', 'g'));
    _digits := regexp_replace(coalesce(_row->>'phone', ''), '\D', '', 'g');
    _norm := regexp_replace(public.norm_person_name(_name), '\s+', ' ', 'g');

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
          OR regexp_replace(public.norm_person_name(r.first_name), '\s+', ' ', 'g') = _norm
    ) OR EXISTS (
      SELECT 1 FROM public.people_leads p
       WHERE regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = _digits
          OR regexp_replace(public.norm_person_name(p.full_name), '\s+', ' ', 'g') = _norm
    ) OR EXISTS (
      SELECT 1 FROM public.profiles pr
       WHERE regexp_replace(coalesce(pr.phone, ''), '\D', '', 'g') = _digits
          OR regexp_replace(public.norm_person_name(pr.full_name), '\s+', ' ', 'g') = _norm
    ) INTO _dupe;

    IF _dupe THEN
      _results := _results || jsonb_build_object('name', _name, 'status', 'duplicate');
      CONTINUE;
    END IF;

    INSERT INTO public.recruiting_leads
      (first_name, phone, status, source_type, referrer_user_id, sourced_by,
       referred_by, referred_at, vertical)
    VALUES (
      left(_name, 80), left(_digits, 30), 'New', 'rep_referral', _u, _u, _u, now(),
      coalesce((SELECT active_vertical FROM public.profiles WHERE user_id = _u), 'Pest')
    );

    _used := _used + 1;
    _results := _results || jsonb_build_object('name', _name, 'status', 'added');
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', _used, 'results', _results);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_your_three(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_your_three(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_referral_cap() FROM PUBLIC, anon, authenticated;
