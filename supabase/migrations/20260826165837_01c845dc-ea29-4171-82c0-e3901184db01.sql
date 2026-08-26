REVOKE EXECUTE ON FUNCTION public.sales_log_after_insert() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_log_after_insert() TO authenticated;