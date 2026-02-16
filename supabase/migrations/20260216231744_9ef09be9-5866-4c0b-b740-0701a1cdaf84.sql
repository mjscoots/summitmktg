CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  selected_role app_role;
  is_approved boolean;
  signup_team_id uuid;
BEGIN
  selected_role := COALESCE(
    (NEW.raw_user_meta_data->>'selected_role')::app_role,
    'rookie'
  );
  
  is_approved := COALESCE(
    (NEW.raw_user_meta_data->>'approved')::boolean,
    false
  );

  -- Try to cast team_id from metadata
  BEGIN
    signup_team_id := (NEW.raw_user_meta_data->>'team_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    signup_team_id := NULL;
  END;

  INSERT INTO public.profiles (user_id, email, full_name, phone, direct_manager, recruiter, status, approved, referred_by, team_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'direct_manager',
    NEW.raw_user_meta_data->>'recruiter',
    CASE WHEN is_approved THEN 'active'::user_status ELSE 'pending'::user_status END,
    is_approved,
    NEW.raw_user_meta_data->>'referred_by',
    signup_team_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$function$;

-- Also add RLS policies for teams table to allow admins full control and authenticated users to read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Admins can manage teams') THEN
    CREATE POLICY "Admins can manage teams" ON public.teams FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Authenticated users can view teams') THEN
    CREATE POLICY "Authenticated users can view teams" ON public.teams FOR SELECT USING (true);
  END IF;
END $$;

-- Ensure RLS is enabled on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;