
DROP POLICY IF EXISTS "Managers can update pitch requests" ON public.pitch_approval_requests;
CREATE POLICY "Managers can update pitch requests"
  ON public.pitch_approval_requests FOR UPDATE
  USING (
    has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  );

DROP POLICY IF EXISTS "Managers can view all pitch requests" ON public.pitch_approval_requests;
CREATE POLICY "Managers can view all pitch requests"
  ON public.pitch_approval_requests FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  );
