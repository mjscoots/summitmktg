CREATE OR REPLACE FUNCTION public.prep_roster()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  team_name text,
  role text,
  rep_year text,
  is_vet boolean,
  manager_user_id uuid,
  manager_name text,
  manager_team text,
  group_key text,
  group_label text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _all boolean;
BEGIN
  IF _me IS NULL THEN
    RETURN;
  END IF;

  _all := public.has_role(_me, 'admin') OR public.has_role(_me, 'owner');

  IF NOT _all AND NOT public.is_manager_tier(_me) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH people AS (
    SELECT p.user_id, p.full_name, p.avatar_url, p.team_id, p.manager_id, p.rep_year
    FROM public.profiles p
    WHERE p.status = 'active'
      AND COALESCE(p.archived, false) = false
      AND p.user_id <> _me
  ),
  scoped AS (
    SELECT pe.*
    FROM people pe
    WHERE _all
       OR pe.manager_id = _me
       OR EXISTS (
            SELECT 1 FROM public.downline_edges e
            WHERE e.parent_user_id = _me
              AND e.child_user_id = pe.user_id
              AND e.edge_type = 'manages'
          )
  )
  SELECT
    s.user_id,
    s.full_name,
    s.avatar_url,
    t.name::text AS team_name,
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = s.user_id ORDER BY ur.role LIMIT 1), 'rookie') AS role,
    s.rep_year::text,
    true AS is_vet,
    CASE WHEN m.user_id IS NOT NULL AND COALESCE(m.archived, false) = false THEN m.user_id END AS manager_user_id,
    m.full_name::text AS manager_name,
    mt.name::text AS manager_team,
    CASE
      WHEN m.user_id IS NULL OR COALESCE(m.archived, false) = true THEN 'unassigned'
      ELSE m.user_id::text
    END AS group_key,
    CASE
      WHEN m.user_id IS NULL OR COALESCE(m.archived, false) = true THEN 'Needs a manager'
      ELSE m.full_name::text
    END AS group_label
  FROM scoped s
  LEFT JOIN public.profiles m ON m.user_id = s.manager_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  LEFT JOIN public.teams mt ON mt.id = m.team_id
  ORDER BY 12, 2;
END;
$$;

REVOKE ALL ON FUNCTION public.prep_roster() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prep_roster() FROM anon;
GRANT EXECUTE ON FUNCTION public.prep_roster() TO authenticated;