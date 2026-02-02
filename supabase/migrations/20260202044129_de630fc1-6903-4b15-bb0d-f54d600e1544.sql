-- =============================================
-- SUMMIT MKTG SYSTEM OVERHAUL - PHASE 1
-- Teams, Hierarchy, and Auth Enhancements
-- =============================================

-- 1. Create teams table for fixed pillars
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  leader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Everyone can view teams
CREATE POLICY "Authenticated users can view teams" ON public.teams
  FOR SELECT USING (true);

-- Only admins can manage teams
CREATE POLICY "Admins can manage teams" ON public.teams
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 2. Add team_id to profiles for team membership
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 3. Add password_changed flag to track first-time login requirement
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS password_changed boolean DEFAULT false;

-- 4. Add otp_verified flag to track first-time OTP verification
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS otp_verified boolean DEFAULT false;

-- 5. Update calendar_events to support team-specific and role-specific events
ALTER TABLE public.calendar_events 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_role app_role;

-- 6. Create index for faster team lookups
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_direct_manager ON public.profiles(direct_manager);

-- 7. Insert the fixed team pillars
INSERT INTO public.teams (name, slug) VALUES
  ('Mafia', 'mafia'),
  ('Quality Control', 'quality-control'),
  ('Altitude', 'altitude'),
  ('Atlas', 'atlas'),
  ('Apex', 'apex'),
  ('Minions', 'minions'),
  ('Paper Route', 'paper-route')
ON CONFLICT (slug) DO NOTHING;

-- 8. Update RLS on profiles to allow managers to view team members
DROP POLICY IF EXISTS "Managers can view rookie profiles" ON public.profiles;

CREATE POLICY "Managers can view team and rookie profiles" ON public.profiles
  FOR SELECT USING (
    -- Admins see all
    has_role(auth.uid(), 'admin') OR
    -- Users see own profile
    auth.uid() = user_id OR
    -- Managers see rookies (excluding NLC)
    (has_role(auth.uid(), 'manager') AND status <> 'nlc')
  );

-- 9. Create function to get user's full downline (for My Team view)
CREATE OR REPLACE FUNCTION public.get_user_downline(_manager_name text)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role app_role,
  direct_manager text,
  team_name text,
  depth int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE downline AS (
    -- Direct reports
    SELECT 
      p.id as profile_id,
      p.user_id,
      p.full_name,
      p.email,
      COALESCE(get_user_role(p.user_id), 'rookie') as role,
      p.direct_manager,
      t.name as team_name,
      1 as depth
    FROM profiles p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.direct_manager = _manager_name
      AND p.status <> 'nlc'
    
    UNION ALL
    
    -- Indirect reports (recursive)
    SELECT 
      p.id as profile_id,
      p.user_id,
      p.full_name,
      p.email,
      COALESCE(get_user_role(p.user_id), 'rookie') as role,
      p.direct_manager,
      t.name as team_name,
      d.depth + 1
    FROM profiles p
    LEFT JOIN teams t ON p.team_id = t.id
    INNER JOIN downline d ON p.direct_manager = d.full_name
    WHERE p.status <> 'nlc'
      AND d.depth < 10 -- Prevent infinite loops
  )
  SELECT * FROM downline ORDER BY depth, full_name;
$$;