
CREATE TABLE public.managed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  label text DEFAULT 'General',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.managed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active emails" ON public.managed_emails FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Managers+ can insert emails" ON public.managed_emails FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'owner'))
);
CREATE POLICY "Managers+ can update emails" ON public.managed_emails FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'owner'))
);
CREATE POLICY "Managers+ can delete emails" ON public.managed_emails FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'owner'))
);
