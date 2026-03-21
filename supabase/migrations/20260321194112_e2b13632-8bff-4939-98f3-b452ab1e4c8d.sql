-- Update handle_new_user trigger to auto-reject fake/test accounts on creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _email text;
  _name text;
  _is_fake boolean := false;
BEGIN
  _email := LOWER(COALESCE(NEW.email, ''));
  _name := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')));

  -- Detect fake/test/security-scan accounts
  IF _name IN ('new user', 'test user', 'test', 'admin') THEN
    _is_fake := true;
  END IF;
  IF _email LIKE '%example.invalid%' OR _email LIKE '%poc-%' OR _email LIKE '%inject%' 
     OR _email LIKE '%xss%' OR _email LIKE '%sqli%' OR _email LIKE '%rce%' 
     OR _email LIKE '%bypass%' OR _email LIKE '%pentest%' THEN
    _is_fake := true;
  END IF;

  IF _is_fake THEN
    -- Auto-reject: set approved = NULL, status = 'rejected' so they never appear in any queue
    INSERT INTO public.profiles (user_id, email, full_name, approved, status, onboarding_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      NULL,
      'rejected',
      'pending'
    );
    RETURN NEW;
  END IF;

  -- Normal user creation
  INSERT INTO public.profiles (user_id, email, full_name, approved, status, onboarding_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false,
    'active',
    'pending'
  );

  -- Assign default rookie role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'rookie')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;