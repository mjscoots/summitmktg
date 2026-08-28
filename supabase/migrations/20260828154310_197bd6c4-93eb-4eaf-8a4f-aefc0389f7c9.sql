ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS experience_level public.experience_level NOT NULL DEFAULT 'rookie';