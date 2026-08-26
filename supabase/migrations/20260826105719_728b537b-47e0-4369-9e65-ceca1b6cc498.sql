-- Section A: honest time
ALTER TABLE public.daily_training_time ADD COLUMN IF NOT EXISTS app_minutes integer NOT NULL DEFAULT 0;

UPDATE public.daily_training_time
SET app_minutes = total_minutes,
    training_minutes = training_minutes + video_minutes + lesson_minutes
WHERE app_minutes = 0 AND total_minutes > 0;

INSERT INTO public.app_settings (key, value)
SELECT 'company_timezone', 'America/Los_Angeles'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'company_timezone');

CREATE OR REPLACE FUNCTION public.company_timezone()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key = 'company_timezone'), ''), 'America/Los_Angeles')
$$;

DROP FUNCTION IF EXISTS public.record_daily_time(uuid, text);

CREATE OR REPLACE FUNCTION public.record_daily_time(_category text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tz text := public.company_timezone();
  _today date;
  _week_start date;
  _week_total integer;
  _is_training integer;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  _today := (now() AT TIME ZONE _tz)::date;
  _week_start := date_trunc('week', (now() AT TIME ZONE _tz))::date;
  _is_training := CASE WHEN COALESCE(_category,'other') IN ('training','video','lesson') THEN 1 ELSE 0 END;

  INSERT INTO public.daily_training_time (user_id, date, app_minutes, total_minutes, training_minutes, video_minutes, lesson_minutes)
  VALUES (_uid, _today, 1, 1, _is_training,
    CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, date) DO UPDATE SET
    app_minutes = daily_training_time.app_minutes + 1,
    total_minutes = daily_training_time.total_minutes + 1,
    training_minutes = daily_training_time.training_minutes + _is_training,
    video_minutes = daily_training_time.video_minutes + CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    lesson_minutes = daily_training_time.lesson_minutes + CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END,
    updated_at = now();

  SELECT COALESCE(SUM(app_minutes), 0) INTO _week_total
  FROM public.daily_training_time
  WHERE user_id = _uid AND date >= _week_start;

  UPDATE public.profiles
  SET time_this_week_minutes = _week_total, week_start = _week_start, updated_at = now()
  WHERE profiles.user_id = _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_activity_ping(_minutes integer DEFAULT 1, _screen text DEFAULT 'other'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _day date;
  _m integer := greatest(COALESCE(_minutes, 1), 0);
  _key text := COALESCE(NULLIF(_screen, ''), 'other');
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  _day := (now() AT TIME ZONE public.company_timezone())::date;

  INSERT INTO public.activity_days (user_id, day, minutes, sessions, screens)
  VALUES (_uid, _day, _m, 1, jsonb_build_object(_key, _m))
  ON CONFLICT (user_id, day) DO UPDATE
    SET minutes = public.activity_days.minutes + _m,
        screens = public.activity_days.screens
          || jsonb_build_object(_key, COALESCE((public.activity_days.screens ->> _key)::int, 0) + _m),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_time(text) FROM anon;
REVOKE ALL ON FUNCTION public.record_activity_ping(integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.company_timezone() FROM anon;
GRANT EXECUTE ON FUNCTION public.record_daily_time(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity_ping(integer, text) TO authenticated;

-- owner + leader chain read access
DROP POLICY IF EXISTS "Managers can view all daily time" ON public.daily_training_time;
CREATE POLICY "Leaders and staff view daily time" ON public.daily_training_time
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'president'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

DROP POLICY IF EXISTS "staff read activity" ON public.activity_days;
CREATE POLICY "Leaders and staff read activity" ON public.activity_days
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'president'::app_role)
  OR public.can_view_person(user_id) <> 'none'
);

GRANT SELECT, INSERT, UPDATE ON public.daily_training_time TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.activity_days TO authenticated;
GRANT ALL ON public.daily_training_time TO service_role;
GRANT ALL ON public.activity_days TO service_role;

-- What they trained on
CREATE OR REPLACE FUNCTION public.get_training_recap(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('error','No access'); END IF;
  IF public.can_view_person(_user_id) = 'none' THEN RETURN jsonb_build_object('error','No access'); END IF;

  SELECT jsonb_build_object(
    'lessons', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', l.title, 'at', lp.completed_at) ORDER BY lp.completed_at DESC), '[]'::jsonb)
      FROM public.lesson_progress lp JOIN public.training_lessons l ON l.id = lp.lesson_id
      WHERE lp.user_id = _user_id AND lp.completed_at >= now() - interval '30 days'
    ),
    'videos', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', v.title, 'at', vp.watched_at) ORDER BY vp.watched_at DESC), '[]'::jsonb)
      FROM public.video_progress vp JOIN public.training_videos v ON v.id = vp.video_id
      WHERE vp.user_id = _user_id AND vp.watched = true AND vp.watched_at >= now() - interval '30 days'
    ),
    'drills', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(d.category,'Drill'), 'at', dc.created_at) ORDER BY dc.created_at DESC), '[]'::jsonb)
      FROM public.drill_completions dc LEFT JOIN public.training_drills d ON d.id = dc.drill_id
      WHERE dc.user_id = _user_id AND dc.created_at >= now() - interval '30 days'
    ),
    'chapters', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', mcp.chapter_id, 'at', mcp.completed_at) ORDER BY mcp.completed_at DESC), '[]'::jsonb)
      FROM public.manual_chapter_progress mcp
      WHERE mcp.user_id = _user_id AND mcp.completed_at >= now() - interval '30 days'
    )
  ) INTO _out;

  RETURN _out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_training_recap(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_training_recap(uuid) TO authenticated;