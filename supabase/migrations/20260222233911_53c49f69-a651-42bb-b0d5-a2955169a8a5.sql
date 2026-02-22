
-- Drop existing restrictive policies on video_progress
DROP POLICY IF EXISTS "Users can manage own video progress" ON video_progress;
DROP POLICY IF EXISTS "Managers and admins can view all video progress" ON video_progress;

-- Recreate as PERMISSIVE policies (default) so they OR together
CREATE POLICY "Users can manage own video progress"
ON video_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all video progress"
ON video_progress FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
