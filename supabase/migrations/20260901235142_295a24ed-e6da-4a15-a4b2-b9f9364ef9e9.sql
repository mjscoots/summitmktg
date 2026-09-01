ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS years_in_industry integer,
  ADD COLUMN IF NOT EXISTS years_self_set_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_years_in_industry_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_years_in_industry_check
  CHECK (years_in_industry IS NULL OR (years_in_industry >= 1 AND years_in_industry <= 40));

-- Backfill only where a rep year is already on file. Blank stays blank so
-- nobody is guessed into a year they never claimed.
UPDATE public.profiles
SET years_in_industry = CASE rep_year
  WHEN '1st' THEN 1
  WHEN '2nd' THEN 2
  WHEN '3rd+' THEN 3
END
WHERE years_in_industry IS NULL
  AND rep_year IN ('1st','2nd','3rd+');

CREATE OR REPLACE FUNCTION public.sync_rep_year_from_years()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _prev integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN _prev := OLD.years_in_industry; ELSE _prev := NULL; END IF;
  IF NEW.years_in_industry IS NOT NULL AND NEW.years_in_industry IS DISTINCT FROM _prev THEN
    NEW.rep_year := CASE
      WHEN NEW.years_in_industry <= 1 THEN '1st'
      WHEN NEW.years_in_industry = 2 THEN '2nd'
      ELSE '3rd+'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rep_year_from_years ON public.profiles;
CREATE TRIGGER trg_sync_rep_year_from_years
BEFORE INSERT OR UPDATE OF years_in_industry ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_rep_year_from_years();

CREATE OR REPLACE FUNCTION public.set_years_in_industry(_user_id uuid, _years integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _self boolean;
  _old integer;
  _already timestamptz;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in first.');
  END IF;
  IF _years IS NULL OR _years < 1 OR _years > 40 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a number between 1 and 40.');
  END IF;

  SELECT years_in_industry, years_self_set_at, full_name
    INTO _old, _already, _name
  FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person was not found.');
  END IF;

  _self := (_uid = _user_id);

  IF _self THEN
    IF _already IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already set your years. Ask your manager to correct it.');
    END IF;
  ELSIF NOT public.is_in_my_system(_uid, _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this person manager, their Pillar or the Owner can change that.');
  END IF;

  UPDATE public.profiles
  SET years_in_industry = _years,
      years_self_set_at = CASE WHEN _self THEN now() ELSE years_self_set_at END,
      updated_at = now()
  WHERE user_id = _user_id;

  PERFORM public.write_audit(
    CASE WHEN _self THEN 'years_in_industry_set' ELSE 'years_in_industry_corrected' END,
    'profile', _user_id::text, _name, 'years_in_industry',
    _old::text, _years::text);

  RETURN jsonb_build_object('success', true, 'years', _years);
END;
$$;

-- Industry chips and years for a batch of people. Accepted industries only.
CREATE OR REPLACE FUNCTION public.identity_chips(_user_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(t.user_id::text, jsonb_build_object(
    'verticals', t.verticals,
    'years', t.years
  )), '{}'::jsonb)
  FROM (
    SELECT p.user_id,
      p.years_in_industry AS years,
      COALESCE((
        SELECT jsonb_agg(v ORDER BY v)
        FROM (VALUES ('Pest'),('Fiber'),('Life')) AS x(v)
        WHERE public.is_vertical_member(p.user_id, x.v)
      ), '[]'::jsonb) AS verticals
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
      AND auth.uid() IS NOT NULL
  ) t
$$;

REVOKE ALL ON FUNCTION public.set_years_in_industry(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.identity_chips(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_years_in_industry(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.identity_chips(uuid[]) TO authenticated;