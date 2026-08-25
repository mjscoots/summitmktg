CREATE POLICY "Staff read revenue import images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'revenue-imports' AND public.is_staff_data_reader());

CREATE POLICY "Staff upload revenue import images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'revenue-imports' AND public.is_staff_data_reader());

CREATE POLICY "Staff delete revenue import images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'revenue-imports' AND public.is_staff_data_reader());