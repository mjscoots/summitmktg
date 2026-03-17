
-- Add new columns to recruit_pipeline for unified spreadsheet
ALTER TABLE public.recruit_pipeline 
  ADD COLUMN IF NOT EXISTS position text DEFAULT '',
  ADD COLUMN IF NOT EXISTS interview_2_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS interview_3_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT '';
