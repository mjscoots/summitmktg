CREATE OR REPLACE FUNCTION public.dark_rep_radar(_manager uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'staff', false);
  END IF;

  _staff := public.has_role(_uid, 'admin') OR public.has_role(_uid, 'owner');
  IF NOT _staff AND NOT public.is_manager_tier(_uid) THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'staff', false);
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.last_seen_at NULLS FIRST, t.full_name), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT p.user_id,
           p.full_name,
           p.avatar_url,
           mp.full_name AS manager_name,
           ls.last_seen_at,
           CASE WHEN ls.last_seen_at IS NULL THEN NULL
                ELSE GREATEST(0, (now()::date - ls.last_seen_at::date))
           END AS days_quiet
    FROM public.profiles p
    LEFT JOIN public.profiles mp ON mp.user_id = p.manager_id
    LEFT JOIN LATERAL (
      SELECT GREATEST(
        -- last_active_at only counts once the person has actually signed in;
        -- the column is stamped at account creation, so on its own it would
        -- hide seats that were handed out and never opened.
        CASE WHEN (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p.user_id) IS NULL
             THEN NULL ELSE p.last_active_at END,
        (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p.user_id),
        (SELECT max(c.last_read_at) FROM public.chat_read_state c WHERE c.user_id = p.user_id),
        (SELECT max(v.watched_at) FROM public.video_watch_log v WHERE v.user_id = p.user_id),
        (SELECT max(la.created_at) FROM public.lead_activities la WHERE la.actor_id = p.user_id)
      ) AS last_seen_at
    ) ls ON true
    WHERE COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text, '') <> 'nlc'
      AND p.user_id <> _uid
      AND (
        (_staff AND (_manager IS NULL OR p.manager_id = _manager))
        OR (NOT _staff AND (p.manager_id = _uid OR public.is_in_my_downline(p.user_id)))
      )
  ) t;

  RETURN jsonb_build_object('rows', _rows, 'staff', _staff);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dark_rep_radar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dark_rep_radar(uuid) TO authenticated;