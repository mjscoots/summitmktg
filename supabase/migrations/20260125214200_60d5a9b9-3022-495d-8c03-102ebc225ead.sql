-- Create access_codes table for admin-configurable codephrase
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage access codes
CREATE POLICY "Only admins can manage access codes"
  ON public.access_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create signup_logs table to track all successful signups
CREATE TABLE public.signup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  direct_manager text NOT NULL,
  role text NOT NULL,
  signed_up_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and managers can view signup logs
CREATE POLICY "Admins can manage signup logs"
  ON public.signup_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view signup logs"
  ON public.signup_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

-- Add phone and direct_manager to profiles if not exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS direct_manager text;

-- Create function to validate access code (case-insensitive, uses hash comparison)
CREATE OR REPLACE FUNCTION public.validate_access_code(input_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_codes
    WHERE is_active = true
      AND code_hash = encode(sha256(lower(input_code)::bytea), 'hex')
  )
$$;

-- Create function to set access code (admin only, stores as hash)
CREATE OR REPLACE FUNCTION public.set_access_code(new_code text, code_description text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Deactivate all existing codes
  UPDATE public.access_codes SET is_active = false, updated_at = now();
  
  -- Insert new code as hash
  INSERT INTO public.access_codes (code_hash, description, is_active)
  VALUES (encode(sha256(lower(new_code)::bytea), 'hex'), code_description, true)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Insert a default access code (change this immediately via admin)
-- Default code: "summit2025" (stored as hash)
INSERT INTO public.access_codes (code_hash, description, is_active)
VALUES (encode(sha256('summit2025'::bytea), 'hex'), 'Default access code - change immediately', true);

-- Update handle_new_user to accept metadata for role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
BEGIN
  -- Get role from metadata, default to rookie
  selected_role := COALESCE(
    (NEW.raw_user_meta_data->>'selected_role')::app_role,
    'rookie'
  );

  INSERT INTO public.profiles (user_id, email, full_name, phone, direct_manager)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'direct_manager'
  );
  
  -- Assign selected role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$$;