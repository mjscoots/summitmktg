ALTER TABLE public.recruiting_leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS client_key text,
  ADD COLUMN IF NOT EXISTS apply_stage text,
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL;

ALTER TABLE public.recruiting_leads
  ADD CONSTRAINT recruiting_leads_email_check CHECK (email IS NULL OR char_length(email) <= 254),
  ADD CONSTRAINT recruiting_leads_client_key_check CHECK (client_key IS NULL OR char_length(client_key) BETWEEN 8 AND 64),
  ADD CONSTRAINT recruiting_leads_apply_stage_check CHECK (apply_stage IS NULL OR char_length(apply_stage) <= 40);

CREATE UNIQUE INDEX IF NOT EXISTS recruiting_leads_client_key_uidx
  ON public.recruiting_leads (client_key) WHERE client_key IS NOT NULL;

-- Pass 223: the only way a public visitor writes a partial application. Definer
-- so the anon role needs no table privileges; it can only reach the row that
-- carries its own client key, and it never returns lead data.
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
  _city := left(coalesce(_city, ''), 80);
  IF _city = '' THEN _city := NULL; END IF;
  _email := left(coalesce(_email, ''), 254);
  IF _email = '' THEN _email := NULL; END IF;
  _story := left(coalesce(_story, ''), 4000);
  IF _story = '' THEN _story := NULL; END IF;
  _reason := left(coalesce(_reason, ''), 60);
  IF _reason = '' THEN _reason := NULL; END IF;
  _source := left(coalesce(_source, ''), 60);
  IF _source = '' THEN _source := NULL; END IF;
  IF _phone IS NOT NULL THEN
    _phone := left(_phone, 30);
    IF char_length(_phone) < 7 THEN _phone := NULL; END IF;
  END IF;

  INSERT INTO public.recruiting_leads AS rl (
    first_name, phone, email, city, interest_reason, story, apply_stage,
    client_key, source_type, source_code, status, last_activity_at
  ) VALUES (
    _name, _phone, _email, _city, _reason, _story, _stage,
    _key, 'application', _source, 'New', now()
  )
  ON CONFLICT (client_key) WHERE client_key IS NOT NULL DO UPDATE SET
    first_name = coalesce(excluded.first_name, rl.first_name),
    phone = coalesce(excluded.phone, rl.phone),
    email = coalesce(excluded.email, rl.email),
    city = coalesce(excluded.city, rl.city),
    interest_reason = coalesce(excluded.interest_reason, rl.interest_reason),
    story = coalesce(excluded.story, rl.story),
    apply_stage = coalesce(excluded.apply_stage, rl.apply_stage),
    source_code = coalesce(rl.source_code, excluded.source_code),
    last_activity_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_apply_partial(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_apply_partial(text, jsonb) TO anon, authenticated, service_role;