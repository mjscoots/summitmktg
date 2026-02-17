
-- The INSERT, user SELECT, and UPDATE policies were created successfully before the error.
-- Now just add the remaining policies with unique names.
CREATE POLICY "Managers can view all bootcamp videos v2"
ON storage.objects FOR SELECT
USING (bucket_id = 'bootcamp-videos' AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can manage all bootcamp videos v2"
ON storage.objects FOR ALL
USING (bucket_id = 'bootcamp-videos' AND public.has_role(auth.uid(), 'admin'));
