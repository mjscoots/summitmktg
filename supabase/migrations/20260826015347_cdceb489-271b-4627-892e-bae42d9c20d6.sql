REVOKE ALL ON FUNCTION public.tg_staff_access_on_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_staff_access_on_vertical() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_staff_workspace_access(uuid) FROM anon, authenticated;