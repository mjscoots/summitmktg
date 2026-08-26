CREATE TABLE public.life_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  phone text,
  stage text NOT NULL DEFAULT 'New',
  next_step text,
  next_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_pipeline TO authenticated;
GRANT ALL ON public.life_pipeline TO service_role;

ALTER TABLE public.life_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own pipeline read" ON public.life_pipeline
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own pipeline insert" ON public.life_pipeline
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own pipeline update" ON public.life_pipeline
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own pipeline delete" ON public.life_pipeline
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Chain and staff read pipeline" ON public.life_pipeline
  FOR SELECT TO authenticated USING (public.can_view_person(user_id) IN ('self','manager','staff'));

CREATE INDEX life_pipeline_user_stage_idx ON public.life_pipeline (user_id, stage);

CREATE TRIGGER life_pipeline_updated_at
  BEFORE UPDATE ON public.life_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.verticals
SET theme = jsonb_build_object(
  'mode', 'light',
  'background', '40 25% 96%',
  'surface', '0 0% 100%',
  'foreground', '220 51% 16%',
  'muted', '35 8% 38%',
  'border', '38 15% 87%',
  'accent', '178 50% 33%',
  'accent_foreground', '0 0% 100%',
  'headings', 'serif',
  'texture', 'none',
  'texture_opacity', 0
)
WHERE vertical = 'Life';