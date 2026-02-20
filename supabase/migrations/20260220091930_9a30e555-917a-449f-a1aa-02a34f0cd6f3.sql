
-- Allow rookies to see other rookies' lesson progress for leaderboard
-- This mirrors the existing pattern on daily_login_streaks and leaderboard_points
CREATE POLICY "Rookies can view rookie lesson progress"
  ON public.lesson_progress
  FOR SELECT
  USING (
    (get_user_role(auth.uid()) = 'rookie'::app_role)
    AND (get_user_role(user_id) = 'rookie'::app_role)
  );
