REVOKE EXECUTE ON FUNCTION public.is_in_my_downline(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_revenue_month(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_rep_revenue(uuid, date, numeric, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_revenue_import(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_revenue_import(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_revenue() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_team_revenue() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_region_pace() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_session_prep(date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_in_my_downline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_month(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rep_revenue(uuid, date, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_revenue_import(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_revenue_import(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_revenue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_revenue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_region_pace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_prep(date) TO authenticated;