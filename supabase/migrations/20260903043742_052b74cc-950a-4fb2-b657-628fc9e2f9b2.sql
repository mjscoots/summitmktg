CREATE POLICY "Own chat wallpaper is readable" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own chat wallpaper can be uploaded" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own chat wallpaper can be replaced" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own chat wallpaper can be removed" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text);