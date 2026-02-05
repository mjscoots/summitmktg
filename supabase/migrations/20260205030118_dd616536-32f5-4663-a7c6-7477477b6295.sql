-- Add activity tracking fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active_now boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS time_this_week_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS week_start date DEFAULT date_trunc('week', CURRENT_DATE)::date;

-- Create index for efficient activity queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_profiles_team_activity ON public.profiles(team_id, last_active_at);

-- Create function to update activity status
CREATE OR REPLACE FUNCTION public.update_user_activity(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_week_start date;
BEGIN
  current_week_start := date_trunc('week', CURRENT_DATE)::date;
  
  UPDATE profiles
  SET 
    last_active_at = NOW(),
    is_active_now = true,
    -- Reset weekly time if new week
    week_start = CASE 
      WHEN week_start < current_week_start THEN current_week_start 
      ELSE week_start 
    END,
    time_this_week_minutes = CASE 
      WHEN week_start < current_week_start THEN 1 
      ELSE time_this_week_minutes + 1 
    END
  WHERE user_id = _user_id;
END;
$$;

-- Create function to mark inactive users (run periodically)
CREATE OR REPLACE FUNCTION public.mark_inactive_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET is_active_now = false
  WHERE is_active_now = true
  AND last_active_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Update get_pillar_team_members to return activity data
DROP FUNCTION IF EXISTS public.get_pillar_team_members(uuid);

CREATE OR REPLACE FUNCTION public.get_pillar_team_members(_pillar_user_id uuid)
RETURNS TABLE(
  profile_id uuid, 
  user_id uuid, 
  full_name text, 
  email text, 
  avatar_url text, 
  role app_role, 
  direct_manager text, 
  team_name text, 
  status user_status,
  last_active_at timestamp with time zone,
  is_active_now boolean,
  time_this_week_minutes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id as profile_id,
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(get_user_role(p.user_id), 'rookie') as role,
    p.direct_manager,
    t.name as team_name,
    p.status,
    p.last_active_at,
    p.is_active_now,
    COALESCE(p.time_this_week_minutes, 0) as time_this_week_minutes
  FROM profiles p
  LEFT JOIN teams t ON p.team_id = t.id
  WHERE p.team_id = (
    SELECT id FROM teams WHERE leader_id = _pillar_user_id LIMIT 1
  )
  AND p.status <> 'nlc'
  AND p.user_id != _pillar_user_id
  ORDER BY p.full_name;
$$;