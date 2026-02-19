-- Allow users to update (re-upload) their own bootcamp videos
CREATE POLICY "Users can update own bootcamp videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bootcamp-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own bootcamp videos (needed for upsert edge cases)
CREATE POLICY "Users can delete own bootcamp videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bootcamp-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);