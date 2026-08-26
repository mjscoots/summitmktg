-- Ambiguous overload: sync_staff_workspace_access() and sync_staff_workspace_access(uuid DEFAULT NULL)
-- both matched PERFORM public.sync_staff_workspace_access(), aborting every new-user transaction.
DROP TRIGGER IF EXISTS staff_access_on_role_change ON public.user_roles;
DROP FUNCTION IF EXISTS public.sync_staff_workspace_access();
GRANT EXECUTE ON FUNCTION public.sync_staff_workspace_access(uuid) TO authenticated, service_role;
