CREATE OR REPLACE FUNCTION public.admin_set_recruiter_role(_user_id uuid, _on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'owner'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authorized');
  END IF;

  IF _on THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'recruiter'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'recruiter'::app_role;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_recruiter_role(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_recruiter_role(uuid, boolean) TO authenticated, service_role;