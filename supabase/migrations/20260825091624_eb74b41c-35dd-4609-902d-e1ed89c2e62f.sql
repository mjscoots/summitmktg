DROP POLICY IF EXISTS "backups_read_owner" ON storage.objects;
CREATE POLICY "backups_read_owner" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'owner'));