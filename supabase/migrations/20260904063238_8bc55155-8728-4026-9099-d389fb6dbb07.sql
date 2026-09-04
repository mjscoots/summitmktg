-- Which industry is this person joining
CREATE OR REPLACE FUNCTION public.recruit_vertical(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(NULLIF(p.active_vertical, ''), NULLIF(p.vertical, ''), 'Pest')
    FROM profiles p
   WHERE p.user_id = _uid
$function$;

REVOKE ALL ON FUNCTION public.recruit_vertical(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recruit_vertical(uuid) TO authenticated, service_role;

-- Day one course per industry. Pest keeps the original setting key so nothing moves.
CREATE OR REPLACE FUNCTION public.day_one_video_ids(_vertical text)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT array_agg((t)::uuid ORDER BY ord)
       FROM (
         SELECT trim(v) AS t, row_number() OVER () AS ord
           FROM app_settings s,
                unnest(string_to_array(s.value, ',')) AS v
          WHERE s.key = CASE
                   WHEN COALESCE(_vertical, 'Pest') = 'Pest' THEN 'day_one_video_ids'
                   ELSE 'day_one_video_ids_' || lower(COALESCE(_vertical, 'Pest'))
                 END
       ) q
      WHERE t <> ''),
    ARRAY[]::uuid[]
  );
$function$;

REVOKE ALL ON FUNCTION public.day_one_video_ids(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.day_one_video_ids(text) TO authenticated, service_role;

-- A recruit is only gated when their own industry has a day one course
CREATE OR REPLACE FUNCTION public.is_gated_recruit(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM profiles p
     WHERE p.user_id = _uid
       AND p.onboarding_status = 'pending'
       AND COALESCE(p.archived, false) = false
       AND COALESCE(p.alumni, false) = false
       AND NOT EXISTS (
         SELECT 1 FROM user_roles r
          WHERE r.user_id = _uid
            AND r.role IN ('manager','president','admin','owner','recruiter')
       )
       AND COALESCE(array_length(
             public.day_one_video_ids(public.recruit_vertical(_uid)), 1), 0) > 0
  );
$function$;

CREATE OR REPLACE FUNCTION public.day_one_done(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH ids AS (
    SELECT public.day_one_video_ids(public.recruit_vertical(_user_id)) AS v
  )
  SELECT CASE
    WHEN COALESCE(array_length((SELECT v FROM ids), 1), 0) = 0 THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM unnest((SELECT v FROM ids)) AS u(vid)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.video_progress vp
        WHERE vp.user_id = _user_id AND vp.video_id = u.vid AND vp.watched = true
      )
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.day_one_done_at(_user_id uuid)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.day_one_done(_user_id) THEN (
      SELECT max(COALESCE(vp.watched_at, vp.created_at))
        FROM public.video_progress vp
       WHERE vp.user_id = _user_id
         AND vp.video_id = ANY(public.day_one_video_ids(public.recruit_vertical(_user_id)))
         AND vp.watched = true
    )
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.gated_recruits()
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, pct integer, done integer, total integer, minutes integer, last_active_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  wide boolean;
BEGIN
  IF me IS NULL OR NOT public.is_manager_tier(me) THEN
    RETURN;
  END IF;

  wide := public.has_role(me, 'admin') OR public.has_role(me, 'owner');

  RETURN QUERY
  SELECT p.user_id,
         p.full_name,
         p.avatar_url,
         CASE WHEN d.n = 0 THEN 0 ELSE (d.done_count * 100 / d.n) END AS pct,
         d.done_count AS done,
         d.n AS total,
         d.mins AS minutes,
         p.last_active_at
    FROM profiles p
    CROSS JOIN LATERAL (
      SELECT COALESCE(array_length(ids.v, 1), 0) AS n,
             (SELECT count(*) FILTER (WHERE vp.watched)::int
                FROM video_progress vp
               WHERE vp.user_id = p.user_id AND vp.video_id = ANY(ids.v)) AS done_count,
             (SELECT COALESCE(round(sum(COALESCE(vp.duration, 0)) / 60.0)::int, 0)
                FROM video_progress vp
               WHERE vp.user_id = p.user_id AND vp.video_id = ANY(ids.v)) AS mins
        FROM (SELECT public.day_one_video_ids(public.recruit_vertical(p.user_id)) AS v) ids
    ) d
   WHERE public.is_gated_recruit(p.user_id)
     AND (
       wide
       OR p.manager_id = me
       OR EXISTS (
         SELECT 1 FROM downline_edges e
          WHERE e.parent_user_id = me AND e.child_user_id = p.user_id
       )
     )
   ORDER BY p.last_active_at DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recruit_gate_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  ids uuid[];
  items jsonb;
  total int;
  done int;
  mins int;
  recruit boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'is_recruit', false, 'items', '[]'::jsonb,
                              'total', 0, 'done', 0, 'minutes', 0);
  END IF;

  recruit := public.is_gated_recruit(uid);
  ids := public.day_one_video_ids(public.recruit_vertical(uid));

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'position', ord,
           'video_id', v.id,
           'title', v.title,
           'category', v.category,
           'video_url', v.video_url,
           'done', COALESCE(vp.watched, false)
         ) ORDER BY ord), '[]'::jsonb)
    INTO items
    FROM unnest(ids) WITH ORDINALITY AS u(vid, ord)
    JOIN training_videos v ON v.id = u.vid
    LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = uid;

  SELECT count(*), count(*) FILTER (WHERE (i->>'done')::boolean)
    INTO total, done
    FROM jsonb_array_elements(items) i;

  SELECT COALESCE(round(sum(COALESCE(vp.duration, 0)) / 60.0)::int, 0)
    INTO mins
    FROM video_progress vp
   WHERE vp.user_id = uid
     AND vp.video_id = ANY(ids);

  RETURN jsonb_build_object(
    'locked', recruit AND total > 0 AND done < total,
    'is_recruit', recruit,
    'items', items,
    'total', total,
    'done', done,
    'minutes', mins
  );
END;
$function$;

-- Staff hear about a waiting application once every three days, not daily
CREATE OR REPLACE FUNCTION public.notify_stalled_applications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _app record;
  _staff uuid;
  _key text;
  _days integer;
  _name text;
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
    _key := 'appstall:' || _app.id::text || ':' || (_days / 3)::text;
    _name := initcap(_app.full_name);

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
        _name || ' has been waiting ' || _days || ' day' || CASE WHEN _days = 1 THEN '' ELSE 's' END || '.',
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
$function$;

REVOKE ALL ON FUNCTION public.is_gated_recruit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.day_one_done(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.day_one_done_at(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gated_recruits() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recruit_gate_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_stalled_applications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gated_recruit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.day_one_done(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.day_one_done_at(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gated_recruits() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recruit_gate_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_stalled_applications() TO service_role;