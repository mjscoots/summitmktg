CREATE OR REPLACE FUNCTION public.get_team_battles()
 RETURNS TABLE(team_id uuid, team_name text, member_count integer, total_points integer, rank bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ws AS (SELECT date_trunc('week', (now() AT TIME ZONE 'America/Los_Angeles'))::date AS d),
  pts AS (
    SELECT p.team_id, COUNT(DISTINCT p.id)::int AS members,
      COALESCE(SUM(pe.points),0)::int AS total
    FROM profiles p
    LEFT JOIN point_events pe ON pe.user_id = p.id AND pe.created_at >= (SELECT d FROM ws)
    WHERE p.team_id IS NOT NULL AND COALESCE(p.archived,false) = false
    GROUP BY p.team_id
  )
  SELECT t.id, t.name, pts.members, pts.total,
    ROW_NUMBER() OVER (ORDER BY pts.total DESC, t.name)
  FROM pts JOIN teams t ON t.id = pts.team_id
  WHERE COALESCE(t.retired,false) = false
$function$;
REVOKE EXECUTE ON FUNCTION public.get_team_battles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_battles() TO authenticated;