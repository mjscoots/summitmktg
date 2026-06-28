
-- 1) Tighten broad public-role SELECT policies to authenticated only
DROP POLICY IF EXISTS "Authenticated users can view calendar events" ON public.calendar_events;
CREATE POLICY "Authenticated users can view calendar events" ON public.calendar_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view active channels" ON public.chat_channels;
CREATE POLICY "Authenticated users can view active channels" ON public.chat_channels
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can view active links" ON public.managed_links;
CREATE POLICY "Authenticated users can view active links" ON public.managed_links
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
CREATE POLICY "Authenticated users can view teams" ON public.teams
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read training content" ON public.training_content;
CREATE POLICY "Authenticated users can read training content" ON public.training_content
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read content versions" ON public.training_content_versions;
CREATE POLICY "Authenticated users can read content versions" ON public.training_content_versions
  FOR SELECT TO authenticated USING (true);

-- 2) team_notifications: require authenticated
DROP POLICY IF EXISTS "Managers can view team notifications" ON public.team_notifications;
CREATE POLICY "Managers and team-wide recipients can view team notifications"
  ON public.team_notifications FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR type = 'team_wide'
    )
  );

DROP POLICY IF EXISTS "Users can dismiss team notifications" ON public.team_notifications;
CREATE POLICY "Users can dismiss team notifications"
  ON public.team_notifications FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR type = 'team_wide'
    )
  )
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3) Rookies should only see their own streak / lesson progress
DROP POLICY IF EXISTS "Rookies can view rookie streaks" ON public.daily_login_streaks;
DROP POLICY IF EXISTS "Rookies can view rookie lesson progress" ON public.lesson_progress;

-- 4) Chat uploads: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view chat uploads" ON storage.objects;
CREATE POLICY "Authenticated users can view chat uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-uploads');

-- 5) profiles: column-level grants so peer reps cannot read sensitive contact fields
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, user_id, full_name, nickname, avatar_url, status, is_active_now,
  last_active_at, time_this_week_minutes, week_start, team_id, pillar_slug,
  cumulative_points, tour_completed, created_at, updated_at, experience,
  approved, onboarding_status, direct_manager, recruiter, region, timezone,
  legacy_points_snapshot
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_profile_contact(_user_id uuid)
RETURNS TABLE(user_id uuid, email text, phone text, calendly_url text, revenue_goal numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF auth.uid() = _user_id
     OR has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'owner'::app_role)
     OR has_role(auth.uid(), 'manager'::app_role) THEN
    RETURN QUERY
      SELECT p.user_id, p.email, p.phone, p.calendly_url, p.revenue_goal
      FROM public.profiles p WHERE p.user_id = _user_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_contact(uuid) TO authenticated;

-- 6) Revoke EXECUTE from anon/authenticated on all SECURITY DEFINER public functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                     r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- Re-grant EXECUTE only to RPCs the app uses (with correct signatures)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.award_training_points(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_time_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_downline_from_edges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pillar_team_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_leaderboard_panel(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_downline(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_login(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_time(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_sync_all_edges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_points_breakdown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_access_code(text) TO anon, authenticated;
