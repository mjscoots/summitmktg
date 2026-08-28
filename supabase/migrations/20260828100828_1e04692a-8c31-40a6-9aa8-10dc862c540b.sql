REVOKE ALL ON FUNCTION public.create_seat_invite(uuid, integer) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_seat_invite(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.set_manager_seat(uuid, boolean) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.seat_set_manager(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.seats_rows() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.manager_owed(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.owed_by_manager() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_effective_manager(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_seat_invite(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_seat_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_manager_seat(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seat_set_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seats_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_owed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owed_by_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_effective_manager(uuid) TO authenticated;