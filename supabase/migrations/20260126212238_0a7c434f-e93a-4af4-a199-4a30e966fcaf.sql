-- Fix: Make training-videos bucket private and require authentication

-- Step 1: Update bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'training-videos';

-- Step 2: Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view training videos" ON storage.objects;

-- Step 3: Create authenticated-only view policy
CREATE POLICY "Authenticated users can view training videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-videos' 
  AND auth.uid() IS NOT NULL
);