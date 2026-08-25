-- 1) LEAD BOARD RANKING (hot-first, deterministic)
CREATE OR REPLACE FUNCTION public.get_lead_board()
RETURNS TABLE(id uuid, first_name text, city text, interest_reason text, ref_code text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id, l.first_name, l.city, l.interest_reason, l.ref_code, l.created_at
  FROM recruiting_leads l
  WHERE auth.uid() IS NOT NULL
    AND l.status = 'New' AND l.claimed_by IS NULL
  ORDER BY (
      CASE WHEN COALESCE(btrim(l.interest_reason), '') <> '' THEN 2 ELSE 0 END
      + CASE
          WHEN l.created_at > now() - interval '24 hours' THEN 3
          WHEN l.created_at > now() - interval '72 hours' THEN 2
          WHEN l.created_at > now() - interval '7 days' THEN 1
          ELSE 0
        END
    ) DESC, l.created_at DESC
  LIMIT 300;
$function$;

-- 2) 24H NUDGE inside the existing sweep
CREATE OR REPLACE FUNCTION public.notify_lead_expiry_warnings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  n integer := 0;
  lnk text;
BEGIN
  FOR r IN
    SELECT rl.id, rl.first_name, rl.claimed_by,
           COALESCE(rl.last_activity_at, rl.claimed_at) AS ts
    FROM public.recruiting_leads rl
    LEFT JOIN public.notification_preferences np ON np.user_id = rl.claimed_by
    WHERE rl.status IN ('Claimed', 'Contacted')
      AND rl.claimed_by IS NOT NULL
      AND COALESCE(rl.ref_code, '') <> 'pipeline-import'
      AND COALESCE(np.lead_expiry, true)
      AND COALESCE(rl.last_activity_at, rl.claimed_at) < now() - interval '40 hours'
      AND COALESCE(rl.last_activity_at, rl.claimed_at) >= now() - interval '48 hours'
  LOOP
    lnk := '/app/recruits?lead=' || r.id::text;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_notifications un
      WHERE un.user_id = r.claimed_by
        AND un.link = lnk
        AND un.title = 'Lead expiring soon'
    ) THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead expiring soon',
              COALESCE(r.first_name, 'Your lead') || ' auto-releases in under 8 hours — log activity to keep it.',
              lnk);
      n := n + 1;
    END IF;
  END LOOP;

  -- 24h no-activity nudge, once per lead
  FOR r IN
    SELECT rl.id, rl.first_name, rl.claimed_by,
           COALESCE(rl.last_activity_at, rl.claimed_at) AS ts
    FROM public.recruiting_leads rl
    LEFT JOIN public.notification_preferences np ON np.user_id = rl.claimed_by
    WHERE rl.status IN ('Claimed', 'Contacted')
      AND rl.claimed_by IS NOT NULL
      AND COALESCE(rl.ref_code, '') NOT IN ('pipeline-import', 'winback')
      AND COALESCE(np.lead_expiry, true)
      AND COALESCE(rl.last_activity_at, rl.claimed_at) < now() - interval '24 hours'
      AND COALESCE(rl.last_activity_at, rl.claimed_at) >= now() - interval '40 hours'
  LOOP
    lnk := '/app/recruits?lead=' || r.id::text;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_notifications un
      WHERE un.user_id = r.claimed_by
        AND un.link = lnk
        AND un.title = 'Lead needs a call'
    ) THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead needs a call',
              'Call ' || COALESCE(r.first_name, 'your lead') || ' — claimed yesterday, no activity logged.',
              lnk);
      n := n + 1;
    END IF;
  END LOOP;

  RETURN n;
END;
$function$;

-- 3) SCRIPTS LIBRARY
CREATE TABLE IF NOT EXISTS public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  body text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users read active scripts" ON public.scripts;
CREATE POLICY "Signed-in users read active scripts"
ON public.scripts FOR SELECT TO authenticated
USING (is_active OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins manage scripts" ON public.scripts;
CREATE POLICY "Admins manage scripts"
ON public.scripts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP TRIGGER IF EXISTS update_scripts_updated_at ON public.scripts;
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) SUNDAY AWARDS
CREATE TABLE IF NOT EXISTS public.weekly_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending date NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_awards TO authenticated;
GRANT ALL ON public.weekly_awards TO service_role;

ALTER TABLE public.weekly_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users read weekly awards" ON public.weekly_awards;
CREATE POLICY "Signed-in users read weekly awards"
ON public.weekly_awards FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Compute awards for an arbitrary window. Only returns categories with real activity.
CREATE OR REPLACE FUNCTION public.compute_weekly_awards(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  out jsonb := '{}'::jsonb;
  r record;
BEGIN
  -- Most Signs
  SELECT p.user_id, COALESCE(p.full_name, 'A rep') AS name, count(*) AS n
    INTO r
  FROM public.recruiting_leads l
  JOIN public.profiles p ON p.user_id = COALESCE(l.claimed_by, l.sourced_by)
  WHERE l.status IN ('Signed', 'Returning')
    AND COALESCE(l.last_activity_at, l.created_at) >= _from
    AND COALESCE(l.last_activity_at, l.created_at) < _to
  GROUP BY p.user_id, p.full_name
  ORDER BY count(*) DESC, p.full_name
  LIMIT 1;
  IF r.user_id IS NOT NULL AND r.n > 0 THEN
    out := out || jsonb_build_object('most_signs',
      jsonb_build_object('user_id', r.user_id, 'name', r.name, 'value', r.n));
  END IF;

  -- Most Leads Worked (distinct leads with logged activity)
  SELECT w.user_id, COALESCE(p.full_name, 'A rep') AS name, count(DISTINCT w.lead_id) AS n
    INTO r
  FROM (
    SELECT c.user_id, c.lead_id FROM public.winback_contacts c
    WHERE c.created_at >= _from AND c.created_at < _to
    UNION ALL
    SELECT l.claimed_by AS user_id, l.id AS lead_id FROM public.recruiting_leads l
    WHERE l.claimed_by IS NOT NULL
      AND l.last_activity_at IS NOT NULL
      AND l.last_activity_at >= _from AND l.last_activity_at < _to
      AND (l.claimed_at IS NULL OR l.last_activity_at > l.claimed_at)
  ) w
  JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.user_id IS NOT NULL
  GROUP BY w.user_id, p.full_name
  ORDER BY count(DISTINCT w.lead_id) DESC, p.full_name
  LIMIT 1;
  IF r.user_id IS NOT NULL AND r.n > 0 THEN
    out := out || jsonb_build_object('most_worked',
      jsonb_build_object('user_id', r.user_id, 'name', r.name, 'value', r.n));
  END IF;

  -- Fastest Claim-to-Sign (hours)
  SELECT p.user_id, COALESCE(p.full_name, 'A rep') AS name,
         round((EXTRACT(EPOCH FROM (min(l.last_activity_at - l.claimed_at))) / 3600.0)::numeric, 1) AS n
    INTO r
  FROM public.recruiting_leads l
  JOIN public.profiles p ON p.user_id = l.claimed_by
  WHERE l.status = 'Signed'
    AND l.claimed_at IS NOT NULL
    AND l.last_activity_at IS NOT NULL
    AND l.last_activity_at > l.claimed_at
    AND l.last_activity_at >= _from AND l.last_activity_at < _to
  GROUP BY p.user_id, p.full_name
  ORDER BY min(l.last_activity_at - l.claimed_at) ASC, p.full_name
  LIMIT 1;
  IF r.user_id IS NOT NULL THEN
    out := out || jsonb_build_object('fastest_sign',
      jsonb_build_object('user_id', r.user_id, 'name', r.name, 'value', r.n));
  END IF;

  RETURN out;
END;
$function$;

REVOKE ALL ON FUNCTION public.compute_weekly_awards(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_weekly_awards(timestamptz, timestamptz) TO service_role;

-- Current (in-progress) week leaders for the Leaderboard pace strip
CREATE OR REPLACE FUNCTION public.get_week_pace()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN auth.uid() IS NULL THEN '{}'::jsonb
    ELSE public.compute_weekly_awards(
      date_trunc('week', (now() AT TIME ZONE 'America/New_York'))::timestamp AT TIME ZONE 'America/New_York',
      now()
    ) END;
$function$;

REVOKE ALL ON FUNCTION public.get_week_pace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_week_pace() TO authenticated, service_role;

-- Post the awards for the most recent completed week, once
CREATE OR REPLACE FUNCTION public.post_weekly_awards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  now_et timestamp := (now() AT TIME ZONE 'America/New_York');
  week_start_et timestamp := date_trunc('week', now_et);       -- Monday 00:00 ET
  cutoff_et timestamp;
  target_week_end date;
  win_from timestamptz;
  win_to timestamptz;
  data jsonb;
  poster uuid;
  lines text[] := '{}';
  body text;
BEGIN
  -- Cutoff for the week that just ended: Sunday 18:00 ET
  cutoff_et := week_start_et - interval '1 day' + interval '18 hours';
  IF now_et < cutoff_et THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'before cutoff');
  END IF;

  target_week_end := (week_start_et - interval '1 day')::date;  -- last Sunday
  IF EXISTS (SELECT 1 FROM public.weekly_awards WHERE week_ending = target_week_end) THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'already posted');
  END IF;

  win_from := (week_start_et - interval '7 days') AT TIME ZONE 'America/New_York';
  win_to := cutoff_et AT TIME ZONE 'America/New_York';
  data := public.compute_weekly_awards(win_from, win_to);

  IF data = '{}'::jsonb THEN
    INSERT INTO public.weekly_awards (week_ending, payload)
    VALUES (target_week_end, data)
    ON CONFLICT (week_ending) DO NOTHING;
    RETURN jsonb_build_object('posted', false, 'reason', 'no activity');
  END IF;

  IF data ? 'most_signs' THEN
    lines := lines || ('Most Signs — ' || (data->'most_signs'->>'name') || ' (' || (data->'most_signs'->>'value') || ')');
  END IF;
  IF data ? 'most_worked' THEN
    lines := lines || ('Most Leads Worked — ' || (data->'most_worked'->>'name') || ' (' || (data->'most_worked'->>'value') || ')');
  END IF;
  IF data ? 'fastest_sign' THEN
    lines := lines || ('Fastest Claim-to-Sign — ' || (data->'fastest_sign'->>'name') || ' (' || (data->'fastest_sign'->>'value') || 'h)');
  END IF;

  SELECT ur.user_id INTO poster FROM public.user_roles ur
  WHERE ur.role = 'owner' LIMIT 1;
  IF poster IS NULL THEN
    SELECT ur.user_id INTO poster FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
  END IF;
  IF poster IS NULL THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'no poster');
  END IF;

  body := '[[AWARDS|' || target_week_end::text || ']]Week of ' ||
          to_char(target_week_end - 6, 'Mon FMDD') || ' – ' || to_char(target_week_end, 'Mon FMDD') ||
          E'\n' || array_to_string(lines, E'\n');

  INSERT INTO public.weekly_awards (week_ending, payload)
  VALUES (target_week_end, data);

  INSERT INTO public.chat_messages (user_id, content, is_ai, channel)
  VALUES (poster, body, true, 'wins');

  RETURN jsonb_build_object('posted', true, 'week_ending', target_week_end, 'awards', data);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('posted', false, 'reason', 'already posted');
END;
$function$;

REVOKE ALL ON FUNCTION public.post_weekly_awards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_weekly_awards() TO authenticated, service_role;

DO $$
BEGIN
  PERFORM cron.schedule('summit-weekly-awards', '5 22 * * 0', 'SELECT public.post_weekly_awards();');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron unavailable: %', SQLERRM;
END $$;