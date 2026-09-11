REVOKE EXECUTE ON FUNCTION public.get_public_managers() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_managers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_managers() TO anon;