REVOKE EXECUTE ON FUNCTION public.audit_recruiting_leads() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.harden_application_submission() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.harden_recruiting_lead_submission() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.harden_vet_lead_submission() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_lead() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_win_to_chat() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sync_badges_leads() FROM anon, PUBLIC;