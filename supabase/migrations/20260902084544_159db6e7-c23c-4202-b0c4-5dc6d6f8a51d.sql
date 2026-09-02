DROP POLICY IF EXISTS "Fiber members read general rules" ON public.fiber_rules;
CREATE POLICY "Fiber members read general rules"
ON public.fiber_rules FOR SELECT TO authenticated
USING (
  (leader_only = false AND public.is_vertical_member(auth.uid(), 'Fiber'))
  OR public.is_effective_manager(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);