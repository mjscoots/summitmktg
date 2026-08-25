REVOKE ALL ON FUNCTION public.notify_new_lead() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_announcement_published() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_application_approved() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_lead_expiry_warnings() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.release_stale_leads() TO authenticated;
REVOKE ALL ON FUNCTION public.release_stale_leads() FROM anon;
