
-- Add office_name column to profiles (region already exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_name text;

-- Rename onboarding_status conceptually — it's already being used as pipeline_status
-- We'll keep using onboarding_status column but treat it as pipeline_status in the UI
-- Just ensure it has good defaults
COMMENT ON COLUMN public.profiles.onboarding_status IS 'Pipeline status: pending, contract_signed, info_added, onboarded, summer_ready';
