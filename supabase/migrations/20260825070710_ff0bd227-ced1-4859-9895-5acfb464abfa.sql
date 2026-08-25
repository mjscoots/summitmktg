-- 1. Referral codes: narrow read access
DROP POLICY IF EXISTS "Authenticated can read ref codes" ON public.recruiting_ref_codes;
CREATE POLICY "Admins and owners read ref codes"
ON public.recruiting_ref_codes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  OR assigned_user_id = auth.uid()
);

-- 2. Team scripts: scope to own team or leadership
DROP POLICY IF EXISTS "Authenticated users can view all team scripts" ON public.team_scripts;
CREATE POLICY "Team members and leadership view team scripts"
ON public.team_scripts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR team_id IN (SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 3. Quiz questions: drop the blanket authenticated read
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.quiz_questions;

-- 4. Applications: authenticated staff only
DROP POLICY IF EXISTS "Managers can view applications" ON public.applications;
CREATE POLICY "Staff can view applications"
ON public.applications FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- 5. Guard privileged profile fields from manager updates
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'owner') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'manager') AND auth.uid() <> NEW.user_id THEN
    NEW.approved := OLD.approved;
    NEW.status := OLD.status;
    NEW.cumulative_points := OLD.cumulative_points;
    NEW.legacy_points_snapshot := OLD.legacy_points_snapshot;
    NEW.user_id := OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_fields_trg ON public.profiles;
CREATE TRIGGER guard_profile_privileged_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();

-- 6. Chat uploads: scope inserts to the user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. Revoke anon EXECUTE on auth-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_assign_lead(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_lead(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_lead_board() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_leads() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_new_lead_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_recruiting_funnel() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_recruiting_leaderboard(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ref_code_leaderboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rep_scorecard(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sweep_speed_to_lead() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_my_lead(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_manual_lead(text, text, text, text, text) FROM anon;