DROP POLICY IF EXISTS "rank_stacks confirmed in my vertical" ON public.rank_stacks;
CREATE POLICY "rank_stacks confirmed in my vertical"
ON public.rank_stacks
FOR SELECT
USING (
  ((confirmed = true) AND is_vertical_member(auth.uid(), vertical))
  OR is_president_of_vertical(vertical)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);