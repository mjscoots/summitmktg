REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM anon;
REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM service_role;
GRANT EXECUTE ON FUNCTION public.rep_progress_summary() TO authenticated;