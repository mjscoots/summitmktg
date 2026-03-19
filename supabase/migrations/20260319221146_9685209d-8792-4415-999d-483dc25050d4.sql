
-- Fix: Add owner role to downline_edges SELECT policy
DROP POLICY IF EXISTS "Managers can view edges" ON public.downline_edges;
CREATE POLICY "Managers can view edges" ON public.downline_edges
  FOR SELECT TO public
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );

-- Also fix: owner should have ALL access to downline_edges (not just via admin policy)
DROP POLICY IF EXISTS "Admins can manage all edges" ON public.downline_edges;
CREATE POLICY "Admins can manage all edges" ON public.downline_edges
  FOR ALL TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );
