
-- Allow managers to manage links (insert, update, delete)
DROP POLICY IF EXISTS "Managers can manage links" ON public.managed_links;
CREATE POLICY "Managers can manage links"
ON public.managed_links
FOR ALL
TO public
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Also allow owners explicitly
DROP POLICY IF EXISTS "Owners can manage links" ON public.managed_links;
CREATE POLICY "Owners can manage links"
ON public.managed_links
FOR ALL
TO public
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
