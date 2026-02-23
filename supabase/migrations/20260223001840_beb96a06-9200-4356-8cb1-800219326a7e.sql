
-- Create managed_links table for admin-managed links
CREATE TABLE public.managed_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  icon text DEFAULT 'link',
  target_role text NOT NULL DEFAULT 'all' CHECK (target_role IN ('rookie', 'manager', 'all')),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.managed_links ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active links
CREATE POLICY "Authenticated users can view active links"
ON public.managed_links FOR SELECT
USING (is_active = true);

-- Only admins can manage links
CREATE POLICY "Admins can manage links"
ON public.managed_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
