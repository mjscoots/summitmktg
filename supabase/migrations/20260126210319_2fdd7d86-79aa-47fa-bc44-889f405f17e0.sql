-- Create storage bucket for training videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-videos',
  'training-videos',
  true,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']::text[]
);

-- RLS Policy: Anyone can view/stream videos (public bucket)
CREATE POLICY "Public can view training videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-videos');

-- RLS Policy: Admins and Managers can upload videos
CREATE POLICY "Admins and Managers can upload training videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-videos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'manager')
  )
);

-- RLS Policy: Admins and Managers can update videos
CREATE POLICY "Admins and Managers can update training videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-videos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'manager')
  )
);

-- RLS Policy: Only Admins can delete videos
CREATE POLICY "Admins can delete training videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-videos' 
  AND public.has_role(auth.uid(), 'admin')
);