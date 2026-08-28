ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS first_touch_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_application(_id uuid, _assignee uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _target uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not signed in'); END IF;

  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');

  IF NOT (_is_admin OR public.has_role(auth.uid(), 'manager')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not allowed');
  END IF;

  IF _assignee IS NOT NULL AND _assignee <> auth.uid() AND NOT _is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'only owner or admin can reassign');
  END IF;

  _target := COALESCE(_assignee, auth.uid());

  UPDATE public.applications
     SET reviewed_by = _target
   WHERE id = _id;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'application not found'); END IF;

  RETURN jsonb_build_object('ok', true, 'reviewed_by', _target);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_application_first_touch(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not signed in'); END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
          OR public.has_role(auth.uid(), 'manager')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not allowed');
  END IF;

  UPDATE public.applications
     SET first_touch_at = COALESCE(first_touch_at, now()),
         reviewed_by = COALESCE(reviewed_by, auth.uid())
   WHERE id = _id;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'application not found'); END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.applications_pulse()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')) THEN
    RETURN jsonb_build_object('waiting', 0, 'oldest_hours', 0, 'unclaimed', 0, 'sources', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'waiting', COUNT(*) FILTER (WHERE status = 'pending'),
    'oldest_hours', COALESCE(
      FLOOR(EXTRACT(EPOCH FROM (now() - MIN(created_at) FILTER (WHERE status = 'pending'))) / 3600), 0),
    'unclaimed', COUNT(*) FILTER (WHERE status = 'pending' AND reviewed_by IS NULL),
    'sources', COALESCE((
      SELECT jsonb_agg(s ORDER BY s->>'label')
      FROM (
        SELECT jsonb_build_object('label', COALESCE(NULLIF(TRIM(source_type), ''), 'unknown'), 'count', COUNT(*)) AS s
        FROM public.applications
        WHERE created_at >= date_trunc('month', now())
        GROUP BY COALESCE(NULLIF(TRIM(source_type), ''), 'unknown')
      ) q
    ), '[]'::jsonb)
  )
  INTO _out
  FROM public.applications;

  RETURN _out;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_application(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_application_first_touch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.applications_pulse() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_application_first_touch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.applications_pulse() TO authenticated;