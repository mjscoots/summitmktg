CREATE OR REPLACE FUNCTION public.protect_privileged_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / backend jobs
  END IF;

  is_staff := public.has_role(auth.uid(),'manager')
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'owner');

  IF is_staff THEN
    RETURN NEW;
  END IF;

  -- regular users cannot change privileged fields on their own row
  NEW.approved := OLD.approved;
  NEW.status := OLD.status;
  NEW.cumulative_points := OLD.cumulative_points;
  NEW.team_id := OLD.team_id;
  NEW.direct_manager := OLD.direct_manager;
  NEW.roster_state := OLD.roster_state;
  NEW.archived := OLD.archived;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_fields_trg ON public.profiles;
CREATE TRIGGER protect_privileged_profile_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_fields();