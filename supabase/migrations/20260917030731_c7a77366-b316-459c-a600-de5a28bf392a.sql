-- Pass 223: the public form hardening drops an anonymous insert when the phone
-- is already known, which is right for the one shot form but silently swallowed
-- the step by step capture. The capture function validates and rate limits on its
-- own, so it is allowed straight through.
CREATE OR REPLACE FUNCTION public.harden_recruiting_lead_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _existing uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('app.partial_capture', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.first_name := btrim(NEW.first_name);
  NEW.phone := btrim(NEW.phone);

  IF coalesce(NEW.first_name,'') = '' OR length(NEW.first_name) > 120
     OR NOT public.valid_public_phone(NEW.phone)
     OR length(coalesce(NEW.city,'')) > 120
     OR length(coalesce(NEW.interest_reason,'')) > 2000
     OR length(coalesce(NEW.story,'')) > 2000
     OR length(coalesce(NEW.notes,'')) > 2000
     OR length(coalesce(NEW.ref_code,'')) > 60 THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  IF NOT public.check_rate_limit(
       'public-form:' || public.submission_client_key(), 5, 3600) THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  SELECT l.id INTO _existing
    FROM public.recruiting_leads l
   WHERE l.created_at > now() - interval '24 hours'
     AND regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g')
         = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
   ORDER BY l.created_at DESC
   LIMIT 1;

  IF _existing IS NOT NULL THEN
    UPDATE public.recruiting_leads
       SET first_name = NEW.first_name,
           phone = NEW.phone,
           city = coalesce(NEW.city, city),
           interest_reason = coalesce(NEW.interest_reason, interest_reason),
           ref_code = coalesce(NEW.ref_code, ref_code),
           vertical = coalesce(NEW.vertical, vertical),
           source_type = coalesce(NEW.source_type, source_type),
           source_code = coalesce(NEW.source_code, source_code),
           referrer_user_id = coalesce(NEW.referrer_user_id, referrer_user_id),
           partner_id = coalesce(NEW.partner_id, partner_id),
           last_activity_at = now()
     WHERE id = _existing;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_apply_partial(_key text, _fields jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text := nullif(btrim(coalesce(_fields->>'first_name', '')), '');
  _phone text := nullif(btrim(coalesce(_fields->>'phone', '')), '');
  _email text := nullif(lower(btrim(coalesce(_fields->>'email', ''))), '');
  _city text := nullif(btrim(coalesce(_fields->>'city', '')), '');
  _stage text := nullif(btrim(coalesce(_fields->>'apply_stage', '')), '');
  _story text := nullif(btrim(coalesce(_fields->>'story', '')), '');
  _reason text := nullif(btrim(coalesce(_fields->>'interest_reason', '')), '');
  _source text := nullif(btrim(coalesce(_fields->>'source_code', '')), '');
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
           last_activity_at = now()
     WHERE id = _target;
    RETURN true;
  END IF;

  PERFORM set_config('app.partial_capture', 'on', true);
  INSERT INTO public.recruiting_leads (
    first_name, phone, email, city, interest_reason, story, apply_stage,
    client_key, source_type, source_code, status, last_activity_at
  ) VALUES (
    _name, _phone, _email, _city, _reason, _story, _stage,
    _key, 'application', _source, 'New', now()
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_apply_partial(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_apply_partial(text, jsonb) TO anon, authenticated, service_role;