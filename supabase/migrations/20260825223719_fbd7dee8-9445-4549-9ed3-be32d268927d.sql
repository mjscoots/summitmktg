ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruiter';

ALTER TABLE public.rank_requirements ADD COLUMN IF NOT EXISTS source text;

CREATE OR REPLACE FUNCTION public.is_staff_data_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'owner'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_data_active_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  SELECT jsonb_build_object(
    'source_table', 'profiles',
    'total_active', (SELECT count(*) FROM profiles WHERE COALESCE(archived, false) = false),
    'by_office', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'office')
      FROM (
        SELECT jsonb_build_object('office', COALESCE(office_name, 'Unassigned'), 'count', count(*)) AS x
        FROM profiles
        WHERE COALESCE(archived, false) = false
        GROUP BY COALESCE(office_name, 'Unassigned')
      ) o
    ), '[]'::jsonb),
    'by_vertical', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'vertical')
      FROM (
        SELECT jsonb_build_object('vertical', COALESCE(vertical, 'Unassigned'), 'count', count(*)) AS x
        FROM profiles
        WHERE COALESCE(archived, false) = false
        GROUP BY COALESCE(vertical, 'Unassigned')
      ) v
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_data_gap_people(_gap text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  IF _gap NOT IN ('last_day', 'reason', 'status') THEN
    RETURN jsonb_build_object('error', 'unknown gap');
  END IF;

  SELECT jsonb_build_object(
    'source_table', 'profiles',
    'gap', _gap,
    'people', COALESCE(jsonb_agg(jsonb_build_object(
      'name', full_name,
      'office', office_name,
      'manager', direct_manager,
      'status', status
    ) ORDER BY full_name), '[]'::jsonb)
  ) INTO result
  FROM profiles
  WHERE CASE _gap
    WHEN 'last_day' THEN COALESCE(archived, false) = false AND committed_last_day IS NULL
    WHEN 'reason' THEN COALESCE(archived, false) = true AND (departure_reason IS NULL OR btrim(departure_reason) = '')
    ELSE COALESCE(archived, false) = false AND next_year_status IS NULL
  END;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_data_under_led()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  SELECT jsonb_build_object(
    'source_table', 'profiles',
    'people', COALESCE(jsonb_agg(jsonb_build_object(
      'name', full_name,
      'office', office_name,
      'vertical', vertical,
      'status', status
    ) ORDER BY full_name), '[]'::jsonb)
  ) INTO result
  FROM profiles
  WHERE COALESCE(archived, false) = false
    AND (direct_manager IS NULL OR btrim(direct_manager) = '');

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_data_person_lookup(_q text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  IF _q IS NULL OR btrim(_q) = '' THEN
    RETURN jsonb_build_object('error', 'no name given');
  END IF;

  SELECT jsonb_build_object(
    'source_tables', jsonb_build_array('profiles', 'ranks', 'rep_revenue'),
    'matches', COALESCE(jsonb_agg(m ORDER BY m->>'name'), '[]'::jsonb)
  ) INTO result
  FROM (
    SELECT jsonb_build_object(
      'name', p.full_name,
      'status', p.status,
      'archived', COALESCE(p.archived, false),
      'manager', p.direct_manager,
      'office', p.office_name,
      'vertical', p.vertical,
      'rank', r.name,
      'rep_year', p.rep_year,
      'committed_last_day', p.committed_last_day,
      'next_year_status', p.next_year_status,
      'departure_type', p.departure_type,
      'revenue_months', (SELECT count(*) FROM rep_revenue rv WHERE rv.user_id = p.user_id),
      'revenue_total', (SELECT COALESCE(sum(rv.revenue), 0) FROM rep_revenue rv WHERE rv.user_id = p.user_id)
    ) AS m
    FROM profiles p
    LEFT JOIN ranks r ON r.id = p.rank_id
    WHERE p.full_name ILIKE '%' || btrim(_q) || '%'
    LIMIT 10
  ) s;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.is_staff_data_reader() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_data_active_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_data_gap_people(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_data_under_led() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_data_person_lookup(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_staff_data_reader() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_data_active_counts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_data_gap_people(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_data_under_led() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_data_person_lookup(text) TO authenticated, service_role;