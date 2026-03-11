DROP POLICY "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins and owners can manage teams" ON public.teams
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)
  );