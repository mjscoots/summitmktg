-- Allow owners to view all bootcamp progress (checklist videos)
CREATE POLICY "Owners can view all bootcamp progress"
ON public.bootcamp_progress
FOR SELECT
USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Allow owners to manage all bootcamp progress
CREATE POLICY "Owners can manage all bootcamp progress"
ON public.bootcamp_progress
FOR ALL
USING (public.has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));