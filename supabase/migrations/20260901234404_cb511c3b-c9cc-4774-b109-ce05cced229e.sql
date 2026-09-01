CREATE OR REPLACE FUNCTION public.pillar_link_ensure(_team_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _tok text;
BEGIN
  IF NOT public.can_manage_pillar(_uid, _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this pillar leader or the owner can do that.');
  END IF;
  SELECT token INTO _tok FROM public.pillar_links WHERE team_id = _team_id;
  IF _tok IS NULL THEN
    _tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.pillar_links (team_id, token, created_by) VALUES (_team_id, _tok, _uid);
  END IF;
  RETURN jsonb_build_object('success', true, 'token', _tok);
END;
$$;

CREATE OR REPLACE FUNCTION public.pillar_link_regenerate(_team_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tok text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
BEGIN
  IF NOT public.can_manage_pillar(_uid, _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this pillar leader or the owner can do that.');
  END IF;
  INSERT INTO public.pillar_links (team_id, token, created_by)
  VALUES (_team_id, _tok, _uid)
  ON CONFLICT (team_id) DO UPDATE SET token = _tok, created_by = _uid, updated_at = now();
  RETURN jsonb_build_object('success', true, 'token', _tok);
END;
$$;

REVOKE ALL ON FUNCTION public.pillar_link_ensure(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pillar_link_regenerate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pillar_link_ensure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pillar_link_regenerate(uuid) TO authenticated, service_role;