
-- Add is_required column to training_videos
ALTER TABLE public.training_videos 
ADD COLUMN is_required boolean NOT NULL DEFAULT true;

-- Set Manager Training and Zoom Trainings videos as bonus (not required)
UPDATE public.training_videos 
SET is_required = false 
WHERE category IN ('Manager Training', 'Zoom Trainings');
