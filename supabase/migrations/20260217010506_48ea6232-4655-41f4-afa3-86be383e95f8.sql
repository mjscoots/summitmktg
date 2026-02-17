
-- Add bootcamp_exempt flag to bootcamp_progress
ALTER TABLE public.bootcamp_progress ADD COLUMN IF NOT EXISTS bootcamp_exempt boolean NOT NULL DEFAULT false;

-- Ensure the bootcamp_required setting exists
INSERT INTO public.app_settings (key, value)
VALUES ('bootcamp_required', 'true')
ON CONFLICT (key) DO NOTHING;
