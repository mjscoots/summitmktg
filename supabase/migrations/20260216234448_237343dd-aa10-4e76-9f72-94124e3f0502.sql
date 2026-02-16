
-- Rename existing video columns to match new naming
ALTER TABLE public.bootcamp_progress 
  ADD COLUMN IF NOT EXISTS sunblock_video_url text,
  ADD COLUMN IF NOT EXISTS motivation_video_url text,
  ADD COLUMN IF NOT EXISTS final_commitment_video_url text,
  ADD COLUMN IF NOT EXISTS agreement_start_date date,
  ADD COLUMN IF NOT EXISTS agreement_end_date date;

-- Migrate old data if any exists
UPDATE public.bootcamp_progress SET motivation_video_url = phase_2_video_url WHERE phase_2_video_url IS NOT NULL AND motivation_video_url IS NULL;
UPDATE public.bootcamp_progress SET final_commitment_video_url = phase_3_video_url WHERE phase_3_video_url IS NOT NULL AND final_commitment_video_url IS NULL;
UPDATE public.bootcamp_progress SET agreement_start_date = commitment_start_date WHERE commitment_start_date IS NOT NULL AND agreement_start_date IS NULL;
UPDATE public.bootcamp_progress SET agreement_end_date = commitment_end_date WHERE commitment_end_date IS NOT NULL AND agreement_end_date IS NULL;
