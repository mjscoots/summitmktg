REVOKE ALL ON FUNCTION public.validate_managed_link_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_managed_link_owner() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_managed_link_owner() TO service_role;