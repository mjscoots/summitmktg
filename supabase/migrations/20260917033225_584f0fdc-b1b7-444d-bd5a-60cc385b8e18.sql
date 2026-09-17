CREATE OR REPLACE FUNCTION public.resolve_source_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _code text; _ref RECORD; _partner RECORD; _name text;
BEGIN
  _code := btrim(COALESCE(p_code, ''));
  IF _code = '' OR lower(_code) = 'direct' THEN
    RETURN jsonb_build_object('source_type','organic');
  END IF;

  IF _code ~ '^[0-9]{1,3}$' AND _code::int BETWEEN 1 AND 100 THEN
    RETURN jsonb_build_object('source_type','golden_ticket','source_code', lpad(_code, 3, '0'));
  END IF;

  SELECT * INTO _ref FROM public.recruiting_ref_codes WHERE lower(code) = lower(_code) LIMIT 1;
  IF _ref.id IS NOT NULL THEN
    -- Only an active, approved rep's first name is ever handed back, so a
    -- referred visitor can be shown who sent them and nothing else.
    IF _ref.assigned_user_id IS NOT NULL THEN
      SELECT nullif(split_part(btrim(coalesce(p.full_name, '')), ' ', 1), '')
        INTO _name
        FROM public.profiles p
       WHERE p.user_id = _ref.assigned_user_id
         AND p.approved = true
         AND coalesce(p.archived, false) = false
       LIMIT 1;
    END IF;
    RETURN jsonb_strip_nulls(jsonb_build_object(
      'source_type', CASE WHEN _ref.assigned_user_id IS NOT NULL THEN 'rep_referral' ELSE 'other' END,
      'source_code', _ref.code,
      'referrer_user_id', _ref.assigned_user_id,
      'referrer_name', _name
    ));
  END IF;

  SELECT * INTO _partner FROM public.partners WHERE lower(code) = lower(_code) AND active LIMIT 1;
  IF _partner.id IS NOT NULL THEN
    RETURN jsonb_build_object('source_type','partner','source_code', _partner.code, 'partner_id', _partner.id);
  END IF;

  RETURN jsonb_build_object('source_type','organic','source_code', _code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.capture_apply_partial(_key text, _fields jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _name text := nullif(btrim(coalesce(_fields->>'first_name', '')), '');
  _phone text := nullif(btrim(coalesce(_fields->>'phone', '')), '');
  _email text := nullif(lower(btrim(coalesce(_fields->>'email', ''))), '');
  _city text := nullif(btrim(coalesce(_fields->>'city', '')), '');
  _stage text := nullif(btrim(coalesce(_fields->>'apply_stage', '')), '');
  _story text := nullif(btrim(coalesce(_fields->>'story', '')), '');
  _reason text := nullif(btrim(coalesce(_fields->>'interest_reason', '')), '');
  _source text := nullif(btrim(coalesce(_fields->>'source_code', '')), '');
  _resolved jsonb;
  _stype text;
  _referrer uuid;
  _partner uuid;
  _digits text;
  _target uuid;
BEGIN
  IF _key IS NULL OR char_length(_key) < 8 OR char_length(_key) > 64 THEN
    RETURN false;
  END IF;
  IF _name IS NULL THEN
    RETURN false;
  END IF;
  IF public.check_rate_limit('apply_partial_' || _key, 60, 3600) = false THEN
    RETURN false;
  END IF;

  _name := left(_name, 80);
  _city := nullif(left(coalesce(_city, ''), 80), '');
  _email := nullif(left(coalesce(_email, ''), 254), '');
  _story := nullif(left(coalesce(_story, ''), 2000), '');
  _reason := nullif(left(coalesce(_reason, ''), 60), '');
  _source := nullif(left(coalesce(_source, ''), 60), '');
  IF _phone IS NOT NULL THEN
    _phone := left(_phone, 30);
    IF char_length(_phone) < 7 THEN _phone := NULL; END IF;
  END IF;

  -- Pass 224 - the credit is worked out here from the code itself, so an
  -- anonymous caller can never name a referrer or a partner of its choosing.
  IF _source IS NOT NULL THEN
    _resolved := public.resolve_source_code(_source);
    _stype := nullif(_resolved->>'source_type', 'organic');
    _referrer := nullif(_resolved->>'referrer_user_id', '')::uuid;
    _partner := nullif(_resolved->>'partner_id', '')::uuid;
  END IF;

  -- The row this visit already owns.
  SELECT id INTO _target FROM public.recruiting_leads WHERE client_key = _key;

  -- Otherwise the same phone from the last day is the same human, so it is
  -- adopted rather than duplicated.
  IF _target IS NULL AND _phone IS NOT NULL THEN
    _digits := regexp_replace(_phone, '[^0-9]', '', 'g');
    SELECT id INTO _target
      FROM public.recruiting_leads
     WHERE client_key IS NULL
       AND created_at > now() - interval '24 hours'
       AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = _digits
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF _target IS NOT NULL THEN
    UPDATE public.recruiting_leads
       SET client_key = _key,
           first_name = _name,
           phone = coalesce(_phone, phone),
           email = coalesce(_email, email),
           city = coalesce(_city, city),
           interest_reason = coalesce(_reason, interest_reason),
           story = coalesce(_story, story),
           apply_stage = coalesce(_stage, apply_stage),
           source_code = coalesce(source_code, _source),
           source_type = CASE
             WHEN _stype IS NOT NULL AND source_type IN ('application', 'organic') THEN _stype
             ELSE source_type
           END,
           referrer_user_id = coalesce(referrer_user_id, _referrer),
           partner_id = coalesce(partner_id, _partner),
           last_activity_at = now()
     WHERE id = _target;
    RETURN true;
  END IF;

  PERFORM set_config('app.partial_capture', 'on', true);
  INSERT INTO public.recruiting_leads (
    first_name, phone, email, city, interest_reason, story, apply_stage,
    client_key, source_type, source_code, referrer_user_id, partner_id, status, last_activity_at
  ) VALUES (
    _name, _phone, _email, _city, _reason, _story, _stage,
    _key, coalesce(_stype, 'application'), _source, _referrer, _partner, 'New', now()
  );
  RETURN true;
END;
$function$;