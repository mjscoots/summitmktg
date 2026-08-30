ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS source_key text;

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_source_key_uniq
  ON public.user_notifications (user_id, source_key)
  WHERE source_key IS NOT NULL;

-- Dark rep radar.
-- Last seen rule: the newest of profiles.last_active_at, auth.users.last_sign_in_at,
-- chat_read_state.last_read_at, video_watch_log.watched_at and lead_activities.created_at
-- for that person. NULL means no signal at all, rendered as "Never opened".
CREATE OR REPLACE FUNCTION public.dark_rep_radar(_manager uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        p.last_active_at,
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
$$;

-- Application stall alarm: one notification per pending application per day per staff member.
CREATE OR REPLACE FUNCTION public.notify_stalled_applications()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _app record;
  _staff uuid;
  _key text;
  _days integer;
  _written integer := 0;
BEGIN
  FOR _app IN
    SELECT a.id, COALESCE(a.full_name, 'An applicant') AS full_name, a.created_at
    FROM public.applications a
    WHERE a.status = 'pending'
      AND a.created_at < now() - interval '48 hours'
    ORDER BY a.created_at
  LOOP
    _days := GREATEST(1, (now()::date - _app.created_at::date));
    _key := 'appstall:' || _app.id::text || ':' || now()::date::text;

    FOR _staff IN
      SELECT DISTINCT r.user_id
      FROM public.user_roles r
      WHERE r.role IN ('owner'::app_role, 'admin'::app_role)
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = _staff AND np.announcements = false
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO public.user_notifications (user_id, title, message, link, source_key)
      VALUES (
        _staff,
        'Application still waiting',
        _app.full_name || ' has been waiting ' || _days || ' day' || CASE WHEN _days = 1 THEN '' ELSE 's' END || '.',
        '/app/admin?section=requests',
        _key
      )
      ON CONFLICT (user_id, source_key) WHERE source_key IS NOT NULL DO NOTHING;

      IF FOUND THEN
        _written := _written + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('written', _written);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dark_rep_radar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dark_rep_radar(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_stalled_applications() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('summit-application-stall', '20 13 * * *', 'select public.notify_stalled_applications();');