DROP TRIGGER IF EXISTS refuse_self_privileged_profile_edit_trg ON public.profiles;
CREATE TRIGGER a_refuse_self_privileged_profile_edit_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.refuse_self_privileged_profile_edit();