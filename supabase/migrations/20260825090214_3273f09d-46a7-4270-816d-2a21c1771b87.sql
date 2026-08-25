-- =========================================================
-- 1. NOTIFICATION DELIVERY CONTROLS (quiet hours + digest)
-- =========================================================
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deliver_after timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS digested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_digest boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_notifications_deliver
  ON public.user_notifications (user_id, deliver_after) WHERE digested = false;

-- Quiet hours: 10pm-7am in the org timezone (America/New_York)
CREATE OR REPLACE FUNCTION public.notification_deliver_at(_urgent boolean)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  local_ts timestamp;
  h int;
BEGIN
  IF _urgent THEN
    RETURN now();
  END IF;
  local_ts := (now() AT TIME ZONE 'America/New_York');
  h := extract(hour FROM local_ts)::int;
  IF h >= 22 THEN
    RETURN ((date_trunc('day', local_ts) + interval '1 day' + interval '7 hours') AT TIME ZONE 'America/New_York');
  ELSIF h < 7 THEN
    RETURN ((date_trunc('day', local_ts) + interval '7 hours') AT TIME ZONE 'America/New_York');
  END IF;
  RETURN now();
END;
$$;

-- Applies quiet hours to every writer without touching each one.
-- Lead events (link under /app/recruits) are urgent and always immediate.
CREATE OR REPLACE FUNCTION public.set_notification_delivery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.urgent IS NOT TRUE AND COALESCE(NEW.link, '') LIKE '/app/recruits%' THEN
    NEW.urgent := true;
  END IF;
  IF NEW.is_digest THEN
    RETURN NEW;
  END IF;
  NEW.deliver_after := public.notification_deliver_at(NEW.urgent);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_notification_delivery ON public.user_notifications;
CREATE TRIGGER trg_set_notification_delivery
  BEFORE INSERT ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_delivery();

-- Collapse 3+ held non-urgent notifications into one summary
CREATE OR REPLACE FUNCTION public.run_notification_digest()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  made int := 0;
BEGIN
  FOR r IN
    SELECT user_id,
           count(*)::int AS cnt,
           min(deliver_after) AS deliver_at,
           string_agg(DISTINCT title, ', ') AS titles
    FROM public.user_notifications
    WHERE digested = false
      AND is_digest = false
      AND urgent = false
      AND is_read = false
      AND deliver_after > now()
    GROUP BY user_id
    HAVING count(*) >= 3
  LOOP
    UPDATE public.user_notifications
    SET digested = true
    WHERE user_id = r.user_id
      AND digested = false
      AND is_digest = false
      AND urgent = false
      AND is_read = false
      AND deliver_after > now();

    INSERT INTO public.user_notifications (user_id, title, message, link, urgent, is_digest, deliver_after)
    VALUES (
      r.user_id,
      r.cnt || ' updates while you were off',
      left(r.titles, 300),
      '/app',
      false,
      true,
      r.deliver_at
    );
    made := made + 1;
  END LOOP;
  RETURN made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_notification_digest() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notification_deliver_at(boolean) FROM anon;

-- =========================================================
-- 2. ANNOUNCEMENT AUDIENCE TARGETING
-- =========================================================
ALTER TABLE public.announcement_posts
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS audience_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

ALTER TABLE public.announcement_posts DROP CONSTRAINT IF EXISTS announcement_posts_audience_check;
ALTER TABLE public.announcement_posts
  ADD CONSTRAINT announcement_posts_audience_check
  CHECK (audience IN ('everyone', 'managers', 'team'));

DROP POLICY IF EXISTS "Anyone can view published announcements" ON public.announcement_posts;
CREATE POLICY "Audience can view published announcements"
ON public.announcement_posts
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    audience = 'everyone'
    OR (audience = 'managers' AND (
      has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
    ))
    OR (audience = 'team' AND (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
      OR audience_team_id = (SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid())
    ))
  )
);

-- Fan-out respects the audience
CREATE OR REPLACE FUNCTION public.notify_announcement_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, title, message, link)
  SELECT p.user_id,
         'New announcement',
         NEW.title,
         '/app'
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE p.user_id IS NOT NULL
    AND (COALESCE(p.status::text, '') NOT IN ('nlc', 'rejected', 'pending') AND p.archived = false)
    AND COALESCE(np.announcements, true)
    AND (
      NEW.audience = 'everyone'
      OR (NEW.audience = 'managers' AND (
        has_role(p.user_id, 'manager') OR has_role(p.user_id, 'admin') OR has_role(p.user_id, 'owner')
      ))
      OR (NEW.audience = 'team' AND p.team_id = NEW.audience_team_id)
    );

  RETURN NEW;
END;
$$;

-- Seen-by denominators respect the audience
CREATE OR REPLACE FUNCTION public.get_announcement_seen_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows jsonb;
  total_all int;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
  ) THEN
    RETURN jsonb_build_object('total', 0, 'counts', '{}'::jsonb);
  END IF;

  SELECT count(*)::int INTO total_all
  FROM profiles
  WHERE archived = false AND status IN ('active','contract_signed','onboarded','info_added');

  SELECT COALESCE(jsonb_object_agg(a.id::text, jsonb_build_object('seen', s.c, 'total', t.audience_total)), '{}'::jsonb)
  INTO rows
  FROM announcement_posts a
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS c FROM announcement_views v WHERE v.announcement_id = a.id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS audience_total
    FROM profiles p
    WHERE p.archived = false
      AND p.status IN ('active','contract_signed','onboarded','info_added')
      AND (
        a.audience = 'everyone'
        OR (a.audience = 'managers' AND (
          has_role(p.user_id, 'manager') OR has_role(p.user_id, 'admin') OR has_role(p.user_id, 'owner')
        ))
        OR (a.audience = 'team' AND p.team_id = a.audience_team_id)
      )
  ) t ON true;

  RETURN jsonb_build_object('total', total_all, 'counts', rows);
END;
$$;

-- =========================================================
-- 3. CHAT MENTION NOTIFICATIONS
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_chat_mentions(_message_id uuid, _user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg record;
  sender_name text;
  made int := 0;
BEGIN
  IF auth.uid() IS NULL OR _message_id IS NULL OR _user_ids IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id, user_id, channel INTO msg
  FROM public.chat_messages WHERE id = _message_id;

  IF msg.id IS NULL OR msg.user_id <> auth.uid() THEN
    RETURN 0;
  END IF;

  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = auth.uid();

  WITH targets AS (
    SELECT DISTINCT p.user_id
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
    WHERE p.user_id = ANY(_user_ids)
      AND p.user_id <> auth.uid()
      AND p.archived = false
      AND COALESCE(p.status::text, '') NOT IN ('nlc', 'rejected', 'pending')
      AND COALESCE(np.chat_mentions, true)
  ), ins AS (
    INSERT INTO public.user_notifications (user_id, title, message, link)
    SELECT t.user_id,
           COALESCE(sender_name, 'Someone') || ' mentioned you in #' || COALESCE(msg.channel, 'general'),
           'Tap to open the conversation.',
           '/app/chat?channel=' || COALESCE(msg.channel, 'general')
    FROM targets t
    RETURNING 1
  )
  SELECT count(*)::int INTO made FROM ins;

  RETURN made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_chat_mentions(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.notify_chat_mentions(uuid, uuid[]) TO authenticated;