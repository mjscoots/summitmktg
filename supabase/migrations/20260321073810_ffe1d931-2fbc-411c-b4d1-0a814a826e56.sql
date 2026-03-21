
-- Create a robust function to sync edges using fuzzy name matching via NAME_ALIASES logic
-- This handles the core issue: direct_manager text like "Hunter Terry Shannon" 
-- needs to match profile "Hunter shannon"

CREATE OR REPLACE FUNCTION public.auto_sync_all_edges()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _synced integer := 0;
  _team_fixed integer := 0;
  _errors integer := 0;
  _rec record;
  _manager_id uuid;
  _manager_team_id uuid;
BEGIN
  -- For each active profile that has a direct_manager text but no edge
  FOR _rec IN
    SELECT p.user_id, p.full_name, p.direct_manager, p.team_id
    FROM profiles p
    WHERE p.status != 'nlc'
      AND p.direct_manager IS NOT NULL
      AND p.direct_manager != ''
      AND NOT EXISTS (
        SELECT 1 FROM downline_edges de 
        WHERE de.child_user_id = p.user_id AND de.edge_type = 'manages'
      )
  LOOP
    -- Try to find manager by exact match first, then normalized match
    SELECT m.user_id, m.team_id INTO _manager_id, _manager_team_id
    FROM profiles m
    WHERE m.status != 'nlc'
      AND (
        -- Exact match
        LOWER(TRIM(m.full_name)) = LOWER(TRIM(_rec.direct_manager))
        -- Match without middle names: first + last
        OR (
          SPLIT_PART(LOWER(TRIM(m.full_name)), ' ', 1) = SPLIT_PART(LOWER(TRIM(_rec.direct_manager)), ' ', 1)
          AND SPLIT_PART(LOWER(TRIM(m.full_name)), ' ', array_length(string_to_array(TRIM(m.full_name), ' '), 1)) 
            = SPLIT_PART(LOWER(TRIM(_rec.direct_manager)), ' ', array_length(string_to_array(TRIM(_rec.direct_manager), ' '), 1))
          AND LENGTH(TRIM(m.full_name)) > 3
          AND LENGTH(TRIM(_rec.direct_manager)) > 3
        )
      )
    ORDER BY 
      -- Prefer exact match
      CASE WHEN LOWER(TRIM(m.full_name)) = LOWER(TRIM(_rec.direct_manager)) THEN 0 ELSE 1 END,
      -- Prefer users with manager/admin roles
      CASE WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = m.user_id AND ur.role IN ('manager', 'admin', 'owner')) THEN 0 ELSE 1 END
    LIMIT 1;

    IF _manager_id IS NOT NULL AND _manager_id != _rec.user_id THEN
      -- Delete any existing edge for this child
      DELETE FROM downline_edges WHERE child_user_id = _rec.user_id AND edge_type = 'manages';
      
      -- Insert new edge
      INSERT INTO downline_edges (parent_user_id, child_user_id, edge_type)
      VALUES (_manager_id, _rec.user_id, 'manages');
      
      _synced := _synced + 1;
      
      -- If child has no team but manager does, inherit team
      IF _rec.team_id IS NULL AND _manager_team_id IS NOT NULL THEN
        UPDATE profiles SET team_id = _manager_team_id WHERE user_id = _rec.user_id;
        _team_fixed := _team_fixed + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Also fix team_id for users who have edges but no team
  FOR _rec IN
    SELECT p.user_id, de.parent_user_id
    FROM profiles p
    JOIN downline_edges de ON de.child_user_id = p.user_id AND de.edge_type = 'manages'
    WHERE p.team_id IS NULL AND p.status != 'nlc'
  LOOP
    SELECT team_id INTO _manager_team_id FROM profiles WHERE user_id = _rec.parent_user_id;
    IF _manager_team_id IS NOT NULL THEN
      UPDATE profiles SET team_id = _manager_team_id WHERE user_id = _rec.user_id;
      _team_fixed := _team_fixed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'edges_synced', _synced,
    'teams_fixed', _team_fixed,
    'errors', _errors
  );
END;
$$;

-- Create a function to validate and report data integrity issues
CREATE OR REPLACE FUNCTION public.get_data_integrity_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_profiles', (SELECT COUNT(*) FROM profiles),
    'active_profiles', (SELECT COUNT(*) FROM profiles WHERE status = 'active'),
    'nlc_profiles', (SELECT COUNT(*) FROM profiles WHERE status = 'nlc'),
    'missing_manager', (SELECT COUNT(*) FROM profiles WHERE direct_manager IS NULL AND status != 'nlc'),
    'missing_team', (SELECT COUNT(*) FROM profiles WHERE team_id IS NULL AND status != 'nlc'),
    'missing_edges', (SELECT COUNT(*) FROM profiles p WHERE p.status != 'nlc' AND NOT EXISTS (SELECT 1 FROM downline_edges de WHERE de.child_user_id = p.user_id AND de.edge_type = 'manages')),
    'orphaned_manager_refs', (
      SELECT COUNT(DISTINCT p.direct_manager) FROM profiles p
      WHERE p.direct_manager IS NOT NULL AND p.status != 'nlc'
      AND NOT EXISTS (
        SELECT 1 FROM profiles m WHERE m.status != 'nlc'
        AND (LOWER(TRIM(m.full_name)) = LOWER(TRIM(p.direct_manager))
          OR (SPLIT_PART(LOWER(TRIM(m.full_name)), ' ', 1) = SPLIT_PART(LOWER(TRIM(p.direct_manager)), ' ', 1)
            AND SPLIT_PART(LOWER(TRIM(m.full_name)), ' ', array_length(string_to_array(TRIM(m.full_name), ' '), 1)) 
              = SPLIT_PART(LOWER(TRIM(p.direct_manager)), ' ', array_length(string_to_array(TRIM(p.direct_manager), ' '), 1))))
      )
    ),
    'false_in_app', (SELECT COUNT(*) FROM profiles WHERE approved = true AND last_active_at IS NULL),
    'approved_pending', (SELECT COUNT(*) FROM profiles WHERE approved = false),
    'managers_without_edges', (
      SELECT COUNT(*) FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role IN ('manager', 'admin', 'owner')
      WHERE NOT EXISTS (SELECT 1 FROM downline_edges de WHERE de.parent_user_id = p.user_id AND de.edge_type = 'manages')
      AND p.status != 'nlc'
    )
  ) INTO _result;
  
  RETURN _result;
END;
$$;
