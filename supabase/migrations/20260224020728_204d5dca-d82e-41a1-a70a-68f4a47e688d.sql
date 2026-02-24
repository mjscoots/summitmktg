CREATE TABLE IF NOT EXISTS public.celebration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  celebration_type TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, celebration_type)
);

ALTER TABLE public.celebration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own celebrations"
  ON public.celebration_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own celebrations"
  ON public.celebration_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all celebrations"
  ON public.celebration_log FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));