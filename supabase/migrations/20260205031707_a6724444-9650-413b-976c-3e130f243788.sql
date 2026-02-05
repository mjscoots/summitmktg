-- Update get_pillar_team_members to use BOTH team_id AND recursive downline
-- Using plpgsql for complex recursive logic
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pillar_name text;
  pillar_team_id uuid;
BEGIN
  -- Get pillar info
  SELECT p.full_name, COALESCE(p.team_id, t.id)
  INTO pillar_name, pillar_team_id
  FROM profiles p
  LEFT JOIN teams t ON t.leader_id = p.user_id
  WHERE p.user_id = _pillar_user_id;

  -- Return all members from both team_id AND recursive downline
  RETURN QUERY
  WITH RECURSIVE downline AS (
    -- Direct reports
    SELECT p.user_id, 1 as depth
    FROM profiles p
    WHERE p.direct_manager = pillar_name
      AND p.status <> 'nlc'
    
    UNION ALL
    
    -- Recursive reports
    SELECT p.user_id, d.depth + 1
    FROM profiles p
    INNER JOIN downline d ON p.direct_manager = (
      SELECT pr.full_name FROM profiles pr WHERE pr.user_id = d.user_id
    )
    WHERE p.status <> 'nlc' AND d.depth < 10
  ),
  all_member_ids AS (
    -- Members from downline
    SELECT dl.user_id FROM downline dl
    UNION
    -- Members by team_id
    SELECT p.user_id 
    FROM profiles p 
    WHERE p.team_id = pillar_team_id 
      AND p.status <> 'nlc'
      AND p.user_id != _pillar_user_id
  )
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
  INNER JOIN all_member_ids ami ON p.user_id = ami.user_id
  ORDER BY 
    CASE COALESCE(get_user_role(p.user_id), 'rookie')
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'rookie' THEN 3
    END,
    p.full_name;
END;
$$;

-- Also update Liam Gardner's team_id to Paper Route
UPDATE profiles
SET team_id = '2319c15f-5948-4084-a629-76f2287a51ba'
WHERE user_id = '1e309570-12f5-4c91-b1ce-254169ee6a7e'
  AND team_id IS NULL;