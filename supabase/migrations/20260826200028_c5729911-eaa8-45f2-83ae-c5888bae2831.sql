REVOKE ALL ON FUNCTION public.invite_preview(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_preview(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.invite_preview(text) TO authenticated, service_role;