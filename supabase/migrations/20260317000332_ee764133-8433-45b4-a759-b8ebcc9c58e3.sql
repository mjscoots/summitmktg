CREATE TABLE public.manager_spreadsheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.manager_spreadsheets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active spreadsheets
CREATE POLICY "Authenticated users can view spreadsheets"
  ON public.manager_spreadsheets FOR SELECT TO authenticated
  USING (is_active = true);

-- Only admins/owners can insert/update/delete
CREATE POLICY "Admins can manage spreadsheets"
  ON public.manager_spreadsheets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));