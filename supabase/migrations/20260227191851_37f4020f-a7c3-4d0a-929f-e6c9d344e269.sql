
DROP POLICY IF EXISTS "Managers can insert notifications for downline" ON public.user_notifications;
CREATE POLICY "Managers can insert notifications for downline"
  ON public.user_notifications FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  );
