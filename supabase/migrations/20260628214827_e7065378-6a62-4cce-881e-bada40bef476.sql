
-- 1) profiles: drop broad authenticated SELECT that exposed email/phone
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- 2) inactivity_email_log: restrict to admins (remove managers)
DROP POLICY IF EXISTS "Managers can view inactivity email log" ON public.inactivity_email_log;

-- 3) rep_signups: scope manager SELECT to their own team_id (admins see all)
DROP POLICY IF EXISTS "Managers can view rep signups" ON public.rep_signups;
CREATE POLICY "Admins and team managers can view rep signups"
ON public.rep_signups FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'manager'::app_role)
    AND team_id IN (SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid())
  )
);

-- 4) team_notifications: remove team_wide public read; managers/admins only
DROP POLICY IF EXISTS "Managers and team-wide recipients can view team notifications" ON public.team_notifications;
DROP POLICY IF EXISTS "Users can dismiss team notifications" ON public.team_notifications;
CREATE POLICY "Managers and admins can view team notifications"
ON public.team_notifications FOR SELECT
USING (has_role(auth.uid(),'manager'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Managers and admins can update team notifications"
ON public.team_notifications FOR UPDATE
USING (has_role(auth.uid(),'manager'::app_role) OR has_role(auth.uid(),'admin'::app_role));

-- 5) weekly_one_on_ones_rookie: allow rookie to read their own
CREATE POLICY "Rookies can view their own 1:1 forms"
ON public.weekly_one_on_ones_rookie FOR SELECT
USING (auth.uid() = rookie_user_id);

-- 6) pitch-approval-videos: add UPDATE/DELETE for owner
CREATE POLICY "Users can delete own pitch videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pitch-approval-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update own pitch videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pitch-approval-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 7) Public bucket listing: drop overly broad SELECT policies (direct public URLs still work for public buckets)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat uploads" ON storage.objects;

-- 8) SECURITY DEFINER function executable hardening
-- Revoke anon EXECUTE on helpers that should not be callable without auth
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;

-- Revoke authenticated EXECUTE on internal/admin-only SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.auto_sync_all_edges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_training_points(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM authenticated;
