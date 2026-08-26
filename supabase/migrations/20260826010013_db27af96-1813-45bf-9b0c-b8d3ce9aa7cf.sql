ALTER TABLE public.recruiting_leads ADD COLUMN IF NOT EXISTS vertical text NULL;
CREATE INDEX IF NOT EXISTS idx_recruiting_leads_vertical ON public.recruiting_leads(vertical);