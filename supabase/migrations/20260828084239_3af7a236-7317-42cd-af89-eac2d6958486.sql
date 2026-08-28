DROP POLICY IF EXISTS "Signed-in users read active scripts" ON public.scripts;

CREATE POLICY "Signed-in users read active scripts"
ON public.scripts
FOR SELECT
TO authenticated
USING (
  (is_active AND (category <> 'Re-sign' OR public.is_manager_tier(auth.uid())))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);