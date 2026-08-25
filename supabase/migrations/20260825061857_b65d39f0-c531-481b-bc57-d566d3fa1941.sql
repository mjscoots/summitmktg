-- 1. expires_at default + backfill
ALTER TABLE public.announcement_posts ALTER COLUMN expires_at SET DEFAULT (now() + interval '14 days');

UPDATE public.announcement_posts
SET status = 'archived'
WHERE created_at < now() - interval '30 days' AND status <> 'archived';

UPDATE public.announcement_posts
SET expires_at = created_at + interval '14 days'
WHERE expires_at IS NULL AND status <> 'archived';

-- 2. seen-by tracking
CREATE TABLE IF NOT EXISTS public.announcement_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcement_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

GRANT SELECT, INSERT ON public.announcement_views TO authenticated;
GRANT ALL ON public.announcement_views TO service_role;

ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own announcement views"
ON public.announcement_views FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own views, staff read all"
ON public.announcement_views FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

CREATE INDEX IF NOT EXISTS idx_announcement_views_ann ON public.announcement_views(announcement_id);

-- 3. mark seen (batch, idempotent)
CREATE OR REPLACE FUNCTION public.mark_announcements_seen(_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.announcement_views (announcement_id, user_id)
  SELECT unnest(_ids), auth.uid()
  WHERE auth.uid() IS NOT NULL
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.mark_announcements_seen(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_announcements_seen(uuid[]) TO authenticated;

-- 4. seen counts for staff
CREATE OR REPLACE FUNCTION public.get_announcement_seen_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
  ) THEN
    RETURN jsonb_build_object('total', 0, 'counts', '{}'::jsonb);
  END IF;

  SELECT count(*)::int INTO total
  FROM profiles
  WHERE status IN ('active','contract_signed','onboarded','info_added');

  SELECT COALESCE(jsonb_object_agg(announcement_id::text, c), '{}'::jsonb) INTO rows
  FROM (
    SELECT announcement_id, count(*)::int AS c
    FROM announcement_views GROUP BY announcement_id
  ) s;

  RETURN jsonb_build_object('total', total, 'counts', rows);
END;
$$;

REVOKE ALL ON FUNCTION public.get_announcement_seen_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_announcement_seen_counts() TO authenticated;

-- 5. home snapshot
CREATE OR REPLACE FUNCTION public.get_home_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_staff boolean;
  is_admin boolean;
  today_start timestamptz;
  today_end timestamptz;
  events_today int := 0;
  next_event jsonb := NULL;
  unclaimed int := 0;
  at_risk jsonb := NULL;
  next_lesson jsonb := NULL;
  week_points int := 0;
  team_signs int := 0;
  active_today int := 0;
  stale_reps int := 0;
  pending_queue int := 0;
  wk date;
BEGIN
  IF uid IS NULL THEN RETURN '{}'::jsonb; END IF;

  is_staff := has_role(uid,'manager') OR has_role(uid,'admin') OR has_role(uid,'owner');
  is_admin := has_role(uid,'admin') OR has_role(uid,'owner');
  today_start := date_trunc('day', now());
  today_end := today_start + interval '1 day';

  SELECT count(*)::int INTO events_today
  FROM calendar_events e
  WHERE e.event_date >= today_start AND e.event_date < today_end
    AND (e.is_team_wide OR e.created_by = uid OR e.manager_id = uid
         OR EXISTS (SELECT 1 FROM calendar_event_assignees a WHERE a.event_id = e.id AND a.user_id = uid));

  SELECT jsonb_build_object('title', e.title, 'event_date', e.event_date, 'event_type', e.event_type)
  INTO next_event
  FROM calendar_events e
  WHERE e.event_date >= now() AND e.event_date < today_end
    AND (e.is_team_wide OR e.created_by = uid OR e.manager_id = uid
         OR EXISTS (SELECT 1 FROM calendar_event_assignees a WHERE a.event_id = e.id AND a.user_id = uid))
  ORDER BY e.event_date ASC LIMIT 1;

  SELECT count(*)::int INTO unclaimed
  FROM recruiting_leads WHERE status = 'New' AND claimed_by IS NULL;

  SELECT jsonb_build_object(
           'first_name', l.first_name,
           'hours_left', GREATEST(0, round(extract(epoch FROM (COALESCE(l.last_activity_at, l.claimed_at) + interval '48 hours' - now()))/3600.0, 1))
         )
  INTO at_risk
  FROM recruiting_leads l
  WHERE l.claimed_by = uid
    AND l.status IN ('Claimed','Contacted')
    AND COALESCE(l.ref_code,'') <> 'pipeline-import'
    AND COALESCE(l.last_activity_at, l.claimed_at) < now() - interval '40 hours'
  ORDER BY COALESCE(l.last_activity_at, l.claimed_at) ASC LIMIT 1;

  SELECT jsonb_build_object('lesson_id', l.id, 'title', l.title, 'course_slug', c.slug, 'module_title', m.title)
  INTO next_lesson
  FROM training_lessons l
  JOIN training_modules m ON m.id = l.module_id
  JOIN training_courses c ON c.id = m.course_id
  WHERE l.is_active IS NOT FALSE AND m.is_active IS NOT FALSE AND c.is_active IS NOT FALSE
    AND (c.target_role IS NULL OR c.target_role = 'rookie')
    AND NOT EXISTS (
      SELECT 1 FROM lesson_progress p
      WHERE p.user_id = uid AND p.lesson_id = l.id AND p.completed_at IS NOT NULL
    )
  ORDER BY c.display_order, m.display_order, l.display_order
  LIMIT 1;

  wk := (date_trunc('week', (now() AT TIME ZONE 'America/Los_Angeles'))::date);
  SELECT COALESCE(total_points,0)::int INTO week_points
  FROM leaderboard_points WHERE user_id = uid AND week_start = wk;

  SELECT count(*)::int INTO team_signs
  FROM recruiting_leads
  WHERE status = 'Signed' AND COALESCE(last_activity_at, created_at) >= wk;

  IF is_staff THEN
    SELECT count(*)::int INTO active_today
    FROM profiles WHERE last_active_at >= today_start;

    SELECT count(*)::int INTO stale_reps
    FROM profiles
    WHERE status IN ('active','contract_signed','onboarded','info_added')
      AND (last_active_at IS NULL OR last_active_at < now() - interval '48 hours');
  END IF;

  IF is_admin THEN
    SELECT count(*)::int INTO pending_queue
    FROM pitch_approval_requests WHERE status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'events_today', events_today,
    'next_event', next_event,
    'unclaimed_leads', unclaimed,
    'lead_at_risk', at_risk,
    'next_lesson', next_lesson,
    'week_points', week_points,
    'team_signs', team_signs,
    'is_staff', is_staff,
    'is_admin', is_admin,
    'team_active_today', active_today,
    'team_stale_48h', stale_reps,
    'pending_queue', pending_queue
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_home_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_home_snapshot() TO authenticated;