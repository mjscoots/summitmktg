-- Drop overly permissive update policy
DROP POLICY IF EXISTS "Users can update team notifications" ON public.team_notifications;

-- Create more restrictive update policy - users can only update to dismiss their own notifications
CREATE POLICY "Users can dismiss team notifications"
ON public.team_notifications
FOR UPDATE
USING (
  -- User must be authenticated and viewing a notification they can see
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    type = 'team_wide'
  )
)
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
);