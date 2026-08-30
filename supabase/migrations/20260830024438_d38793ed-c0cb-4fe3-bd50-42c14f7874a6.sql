-- 1. Channel scope: staff rooms are manager-only, fail closed.
CREATE OR REPLACE FUNCTION public.is_staff_channel(_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT _slug IS NOT NULL AND (
    _slug = 'managers'
    OR _slug LIKE 'managers-%'
    OR _slug LIKE 'staff%'
    OR _slug LIKE 'leadership%'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff_channel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_channel(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.visible_chat_channels(_user_id uuid)
RETURNS TABLE(slug text, label text, icon text, color text, display_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT t.name AS team_name
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE p.user_id = _user_id
    LIMIT 1
  ),
  mgr AS (
    SELECT (
      _user_id IS NOT NULL AND (
        public.has_role(_user_id, 'manager')
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'owner')
        OR public.is_effective_manager(_user_id)
      )
    ) AS ok
  )
  SELECT c.slug, c.label, c.icon, c.color, c.display_order
  FROM public.chat_channels c, mgr
  WHERE _user_id IS NOT NULL
    AND c.is_active = true
    AND c.slug <> 'ai-coach'
    AND COALESCE(c.kind,'channel') <> 'dm'
    AND (
      _user_id = ANY (COALESCE(c.member_ids, '{}'::uuid[]))
      OR (COALESCE(c.kind,'channel') = 'group' AND public.is_chat_admin(_user_id))
      OR (
        COALESCE(c.kind,'channel') <> 'group'
        AND (CASE
          WHEN public.is_staff_channel(c.slug) THEN mgr.ok
          WHEN c.slug LIKE 'team-%' THEN mgr.ok OR c.slug = public.team_channel_slug((SELECT team_name FROM me))
          ELSE true
        END)
      )
    )
  ORDER BY c.display_order, c.label
$$;

REVOKE EXECUTE ON FUNCTION public.visible_chat_channels(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visible_chat_channels(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_channel(_channel text, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _uid IS NULL THEN false
    WHEN public.is_dm_channel(_channel) THEN public.is_dm_member(_channel, _uid)
    ELSE EXISTS (SELECT 1 FROM public.visible_chat_channels(_uid) v WHERE v.slug = _channel)
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_channel(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_channel(text, uuid) TO authenticated;

-- 2. Announcement ack counts, owner and admin only.
CREATE OR REPLACE FUNCTION public.announcement_ack_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _rows jsonb;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error','Not allowed');
  END IF;

  SELECT count(*)::int INTO _total
  FROM public.profiles p
  WHERE COALESCE(p.archived,false) = false AND COALESCE(p.status::text,'active') <> 'nlc';

  SELECT COALESCE(jsonb_object_agg(x.post_id, x.acked), '{}'::jsonb) INTO _rows
  FROM (
    SELECT a.post_id::text AS post_id, count(*)::int AS acked
    FROM public.announcement_acks a
    GROUP BY a.post_id
  ) x;

  RETURN jsonb_build_object('total', _total, 'counts', _rows);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.announcement_ack_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.announcement_ack_counts() TO authenticated;

-- 3. Event reminders, idempotent per user, event and window.
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS reminder_window text;

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_reminder_guard
  ON public.user_notifications (user_id, event_id, reminder_window)
  WHERE reminder_window IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_event_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  made integer := 0;
  ins integer;
  w record;
BEGIN
  FOR w IN
    SELECT * FROM (VALUES
      ('24h', interval '23 hours', interval '25 hours', 'tomorrow'),
      ('1h',  interval '0 hours',  interval '90 minutes', 'in an hour')
    ) AS t(win, lo, hi, phrase)
  LOOP
    INSERT INTO public.user_notifications (user_id, title, message, link, event_id, deliver_after, reminder_window)
    SELECT a.user_id,
           e.title,
           'You have ' || e.title || ' ' || w.phrase,
           '/app/events',
           e.id,
           now(),
           w.win
    FROM public.calendar_events e
    JOIN public.calendar_attendance a ON a.event_id = e.id AND a.status = 'attending'
    JOIN public.profiles p ON p.user_id = a.user_id
    LEFT JOIN public.notification_preferences np ON np.user_id = a.user_id
    WHERE e.event_date > now() + w.lo
      AND e.event_date <= now() + w.hi
      AND COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'active') <> 'nlc'
      AND COALESCE(np.calendar_events, true) = true
    ON CONFLICT (user_id, event_id, reminder_window) DO NOTHING;

    GET DIAGNOSTICS ins = ROW_COUNT;
    made := made + ins;
  END LOOP;

  RETURN made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_event_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_event_reminders() TO authenticated;

SELECT cron.unschedule('event-reminders');
SELECT cron.schedule('event-reminders', '0 * * * *', $$select public.notify_event_reminders();$$);
