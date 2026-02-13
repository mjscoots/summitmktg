-- Allow managers and admins to view all user roles (needed for manager/pillar dropdowns)
CREATE POLICY "Managers can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));