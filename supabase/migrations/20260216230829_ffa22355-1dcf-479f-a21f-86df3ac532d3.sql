
-- Add 'pending' and 'rejected' to user_status enum
ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add approved column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Add referred_by column to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;

-- Update the handle_new_user trigger to support approval flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  selected_role app_role;
  is_approved boolean;
BEGIN
  selected_role := COALESCE(
    (NEW.raw_user_meta_data->>'selected_role')::app_role,
    'rookie'
  );
  
  is_approved := COALESCE(
    (NEW.raw_user_meta_data->>'approved')::boolean,
    false
  );

  INSERT INTO public.profiles (user_id, email, full_name, phone, direct_manager, recruiter, status, approved, referred_by)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'direct_manager',
    NEW.raw_user_meta_data->>'recruiter',
    CASE WHEN is_approved THEN 'active'::user_status ELSE 'pending'::user_status END,
    is_approved,
    NEW.raw_user_meta_data->>'referred_by'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$$;
