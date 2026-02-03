-- Add storage policies for admin team logo uploads
CREATE POLICY "Admins can upload team logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'team-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update team logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'team-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete team logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'team-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
);