CREATE TABLE public.playbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL DEFAULT 'Pest',
  kind text NOT NULL CHECK (kind IN ('script','objection','close','talk_track','pricing','assumption')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  followup text,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  market text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_entries TO authenticated;
GRANT ALL ON public.playbook_entries TO service_role;

ALTER TABLE public.playbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read published playbook entries"
  ON public.playbook_entries FOR SELECT TO authenticated
  USING (
    published = true
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'owner'::app_role)
      OR is_president_of_vertical(vertical)
      OR EXISTS (
        SELECT 1 FROM public.rep_vertical_enrollments e
        WHERE e.user_id = auth.uid()
          AND e.vertical = playbook_entries.vertical
          AND e.status = 'active'
      )
    )
  );

CREATE POLICY "Staff read all playbook entries"
  ON public.playbook_entries FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_president_of_vertical(vertical)
  );

CREATE POLICY "Staff write playbook entries"
  ON public.playbook_entries FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_president_of_vertical(vertical)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_president_of_vertical(vertical)
  );

CREATE INDEX idx_playbook_entries_lookup ON public.playbook_entries (vertical, kind, sort_order);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_playbook_entries_search ON public.playbook_entries
  USING gin ((title || ' ' || body) gin_trgm_ops);

CREATE TRIGGER trg_playbook_entries_updated
  BEFORE UPDATE ON public.playbook_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();