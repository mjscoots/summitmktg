
-- Fix 1: Allow all authenticated users to see basic profile info (needed for chat names, leaderboard, etc.)
-- Rookies currently can only see their own profile, so chat shows "Team Member" for everyone else
CREATE POLICY "Authenticated users can view active profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (status <> 'nlc'::user_status);

-- Fix 2: Allow all authenticated users to read user_roles
-- Rookies currently can only see their own role, so leaderboard queries for all rookies return only themselves
CREATE POLICY "Authenticated users can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);
