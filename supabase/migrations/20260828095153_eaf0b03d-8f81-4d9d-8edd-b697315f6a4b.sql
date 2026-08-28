CREATE OR REPLACE FUNCTION public.seats_rows()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  _rows jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb,'active_7',0,'dark_8_29',0,'dark_30',0,'no_account',0,'managers_missing_role',0);
  END IF;

  WITH act AS (
    SELECT p.user_id, COALESCE(p.full_name,'Unnamed') AS full_name, p.team_id, p.manager_id,
           COALESCE(p.active_vertical, p.vertical) AS vertical, p.region, p.last_active_at
    FROM public.profiles p
    WHERE COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'active') <> 'nlc'
      AND p.user_id IS NOT NULL
  ), inv AS (
    SELECT DISTINCT ON (i.manager_target) i.manager_target, i.id, i.token, i.expires_at, i.used_at, i.revoked_at
    FROM (
      SELECT (i.note)::text AS note, i.*, (NULLIF(split_part(COALESCE(i.note,''), 'seat:', 2), ''))::uuid AS manager_target
      FROM public.invites i
      WHERE i.note LIKE 'seat:%'
    ) i
    ORDER BY i.manager_target, i.created_at DESC
  ), j AS (
    SELECT a.*, t.name AS team_name, m.full_name AS manager_name,
           (a.manager_id IS NOT NULL AND (COALESCE(m.archived,false) OR COALESCE(m.status::text,'active') = 'nlc')) AS manager_departed,
           (u.id IS NOT NULL) AS has_account,
           GREATEST(COALESCE(u.last_sign_in_at, '-infinity'::timestamptz), COALESCE(a.last_active_at, '-infinity'::timestamptz)) AS last_active_raw,
           iv.id AS invite_id, iv.token AS invite_token, iv.expires_at, iv.used_at, iv.revoked_at
    FROM act a
    LEFT JOIN public.teams t ON t.id = a.team_id
    LEFT JOIN public.profiles m ON m.user_id = a.manager_id
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN inv iv ON iv.manager_target = a.user_id
  ), f AS (
    SELECT j.*,
      NULLIF(j.last_active_raw, '-infinity'::timestamptz) AS last_active_at_final
    FROM j
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', f.user_id,
    'full_name', f.full_name,
    'team_name', f.team_name,
    'team_id', f.team_id,
    'vertical', f.vertical,
    'region', f.region,
    'manager_id', f.manager_id,
    'manager_name', f.manager_name,
    'manager_departed', f.manager_departed,
    'has_account', f.has_account,
    'last_active_at', f.last_active_at_final,
    'days_since', CASE WHEN f.last_active_at_final IS NULL THEN NULL
                       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - f.last_active_at_final)) / 86400)::int END,
    'role', (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = f.user_id
             ORDER BY CASE ur.role::text WHEN 'owner' THEN 5 WHEN 'admin' THEN 4 WHEN 'president' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END DESC LIMIT 1),
    'has_manager_role', EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = f.user_id AND ur.role::text IN ('manager','president','admin','owner')),
    'effective_manager', public.is_effective_manager(f.user_id),
    'invite_id', f.invite_id,
    'invite_token', f.invite_token,
    'invite_state', CASE
        WHEN f.invite_id IS NULL THEN 'none'
        WHEN f.used_at IS NOT NULL THEN 'used'
        WHEN f.revoked_at IS NOT NULL THEN 'revoked'
        WHEN f.expires_at < now() THEN 'expired'
        ELSE 'open' END
  ) ORDER BY f.last_active_raw ASC, f.full_name), '[]'::jsonb)
  INTO _rows
  FROM f;

  RETURN jsonb_build_object(
    'rows', _rows,
    'active_7', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r WHERE (r->>'days_since') IS NOT NULL AND (r->>'days_since')::int <= 7),
    'dark_8_29', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r WHERE (r->>'days_since') IS NOT NULL AND (r->>'days_since')::int BETWEEN 8 AND 29),
    'dark_30', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r WHERE (r->>'days_since') IS NULL OR (r->>'days_since')::int >= 30),
    'no_account', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r WHERE (r->>'has_account')::boolean = false),
    'managers_missing_role', (SELECT COUNT(*) FROM jsonb_array_elements(_rows) r
        WHERE (r->>'effective_manager')::boolean AND (r->>'has_manager_role')::boolean = false)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.owner_week()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  _zero jsonb := jsonb_build_object(
    'signed_total', 0, 'signed_recent', 0,
    'calls', 0, 'calls_people', 0,
    'apps_waiting', 0, 'apps_oldest_hours', 0,
    'referrals_total', 0, 'referrals_claimed', 0,
    'training_minutes', 0, 'training_reps', 0, 'active_reps', 0,
    'dark_30', 0,
    'fiber_loaded_at', NULL, 'pest_loaded_at', NULL,
    'authorized', false
  );
  _out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN _zero;
  END IF;

  SELECT jsonb_build_object(
    'signed_total', (SELECT count(*) FROM public.people_leads WHERE signed_2027),
    'signed_recent', (
      SELECT count(DISTINCT la.lead_id) FROM public.lead_activities la
      WHERE la.created_at >= now() - interval '7 days'
        AND la.outcome = 'signed_2027'
    ),
    'calls', (SELECT count(*) FROM public.lead_activities WHERE created_at >= now() - interval '7 days'),
    'calls_people', (SELECT count(DISTINCT lead_id) FROM public.lead_activities WHERE created_at >= now() - interval '7 days'),
    'apps_waiting', (SELECT count(*) FROM public.applications WHERE status = 'pending'),
    'apps_oldest_hours', COALESCE((
      SELECT FLOOR(EXTRACT(EPOCH FROM (now() - MIN(created_at))) / 3600)
      FROM public.applications WHERE status = 'pending'), 0),
    'referrals_total', (SELECT count(*) FROM public.recruiting_leads WHERE source_type = 'rep_referral'),
    'referrals_claimed', (SELECT count(*) FROM public.recruiting_leads WHERE source_type = 'rep_referral' AND claimed_by IS NOT NULL),
    'training_minutes', (
      SELECT COALESCE(sum(COALESCE(training_minutes, 0)), 0) FROM public.daily_training_time
      WHERE date >= (now() - interval '7 days')::date),
    'training_reps', (
      SELECT count(DISTINCT user_id) FROM public.daily_training_time
      WHERE date >= (now() - interval '7 days')::date AND COALESCE(training_minutes, 0) > 0),
    'active_reps', (
      SELECT count(*) FROM public.profiles
      WHERE status = 'active' AND COALESCE(archived, false) = false),
    'dark_30', (
      SELECT count(*) FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.user_id
      WHERE COALESCE(p.archived,false) = false
        AND COALESCE(p.status::text,'active') <> 'nlc'
        AND p.user_id IS NOT NULL
        AND COALESCE(GREATEST(u.last_sign_in_at, p.last_active_at), '-infinity'::timestamptz) < now() - interval '30 days'),
    'fiber_loaded_at', (SELECT max(committed_at) FROM public.revenue_import_batches WHERE kind = 'fiber_week' AND status = 'committed'),
    'pest_loaded_at', (SELECT max(committed_at) FROM public.revenue_import_batches WHERE kind = 'pest_revenue' AND status = 'committed'),
    'authorized', true
  ) INTO _out;

  RETURN _out;
END;
$function$;

REVOKE ALL ON FUNCTION public.seats_rows() FROM anon;
REVOKE ALL ON FUNCTION public.owner_week() FROM anon;
GRANT EXECUTE ON FUNCTION public.seats_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_week() TO authenticated;