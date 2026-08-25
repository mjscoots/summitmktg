CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.match_leaderboard_rows(_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  r jsonb;
  out_rows jsonb := '[]'::jsonb;
  cands jsonb;
  nm text;
  per text;
  mo date;
BEGIN
  IF NOT public.is_staff_data_reader() THEN
    RETURN jsonb_build_object('error', 'not authorized');
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_rows, '[]'::jsonb)) LOOP
    nm := public.norm_person_name(r->>'name');
    per := COALESCE(NULLIF(btrim(r->>'period'), ''), '');
    mo := CASE WHEN per ~ '^\d{4}-\d{2}$' THEN (per || '-01')::date ELSE NULL END;

    SELECT COALESCE(jsonb_agg(c ORDER BY (c->>'score')::numeric DESC), '[]'::jsonb) INTO cands
    FROM (
      SELECT jsonb_build_object(
        'kind', 'profile',
        'id', p.user_id,
        'name', p.full_name,
        'score', round(extensions.similarity(public.norm_person_name(p.full_name), nm)::numeric, 3),
        'archived', COALESCE(p.archived, false),
        'office', p.office_name,
        'manager', p.direct_manager,
        'existing_revenue', CASE
          WHEN mo IS NOT NULL THEN (SELECT rv.revenue FROM rep_revenue rv WHERE rv.user_id = p.user_id AND rv.month = mo)
          ELSE p.revenue_to_date END
      ) AS c
      FROM profiles p
      WHERE nm <> '' AND extensions.similarity(public.norm_person_name(p.full_name), nm) >= 0.35
      ORDER BY extensions.similarity(public.norm_person_name(p.full_name), nm) DESC
      LIMIT 3
    ) s;

    SELECT cands || COALESCE(jsonb_agg(c ORDER BY (c->>'score')::numeric DESC), '[]'::jsonb) INTO cands
    FROM (
      SELECT jsonb_build_object(
        'kind', 'lead',
        'id', l.id,
        'name', l.first_name,
        'score', round(extensions.similarity(public.norm_person_name(l.first_name), nm)::numeric, 3),
        'archived', true,
        'office', l.city,
        'manager', NULL,
        'existing_revenue', l.revenue_total
      ) AS c
      FROM recruiting_leads l
      WHERE nm <> ''
        AND l.status = 'Winback'
        AND extensions.similarity(public.norm_person_name(l.first_name), nm) >= 0.35
        AND l.source_profile_id IS NULL
      ORDER BY extensions.similarity(public.norm_person_name(l.first_name), nm) DESC
      LIMIT 2
    ) s2;

    out_rows := out_rows || jsonb_build_array(
      r || jsonb_build_object(
        'candidates', cands,
        'auto_kind', CASE
          WHEN jsonb_array_length(cands) >= 1
            AND (cands->0->>'score')::numeric >= 0.9
            AND (jsonb_array_length(cands) = 1 OR (cands->0->>'score')::numeric - (cands->1->>'score')::numeric >= 0.15)
          THEN cands->0->>'kind' END,
        'auto_id', CASE
          WHEN jsonb_array_length(cands) >= 1
            AND (cands->0->>'score')::numeric >= 0.9
            AND (jsonb_array_length(cands) = 1 OR (cands->0->>'score')::numeric - (cands->1->>'score')::numeric >= 0.15)
          THEN cands->0->>'id' END
      )
    );
  END LOOP;

  RETURN jsonb_build_object('rows', out_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.match_leaderboard_rows(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_leaderboard_rows(jsonb) TO authenticated, service_role;