
CREATE TABLE public.recruit_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  recruit_name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  source text DEFAULT '',
  stage text NOT NULL DEFAULT 'new_lead',
  notes text DEFAULT '',
  next_follow_up date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recruit_pipeline ENABLE ROW LEVEL SECURITY;

-- Managers see only their own pipeline
CREATE POLICY "Users can manage own pipeline" ON public.recruit_pipeline
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins/owners can see all pipelines
CREATE POLICY "Admins can view all pipelines" ON public.recruit_pipeline
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_recruit_pipeline_updated_at
  BEFORE UPDATE ON public.recruit_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
