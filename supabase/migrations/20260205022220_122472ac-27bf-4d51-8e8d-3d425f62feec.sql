-- ============================================================
-- Create get_pillar_team_members function
-- This function returns all team members for a pillar owner
-- ============================================================

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
  status user_status
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
    p.status
  FROM profiles p
  LEFT JOIN teams t ON p.team_id = t.id
  WHERE p.team_id = (
    SELECT id FROM teams WHERE leader_id = _pillar_user_id LIMIT 1
  )
  AND p.status <> 'nlc'
  AND p.user_id != _pillar_user_id
  ORDER BY p.full_name;
$$;

-- ============================================================
-- Create streak_breaks table for tracking broken streaks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.streak_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  manager_user_id uuid,
  team_id uuid REFERENCES public.teams(id),
  streak_count integer NOT NULL DEFAULT 0,
  broke_at timestamp with time zone NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on streak_breaks
ALTER TABLE public.streak_breaks ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can view streak breaks for their team
CREATE POLICY "Managers can view team streak breaks"
ON public.streak_breaks
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Users can insert their own streak breaks
CREATE POLICY "Users can insert own streak breaks"
ON public.streak_breaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Managers can update streak breaks (acknowledge)
CREATE POLICY "Managers can update streak breaks"
ON public.streak_breaks
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- Move Corey Morgan to PAPER ROUTE team
-- ============================================================

-- Update Corey Morgan's team_id and direct_manager
UPDATE profiles
SET team_id = (SELECT id FROM teams WHERE slug = 'paper-route'),
    direct_manager = 'Liam Gardner'
WHERE full_name ILIKE '%corey%morgan%'
   OR full_name = 'Corey John Haden Morgan';

-- Update Corey's direct reports to Paper Route team
UPDATE profiles
SET team_id = (SELECT id FROM teams WHERE slug = 'paper-route')
WHERE direct_manager ILIKE '%corey%morgan%';