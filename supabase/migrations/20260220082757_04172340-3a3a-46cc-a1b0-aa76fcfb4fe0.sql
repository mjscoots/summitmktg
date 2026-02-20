
-- Fix lesson_progress: admin can't see other users' progress
DROP POLICY IF EXISTS "Managers can view all lesson progress" ON public.lesson_progress;
CREATE POLICY "Managers and admins can view all lesson progress"
  ON public.lesson_progress
  FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix video_progress: admin can't see other users' progress  
DROP POLICY IF EXISTS "Managers can view all video progress" ON public.video_progress;
CREATE POLICY "Managers and admins can view all video progress"
  ON public.video_progress
  FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
