CREATE TABLE public.manual_read_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_slug text NOT NULL DEFAULT 'summer-sales-manual',
  completion_number integer NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_slug, completion_number)
);

ALTER TABLE public.manual_read_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
  ON public.manual_read_completions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON public.manual_read_completions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);