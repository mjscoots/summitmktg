-- 1. Public proof config reader (recruiting page)
CREATE OR REPLACE FUNCTION public.get_recruiting_proof()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(replace(key, 'recruiting_proof_', ''), value)
                  FILTER (WHERE COALESCE(value, '') <> ''), '{}'::jsonb)
  FROM app_settings
  WHERE key LIKE 'recruiting_proof_%';
$$;

REVOKE ALL ON FUNCTION public.get_recruiting_proof() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiting_proof() TO anon, authenticated;

-- 2. Speed-to-lead SLA sweep
CREATE OR REPLACE FUNCTION public.sweep_speed_to_lead()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  m record;
  target uuid;
  warned int := 0;
  assigned int := 0;
  lnk text;
BEGIN
  -- 2h unclaimed -> notify managers/admins/owners once per lead
  FOR r IN
    SELECT id, first_name FROM public.recruiting_leads
    WHERE status = 'New' AND claimed_by IS NULL
      AND COALESCE(ref_code,'') <> 'pipeline-import'
      AND created_at < now() - interval '2 hours'
  LOOP
    lnk := '/app/recruits?lead=' || r.id::text;
    FOR m IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur
      WHERE ur.role IN ('manager','admin','owner')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.user_notifications un
        WHERE un.user_id = m.user_id AND un.link = lnk AND un.title = 'Lead waiting'
      ) THEN
        INSERT INTO public.user_notifications (user_id, title, message, link)
        VALUES (m.user_id, 'Lead waiting',
                'Lead waiting: ' || COALESCE(r.first_name,'Unnamed') || ' — unclaimed for 2h+.', lnk);
        warned := warned + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- 24h unclaimed -> auto-assign to eligible rep with most signs
  FOR r IN
    SELECT id, first_name FROM public.recruiting_leads
    WHERE status = 'New' AND claimed_by IS NULL
      AND COALESCE(ref_code,'') <> 'pipeline-import'
      AND created_at < now() - interval '24 hours'
      AND COALESCE(notes,'') NOT LIKE '%Auto-assigned after 24h unclaimed.%'
    FOR UPDATE
  LOOP
    SELECT p.user_id INTO target
    FROM public.profiles p
    WHERE p.user_id IS NOT NULL
      AND p.status = 'active'
      AND (
        SELECT count(*) FROM public.recruiting_leads l
        WHERE l.claimed_by = p.user_id AND l.status IN ('Claimed','Contacted')
          AND COALESCE(l.ref_code,'') <> 'pipeline-import'
      ) < 4
    ORDER BY (
      SELECT count(*) FROM public.recruiting_leads l2
      WHERE l2.claimed_by = p.user_id AND l2.status = 'Signed'
    ) DESC, random()
    LIMIT 1;

    IF target IS NULL THEN CONTINUE; END IF;

    UPDATE public.recruiting_leads
    SET status = 'Claimed', claimed_by = target, claimed_at = now(), last_activity_at = now(),
        notes = COALESCE(notes || E'\n', '') || 'Auto-assigned after 24h unclaimed.'
    WHERE id = r.id;

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (target, 'Lead assigned to you',
            COALESCE(r.first_name,'A lead') || ' was auto-assigned after 24h unclaimed. Call them now.',
            '/app/recruits?lead=' || r.id::text);

    assigned := assigned + 1;
  END LOOP;

  RETURN jsonb_build_object('warned', warned, 'assigned', assigned);
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_speed_to_lead() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_speed_to_lead() TO authenticated, service_role;

-- 3. Hook into existing sweep
CREATE OR REPLACE FUNCTION public.release_stale_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  PERFORM public.notify_lead_expiry_warnings();
  PERFORM public.sweep_speed_to_lead();

  FOR r IN
    SELECT id, first_name, claimed_by
    FROM public.recruiting_leads
    WHERE status IN ('Claimed','Contacted')
      AND COALESCE(ref_code, '') <> 'pipeline-import'
      AND COALESCE(last_activity_at, claimed_at) < now() - interval '48 hours'
    FOR UPDATE
  LOOP
    UPDATE public.recruiting_leads
    SET status = 'New', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE id = r.id;

    IF r.claimed_by IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead released',
              'You lost ' || r.first_name || ' — no activity in 48 hours.',
              '/app/recruits');
    END IF;

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

-- 4. Rep scorecard
CREATE OR REPLACE FUNCTION public.get_rep_scorecard(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _viewer_role app_role;
  _total int;
  _done int;
  _weeks jsonb;
  _streak int;
BEGIN
  IF _viewer IS NULL THEN
    RETURN jsonb_build_object('error', 'not authenticated');
  END IF;

  SELECT public.get_user_role(_viewer) INTO _viewer_role;

  IF _viewer <> _user_id AND COALESCE(_viewer_role::text, '') NOT IN ('manager','admin','owner') THEN
    RETURN jsonb_build_object('error', 'not allowed');
  END IF;

  SELECT count(*) INTO _total FROM public.training_lessons WHERE is_active = true;
  SELECT count(*) INTO _done FROM public.lesson_progress lp
    JOIN public.training_lessons tl ON tl.id = lp.lesson_id AND tl.is_active = true
   WHERE lp.user_id = _user_id AND lp.completed_at IS NOT NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('week_start', w.ws, 'points', COALESCE(lb.total_points, 0))
                            ORDER BY w.ws), '[]'::jsonb)
    INTO _weeks
  FROM (
    SELECT (date_trunc('week', now())::date - (i * 7))::date AS ws
    FROM generate_series(0, 3) AS i
  ) w
  LEFT JOIN public.leaderboard_points lb
    ON lb.user_id = _user_id AND lb.week_start = w.ws;

  SELECT current_streak INTO _streak FROM public.daily_login_streaks WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'lessons_total', COALESCE(_total, 0),
    'lessons_done', COALESCE(_done, 0),
    'training_pct', CASE WHEN COALESCE(_total,0) = 0 THEN 0
                         ELSE round((_done::numeric / _total) * 100)::int END,
    'weeks', _weeks,
    'streak', _streak,
    'leads', jsonb_build_object(
      'claimed', (SELECT count(*) FROM public.recruiting_leads WHERE claimed_by = _user_id),
      'contacted', (SELECT count(*) FROM public.recruiting_leads WHERE claimed_by = _user_id AND status IN ('Contacted','Booked','Signed')),
      'signed', (SELECT count(*) FROM public.recruiting_leads WHERE claimed_by = _user_id AND status = 'Signed')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_rep_scorecard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rep_scorecard(uuid) TO authenticated;