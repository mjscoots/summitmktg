-- Pass 119 — recruit watch-course gate. Derived rule only, no data rewrites.

CREATE OR REPLACE FUNCTION public.day_one_video_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT array_agg((t)::uuid ORDER BY ord)
       FROM (
         SELECT trim(v) AS t, row_number() OVER () AS ord
           FROM app_settings s,
                unnest(string_to_array(s.value, ',')) AS v
          WHERE s.key = 'day_one_video_ids'
       ) q
      WHERE t <> ''),
    ARRAY[]::uuid[]
  );
$$;

CREATE OR REPLACE FUNCTION public.set_day_one_items(_video_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO app_settings (key, value)
  VALUES ('day_one_video_ids', array_to_string(COALESCE(_video_ids, ARRAY[]::uuid[]), ','))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

-- Gated only while onboarding_status is pending and the person holds no leadership role.
CREATE OR REPLACE FUNCTION public.is_gated_recruit(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  );
$$;

CREATE OR REPLACE FUNCTION public.recruit_gate_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ids := public.day_one_video_ids();

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
$$;

CREATE OR REPLACE FUNCTION public.gated_recruits()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  pct int,
  done int,
  total int,
  minutes int,
  last_active_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  ids uuid[] := public.day_one_video_ids();
  n int := COALESCE(array_length(ids, 1), 0);
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
         CASE WHEN n = 0 THEN 0 ELSE (d.done_count * 100 / n) END AS pct,
         d.done_count AS done,
         n AS total,
         d.mins AS minutes,
         p.last_active_at
    FROM profiles p
    CROSS JOIN LATERAL (
      SELECT count(*) FILTER (WHERE vp.watched)::int AS done_count,
             COALESCE(round(sum(COALESCE(vp.duration, 0)) / 60.0)::int, 0) AS mins
        FROM video_progress vp
       WHERE vp.user_id = p.user_id
         AND vp.video_id = ANY(ids)
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
$$;

REVOKE ALL ON FUNCTION public.day_one_video_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_day_one_items(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_gated_recruit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recruit_gate_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gated_recruits() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.day_one_video_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_day_one_items(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gated_recruit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recruit_gate_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gated_recruits() TO authenticated, service_role;