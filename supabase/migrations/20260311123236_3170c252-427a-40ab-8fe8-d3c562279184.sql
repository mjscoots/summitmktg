
-- Create phone_numbers table for the Resources page
CREATE TABLE public.phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  label text DEFAULT 'General',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view phone numbers"
  ON public.phone_numbers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Managers can manage phone numbers"
  ON public.phone_numbers FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role)
  );
