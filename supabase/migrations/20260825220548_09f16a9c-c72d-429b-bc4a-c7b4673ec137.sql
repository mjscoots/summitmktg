CREATE OR REPLACE FUNCTION public.get_public_industry(p_vertical text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _publish boolean; _result jsonb;
BEGIN
  SELECT COALESCE((SELECT value::text = 'true' FROM public.app_settings WHERE key = 'publish_stacks_publicly'), false)
    INTO _publish;

  SELECT jsonb_build_object(
    'vertical', vp.vertical,
    'label', vp.label,
    'description', vp.description,
    'carriers', COALESCE((
      SELECT jsonb_agg(c.name ORDER BY c.name)
      FROM public.carriers c
      WHERE c.vertical = vp.vertical AND c.active AND c.public
    ), '[]'::jsonb),
    'ranks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', r.name,
        'value', CASE WHEN _publish THEN (
          SELECT rs.value FROM public.rank_stacks rs
          WHERE rs.rank_id = r.id AND rs.vertical = vp.vertical AND rs.confirmed
          ORDER BY rs.value DESC LIMIT 1
        ) ELSE NULL END
      ) ORDER BY r.sort_order)
      FROM public.ranks r
    ), '[]'::jsonb),
    'leads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'intro', p.manager_intro
      ) ORDER BY p.full_name)
      FROM public.profiles p
      WHERE COALESCE(p.runs_vertical, false) = true
        AND lower(COALESCE(p.vertical, '')) = lower(vp.vertical)
        AND COALESCE(p.archived, false) = false
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.vertical_paths vp
  WHERE lower(vp.vertical) = lower(p_vertical);

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_industry(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_industry(text) TO anon, authenticated, service_role;