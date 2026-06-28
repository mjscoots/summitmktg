
CREATE TABLE public.manager_meeting_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_of)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_meeting_submissions TO authenticated;
GRANT ALL ON public.manager_meeting_submissions TO service_role;

ALTER TABLE public.manager_meeting_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own meeting submissions"
  ON public.manager_meeting_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can view all meeting submissions"
  ON public.manager_meeting_submissions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Managers can insert own meeting submissions"
  ON public.manager_meeting_submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'owner'::app_role)
    )
  );

CREATE POLICY "Managers can update own meeting submissions"
  ON public.manager_meeting_submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_manager_meeting_submissions_updated_at
  BEFORE UPDATE ON public.manager_meeting_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
