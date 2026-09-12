ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS wants_call boolean NOT NULL DEFAULT false;