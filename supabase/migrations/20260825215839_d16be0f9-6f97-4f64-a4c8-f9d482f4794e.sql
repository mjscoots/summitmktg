CREATE OR REPLACE FUNCTION public.resolve_source_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _code text; _ref RECORD; _partner RECORD;
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
    RETURN jsonb_build_object(
      'source_type', CASE WHEN _ref.assigned_user_id IS NOT NULL THEN 'rep_referral' ELSE 'other' END,
      'source_code', _ref.code,
      'referrer_user_id', _ref.assigned_user_id
    );
  END IF;

  SELECT * INTO _partner FROM public.partners WHERE lower(code) = lower(_code) AND active LIMIT 1;
  IF _partner.id IS NOT NULL THEN
    RETURN jsonb_build_object('source_type','partner','source_code', _partner.code, 'partner_id', _partner.id);
  END IF;

  RETURN jsonb_build_object('source_type','organic','source_code', _code);
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_source_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_source_code(text) TO anon, authenticated, service_role;