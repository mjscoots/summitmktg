CREATE OR REPLACE FUNCTION public.recompute_missing_ranks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _fixed int := 0;
  _row record;
  _rank_id uuid;
  _rank_name text;
  _actor text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  SELECT full_name INTO _actor FROM public.profiles WHERE user_id = auth.uid();

  FOR _row IN
    SELECT p.user_id, p.full_name, p.experience::text AS experience
      FROM public.profiles p
     WHERE p.status = 'active' AND p.archived = false AND p.rank_id IS NULL
  LOOP
    _rank_name := CASE
      WHEN public.has_role(_row.user_id, 'manager') THEN 'Manager'
      WHEN _row.experience = 'veteran' THEN 'Rep'
      ELSE 'Rookie' END;
    SELECT id INTO _rank_id FROM public.ranks WHERE name = _rank_name;
    IF _rank_id IS NULL THEN CONTINUE; END IF;

    UPDATE public.profiles SET rank_id = _rank_id WHERE user_id = _row.user_id AND rank_id IS NULL;
    _fixed := _fixed + 1;

    INSERT INTO public.audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, field, before_value, after_value)
    VALUES (auth.uid(), COALESCE(_actor,'Admin'), 'rank_backfill', 'profiles', _row.user_id::text, _row.full_name, 'rank', NULL, _rank_name);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'fixed', _fixed);
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_missing_ranks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_missing_ranks() TO authenticated, service_role;