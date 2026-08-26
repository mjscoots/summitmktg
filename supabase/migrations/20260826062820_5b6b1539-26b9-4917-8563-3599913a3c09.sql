REVOKE ALL ON FUNCTION public.harden_application_submission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.harden_vet_lead_submission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.harden_recruiting_lead_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.harden_application_submission() TO service_role;
GRANT EXECUTE ON FUNCTION public.harden_vet_lead_submission() TO service_role;
GRANT EXECUTE ON FUNCTION public.harden_recruiting_lead_submission() TO service_role;