-- 1. OFFICES ---------------------------------------------------------------
CREATE TABLE public.offices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  housing_address text,
  meeting_space_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offices TO authenticated;
GRANT ALL ON public.offices TO service_role;

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offices_read_authenticated" ON public.offices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "offices_admin_write" ON public.offices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE TRIGGER update_offices_updated_at
  BEFORE UPDATE ON public.offices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.offices (name) VALUES ('Indianapolis'), ('Chicago'), ('Baltimore')
ON CONFLICT (name) DO NOTHING;

-- 2. PROFILE FIELDS --------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rep_year text,
  ADD COLUMN IF NOT EXISTS recruited_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS recruited_by_name text,
  ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vertical text NOT NULL DEFAULT 'Pest',
  ADD COLUMN IF NOT EXISTS runs_vertical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_detail text,
  ADD COLUMN IF NOT EXISTS departure_type text,
  ADD COLUMN IF NOT EXISTS departure_reason text,
  ADD COLUMN IF NOT EXISTS last_day_worked date,
  ADD COLUMN IF NOT EXISTS revenue_to_date numeric;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rep_year_check
  CHECK (rep_year IS NULL OR rep_year IN ('1st','2nd','3rd+'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_vertical_check
  CHECK (vertical IN ('Pest','Fiber','Virtual'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_departure_type_check
  CHECK (departure_type IS NULL OR departure_type IN ('quit','fired','home_early','unknown'));

CREATE INDEX IF NOT EXISTS profiles_office_id_idx ON public.profiles (office_id);
CREATE INDEX IF NOT EXISTS profiles_vertical_idx ON public.profiles (vertical);
CREATE INDEX IF NOT EXISTS profiles_departure_type_idx ON public.profiles (departure_type);

-- backfill office_id from the legacy free-text office_name where it matches
UPDATE public.profiles p
SET office_id = o.id
FROM public.offices o
WHERE p.office_id IS NULL
  AND p.office_name IS NOT NULL
  AND lower(btrim(p.office_name)) = lower(o.name);

-- 3. LOCK NEW PRIVILEGED FIELDS FOR NON-STAFF ------------------------------
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / backend jobs
  END IF;

  is_staff := public.has_role(auth.uid(),'manager')
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'owner');

  IF is_staff THEN
    RETURN NEW;
  END IF;

  NEW.approved := OLD.approved;
  NEW.status := OLD.status;
  NEW.cumulative_points := OLD.cumulative_points;
  NEW.team_id := OLD.team_id;
  NEW.direct_manager := OLD.direct_manager;
  NEW.archived := OLD.archived;
  NEW.rep_year := OLD.rep_year;
  NEW.recruited_by_user_id := OLD.recruited_by_user_id;
  NEW.recruited_by_name := OLD.recruited_by_name;
  NEW.office_id := OLD.office_id;
  NEW.vertical := OLD.vertical;
  NEW.runs_vertical := OLD.runs_vertical;
  NEW.status_detail := OLD.status_detail;
  NEW.departure_type := OLD.departure_type;
  NEW.departure_reason := OLD.departure_reason;
  NEW.last_day_worked := OLD.last_day_worked;
  NEW.revenue_to_date := OLD.revenue_to_date;
  RETURN NEW;
END;
$function$;

-- 4. DEPARTURE INTAKE ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_departure(
  _user_id uuid,
  _departure_type text DEFAULT 'unknown',
  _reason text DEFAULT NULL,
  _last_day date DEFAULT NULL,
  _revenue numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t text := COALESCE(NULLIF(btrim(_departure_type), ''), 'unknown');
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF t NOT IN ('quit','fired','home_early','unknown') THEN
    t := 'unknown';
  END IF;

  UPDATE public.profiles
  SET archived = true,
      archived_at = COALESCE(archived_at, now()),
      archived_reason = COALESCE(archived_reason, 'departed'),
      pre_archive_status = COALESCE(pre_archive_status, status),
      departure_type = t,
      departure_reason = NULLIF(btrim(COALESCE(_reason, '')), ''),
      last_day_worked = _last_day,
      revenue_to_date = _revenue
  WHERE user_id = _user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_departure(uuid, text, text, date, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_departure(uuid, text, text, date, numeric) TO authenticated;

-- 5. REGION SHEET ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_region_sheet()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  season_start date;
  season_end date;
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT s.starts_on, s.ends_on INTO season_start, season_end
  FROM public.seasons s
  WHERE s.is_active
  ORDER BY s.starts_on DESC
  LIMIT 1;

  WITH roster AS (
    SELECT p.user_id,
           p.full_name,
           p.avatar_url,
           COALESCE(o.name, NULLIF(btrim(p.office_name), '')) AS office,
           t.name AS team,
           COALESCE(NULLIF(btrim(p.direct_manager), ''), NULLIF(btrim(p.recruiter), '')) AS manager,
           p.rep_year,
           COALESCE(NULLIF(btrim(p.recruited_by_name), ''), NULLIF(btrim(p.referred_by), '')) AS recruited_by,
           p.vertical,
           p.runs_vertical,
           p.status::text AS status,
           p.status_detail,
           p.approved,
           p.archived,
           p.alumni,
           p.archived_at,
           p.departure_type,
           p.departure_reason,
           p.last_day_worked,
           p.revenue_to_date,
           p.created_at,
           p.last_active_at
    FROM public.profiles p
    LEFT JOIN public.offices o ON o.id = p.office_id
    LEFT JOIN public.teams t ON t.id = p.team_id
  ),
  active AS (SELECT * FROM roster WHERE archived IS NOT TRUE),
  departed AS (SELECT * FROM roster WHERE archived IS TRUE),
  season_roster AS (
    SELECT * FROM roster
    WHERE season_start IS NULL
       OR (created_at::date <= COALESCE(season_end, CURRENT_DATE))
  )
  SELECT jsonb_build_object(
    'season', CASE WHEN season_start IS NULL THEN NULL ELSE jsonb_build_object('starts_on', season_start, 'ends_on', season_end) END,
    'totals', jsonb_build_object(
      'active', (SELECT count(*) FROM active),
      'departed', (SELECT count(*) FROM departed),
      'by_office', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'label'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('label', COALESCE(office, ''), 'count', count(*)) x
          FROM active GROUP BY office) s),
      'by_vertical', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'label'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('label', COALESCE(vertical, ''), 'count', count(*)) x
          FROM active GROUP BY vertical) s),
      'by_rep_year', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'label'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('label', COALESCE(rep_year, ''), 'count', count(*)) x
          FROM active GROUP BY rep_year) s)
    ),
    'funnel', jsonb_build_object(
      'ever_on_roster', (SELECT count(*) FROM season_roster),
      'showed_up', (SELECT count(*) FROM season_roster WHERE last_active_at IS NOT NULL),
      'still_active', (SELECT count(*) FROM season_roster WHERE archived IS NOT TRUE),
      'departed', (SELECT count(*) FROM season_roster WHERE archived IS TRUE),
      'quit', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND departure_type = 'quit'),
      'fired', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND departure_type = 'fired'),
      'home_early', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND departure_type = 'home_early'),
      'unknown', (SELECT count(*) FROM season_roster WHERE archived IS TRUE AND COALESCE(departure_type,'unknown') = 'unknown')
    ),
    'rows', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.archived, r.full_name), '[]'::jsonb) FROM roster r)
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_region_sheet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_region_sheet() TO authenticated;