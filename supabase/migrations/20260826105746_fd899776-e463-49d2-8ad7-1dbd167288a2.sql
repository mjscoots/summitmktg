REVOKE ALL ON FUNCTION public.company_timezone() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_daily_time(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_activity_ping(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_training_recap(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_daily_time(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity_ping(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_recap(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_timezone() TO authenticated, service_role;