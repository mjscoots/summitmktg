CREATE OR REPLACE FUNCTION public.get_session_prep(_since date DEFAULT (CURRENT_DATE - 30))
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;

  SELECT jsonb_build_object(
    'since', _since,
    'new_reps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('full_name', p.full_name, 'created_at', p.created_at) ORDER BY p.created_at DESC)
      FROM profiles p
      WHERE COALESCE(p.is_archived,false) = false AND p.created_at::date >= _since
    ), '[]'::jsonb),
    'departed', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'full_name', p.full_name, 'departure_type', p.departure_type,
        'departure_reason', p.departure_reason, 'last_day_worked', p.last_day_worked,
        'revenue_to_date', p.revenue_to_date) ORDER BY p.last_day_worked DESC NULLS LAST)
      FROM profiles p
      WHERE COALESCE(p.is_archived,false) = true
        AND COALESCE(p.last_day_worked, p.updated_at::date) >= _since
    ), '[]'::jsonb),
    'active_by_office', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', label, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT COALESCE(o.name,'No office') AS label, count(*) AS c
        FROM profiles p LEFT JOIN offices o ON o.id = p.office_id
        WHERE COALESCE(p.is_archived,false) = false GROUP BY 1
      ) x
    ), '[]'::jsonb),
    'active_by_vertical', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', label, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT COALESCE(p.vertical,'Pest') AS label, count(*) AS c
        FROM profiles p WHERE COALESCE(p.is_archived,false) = false GROUP BY 1
      ) y
    ), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'ever_on_roster', (SELECT count(*) FROM profiles),
      'active', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = false),
      'departed', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = true),
      'quit', (SELECT count(*) FROM profiles WHERE departure_type = 'Quit'),
      'fired', (SELECT count(*) FROM profiles WHERE departure_type = 'Fired'),
      'home_early', (SELECT count(*) FROM profiles WHERE departure_type = 'Went home early'),
      'unknown', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = true AND (departure_type IS NULL OR departure_type = 'Unknown'))
    ),
    'resigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', COALESCE(next_year_status,'No answer'), 'count', c) ORDER BY c DESC)
      FROM (
        SELECT next_year_status, count(*) AS c FROM profiles
        WHERE COALESCE(is_archived,false) = false GROUP BY 1
      ) z
    ), '[]'::jsonb),
    'commitment_coverage', jsonb_build_object(
      'done', (SELECT count(DISTINCT rep_id) FROM commitment_interviews),
      'active', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = false),
      'no_committed_date', (SELECT count(*) FROM profiles WHERE COALESCE(is_archived,false) = false AND committed_last_day IS NULL)
    ),
    'winback', jsonb_build_object(
      'contacted', (SELECT count(*) FROM winback_contacts WHERE created_at::date >= _since),
      'returning', (SELECT count(*) FROM recruiting_leads WHERE status = 'Returning')
    ),
    'attendance', COALESCE((
      SELECT jsonb_build_object(
        'marked', count(*),
        'present', count(*) FILTER (WHERE present),
        'rate', ROUND(100.0 * count(*) FILTER (WHERE present) / GREATEST(count(*),1), 1))
      FROM calendar_attendance ca
      JOIN calendar_events e ON e.id = ca.event_id
      WHERE e.event_date >= _since
    ), '{}'::jsonb),
    'my_action_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', a.title, 'due_date', a.due_date) ORDER BY a.due_date NULLS LAST)
      FROM action_items a
      WHERE a.assigned_to = auth.uid() AND a.status = 'open'
    ), '[]'::jsonb),
    'revenue', (SELECT CASE WHEN EXISTS (SELECT 1 FROM rep_revenue)
      THEN jsonb_build_object(
        'total', (SELECT SUM(GREATEST(COALESCE(serviced_amount,0)+COALESCE(pending_amount,0), revenue)) FROM rep_revenue),
        'goal', (SELECT NULLIF(value,'')::numeric FROM app_settings WHERE key = 'season_revenue_goal'))
      ELSE NULL END)
  ) INTO res;

  RETURN res;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_session_prep(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_prep(date) TO authenticated;