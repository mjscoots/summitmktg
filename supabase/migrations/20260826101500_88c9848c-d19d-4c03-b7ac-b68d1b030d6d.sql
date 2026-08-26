-- =========================================================
-- 1. MESSAGE KINDS
-- =========================================================
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS ref_id uuid,
  ADD COLUMN IF NOT EXISTS meta jsonb;

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_kind_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_kind_check
  CHECK (kind IN ('text','event','announcement','incentive','win','award','poll','system'));

-- one-time backfill of legacy prefixed rows
UPDATE public.chat_messages
   SET kind = 'win',
       meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('legacy','win')
 WHERE content ~* '^\[\[WIN\|' AND kind = 'text';

UPDATE public.chat_messages
   SET kind = 'award',
       meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('legacy','awards')
 WHERE content ~* '^\[\[AWARDS\|' AND kind = 'text';

UPDATE public.chat_messages
   SET kind = 'poll',
       meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('legacy','poll')
 WHERE content LIKE '📊 Poll:%' AND kind = 'text';

UPDATE public.chat_messages
   SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('media','gif','url', substring(content from 5))
 WHERE content LIKE 'gif:%' AND meta IS NULL;

UPDATE public.chat_messages
   SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('media','sticker','key', substring(content from 9))
 WHERE content LIKE 'sticker:%' AND meta IS NULL;

UPDATE public.chat_messages
   SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('media','image','path', substring(content from 5))
 WHERE content LIKE 'img:%' AND meta IS NULL;

UPDATE public.chat_messages
   SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('media','voice')
 WHERE content LIKE 'voice:%' AND meta IS NULL;

UPDATE public.chat_messages
   SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('media','file')
 WHERE content LIKE 'file:%' AND meta IS NULL;

-- =========================================================
-- 2. EVENT / ATTENDANCE SCHEMA
-- =========================================================
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS rsvp_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS questions jsonb,
  ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;

ALTER TABLE public.calendar_attendance
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS answers jsonb;

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.calendar_attendance'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.calendar_attendance DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.calendar_attendance ADD CONSTRAINT calendar_attendance_status_check
  CHECK (status IN ('attending','not_attending','maybe'));

-- managers channel
INSERT INTO public.chat_channels (slug, label, icon, color, display_order, is_active)
SELECT 'managers', 'Managers', 'shield', 'primary',
       COALESCE((SELECT max(display_order) FROM public.chat_channels), 0) + 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.chat_channels WHERE slug = 'managers');

-- =========================================================
-- 3. ANNOUNCEMENT ACKS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.announcement_acks (
  post_id uuid NOT NULL REFERENCES public.announcement_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

GRANT SELECT, INSERT ON public.announcement_acks TO authenticated;
GRANT ALL ON public.announcement_acks TO service_role;
ALTER TABLE public.announcement_acks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own acks insert" ON public.announcement_acks;
CREATE POLICY "own acks insert" ON public.announcement_acks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own or staff acks read" ON public.announcement_acks;
CREATE POLICY "own or staff acks read" ON public.announcement_acks
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner')
  );

-- =========================================================
-- 4. CARD POSTING HELPERS + TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.event_target_channel(_scope text, _team_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE COALESCE(_scope,'everyone')
    WHEN 'team' THEN COALESCE(
      (SELECT public.team_channel_slug(t.name) FROM public.teams t WHERE t.id = _team_id), 'general')
    WHEN 'managers' THEN 'managers'
    ELSE 'general' END
$$;
REVOKE ALL ON FUNCTION public.event_target_channel(text, uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.event_card_meta(_e public.calendar_events)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'title', _e.title,
    'event_date', _e.event_date,
    'end_date', _e.end_date,
    'location', _e.location,
    'event_kind', COALESCE(_e.event_kind,'other'),
    'scope', COALESCE(_e.scope,'everyone'),
    'team_id', _e.team_id,
    'rsvp_deadline', _e.rsvp_deadline,
    'questions', COALESCE(_e.questions,'[]'::jsonb),
    'cancelled', COALESCE(_e.is_cancelled,false)
  )
$$;
REVOKE ALL ON FUNCTION public.event_card_meta(public.calendar_events) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.post_event_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _author uuid; _chan text;
BEGIN
  _author := COALESCE(NEW.created_by, NEW.manager_id);
  IF _author IS NULL THEN RETURN NEW; END IF;
  _chan := public.event_target_channel(NEW.scope, NEW.team_id);
  IF NOT EXISTS (SELECT 1 FROM public.chat_channels WHERE slug = _chan AND is_active) THEN
    _chan := 'general';
  END IF;
  INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, ref_id, meta)
  VALUES (_author, NEW.title, true, _chan, 'event', NEW.id, public.event_card_meta(NEW));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_event_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.chat_messages
     SET content = NEW.title, meta = public.event_card_meta(NEW)
   WHERE kind = 'event' AND ref_id = NEW.id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mark_event_card_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.chat_messages
     SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object('cancelled', true)
   WHERE kind = 'event' AND ref_id = OLD.id;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_post_event_card ON public.calendar_events;
CREATE TRIGGER trg_post_event_card AFTER INSERT ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.post_event_card();

DROP TRIGGER IF EXISTS trg_sync_event_card ON public.calendar_events;
CREATE TRIGGER trg_sync_event_card AFTER UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_card();

DROP TRIGGER IF EXISTS trg_cancel_event_card ON public.calendar_events;
CREATE TRIGGER trg_cancel_event_card BEFORE DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.mark_event_card_cancelled();

-- announcement cards
CREATE OR REPLACE FUNCTION public.sync_announcement_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _author uuid;
BEGIN
  IF COALESCE(NEW.status,'draft') = 'published' THEN
    _author := COALESCE(NEW.created_by, (SELECT user_id FROM public.user_roles WHERE role = 'owner' LIMIT 1));
    IF _author IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.chat_messages WHERE kind = 'announcement' AND ref_id = NEW.id) THEN
      UPDATE public.chat_messages
         SET content = NEW.title,
             is_pinned = COALESCE(NEW.is_pinned,false),
             meta = jsonb_build_object('title', NEW.title, 'body', NEW.body,
                                       'is_pinned', COALESCE(NEW.is_pinned,false))
       WHERE kind = 'announcement' AND ref_id = NEW.id;
    ELSE
      INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, ref_id, meta, is_pinned)
      VALUES (_author, NEW.title, true, 'announcements', 'announcement', NEW.id,
              jsonb_build_object('title', NEW.title, 'body', NEW.body,
                                 'is_pinned', COALESCE(NEW.is_pinned,false)),
              COALESCE(NEW.is_pinned,false));
    END IF;
  ELSE
    DELETE FROM public.chat_messages WHERE kind = 'announcement' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_announcement_card ON public.announcement_posts;
CREATE TRIGGER trg_sync_announcement_card AFTER INSERT OR UPDATE ON public.announcement_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_announcement_card();

-- incentive cards
CREATE OR REPLACE FUNCTION public.sync_incentive_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _author uuid;
BEGIN
  IF COALESCE(NEW.is_active,false) THEN
    _author := (SELECT user_id FROM public.user_roles WHERE role = 'owner' LIMIT 1);
    IF _author IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.chat_messages WHERE kind = 'incentive' AND ref_id = NEW.id) THEN
      UPDATE public.chat_messages
         SET content = NEW.name,
             meta = jsonb_build_object('name', NEW.name, 'metric', NEW.metric,
                                       'target', NEW.target, 'ends_on', NEW.ends_on,
                                       'prize_note', NEW.prize_note)
       WHERE kind = 'incentive' AND ref_id = NEW.id;
    ELSE
      INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, ref_id, meta)
      VALUES (_author, NEW.name, true, 'general', 'incentive', NEW.id,
              jsonb_build_object('name', NEW.name, 'metric', NEW.metric,
                                 'target', NEW.target, 'ends_on', NEW.ends_on,
                                 'prize_note', NEW.prize_note));
    END IF;
  ELSE
    DELETE FROM public.chat_messages WHERE kind = 'incentive' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_incentive_card ON public.incentives;
CREATE TRIGGER trg_sync_incentive_card AFTER INSERT OR UPDATE ON public.incentives
  FOR EACH ROW EXECUTE FUNCTION public.sync_incentive_card();

-- =========================================================
-- 5. RSVP + ROLLUP + ACK + ACTION CARDS
-- =========================================================
CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ev record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_status NOT IN ('attending','not_attending','maybe') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Event not available';
  END IF;
  INSERT INTO public.calendar_attendance (event_id, user_id, status, responded_at)
  VALUES (p_event_id, auth.uid(), p_status, now())
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = excluded.status, responded_at = now(), updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid, p_status text, p_answers jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ev record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_status NOT IN ('attending','not_attending','maybe') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Event not available';
  END IF;
  INSERT INTO public.calendar_attendance (event_id, user_id, status, responded_at, answers)
  VALUES (p_event_id, auth.uid(), p_status, now(), p_answers)
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = excluded.status, responded_at = now(),
        answers = COALESCE(excluded.answers, public.calendar_attendance.answers),
        updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.get_event_rsvp_rollup(_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  ev record;
  _staff boolean;
  _audience jsonb;
  _going jsonb; _not jsonb; _maybe jsonb; _none jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = _event_id;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, _uid) THEN
    RETURN jsonb_build_object('error','Event not available');
  END IF;

  _staff := ev.created_by = _uid
    OR public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');

  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'name', p.full_name,
                                               'status', a.status, 'answers', a.answers)
                            ORDER BY p.full_name), '[]'::jsonb)
    INTO _audience
    FROM public.calendar_attendance a
    LEFT JOIN public.profiles p ON p.user_id = a.user_id
   WHERE a.event_id = _event_id;

  SELECT jsonb_agg(c) FILTER (WHERE c->>'status' = 'attending'),
         jsonb_agg(c) FILTER (WHERE c->>'status' = 'not_attending'),
         jsonb_agg(c) FILTER (WHERE c->>'status' = 'maybe')
    INTO _going, _not, _maybe
    FROM jsonb_array_elements(_audience) c;

  IF _staff THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.full_name)
                              ORDER BY p.full_name), '[]'::jsonb)
      INTO _none
      FROM public.profiles p
     WHERE COALESCE(p.archived,false) = false
       AND public.can_view_event(ev.scope, ev.team_id, p.user_id)
       AND NOT EXISTS (SELECT 1 FROM public.calendar_attendance a
                        WHERE a.event_id = _event_id AND a.user_id = p.user_id);
  ELSE
    _none := NULL;
  END IF;

  RETURN jsonb_build_object(
    'is_staff', _staff,
    'going', COALESCE(_going,'[]'::jsonb),
    'not_going', COALESCE(_not,'[]'::jsonb),
    'maybe', COALESCE(_maybe,'[]'::jsonb),
    'no_answer', _none,
    'going_count', jsonb_array_length(COALESCE(_going,'[]'::jsonb))
  );
END $$;

CREATE OR REPLACE FUNCTION public.ack_announcement(_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.announcement_acks (post_id, user_id)
  VALUES (_post_id, auth.uid())
  ON CONFLICT (post_id, user_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.get_announcement_ack_status(_post_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  _staff := public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');
  RETURN jsonb_build_object(
    'mine', EXISTS (SELECT 1 FROM public.announcement_acks a
                     WHERE a.post_id = _post_id AND a.user_id = _uid),
    'is_staff', _staff,
    'ack_count', (SELECT count(*)::int FROM public.announcement_acks a WHERE a.post_id = _post_id),
    'not_acked', CASE WHEN _staff THEN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.full_name)
                                  ORDER BY p.full_name), '[]'::jsonb)
        FROM public.profiles p
        WHERE COALESCE(p.archived,false) = false
          AND NOT EXISTS (SELECT 1 FROM public.announcement_acks a
                           WHERE a.post_id = _post_id AND a.user_id = p.user_id)
      ) ELSE NULL END
  );
END $$;

CREATE OR REPLACE FUNCTION public.get_action_cards()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _cards jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('cards','[]'::jsonb); END IF;

  -- unanswered RSVPs: a deadline in the future, or starting within 14 days
  SELECT _cards || COALESCE(jsonb_agg(c ORDER BY c->>'when_at'), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','rsvp', 'id', e.id, 'title', e.title,
             'when_at', e.event_date, 'location', e.location,
             'event_kind', COALESCE(e.event_kind,'other'),
             'rsvp_deadline', e.rsvp_deadline,
             'questions', COALESCE(e.questions,'[]'::jsonb)
           ) AS c, e.event_date
    FROM public.calendar_events e
    WHERE COALESCE(e.is_cancelled,false) = false
      AND e.event_date >= now()
      AND (e.rsvp_deadline IS NULL OR e.rsvp_deadline >= now())
      AND (e.rsvp_deadline IS NOT NULL OR e.event_date <= now() + interval '14 days')
      AND public.can_view_event(e.scope, e.team_id, _uid)
      AND NOT EXISTS (SELECT 1 FROM public.calendar_attendance a
                       WHERE a.event_id = e.id AND a.user_id = _uid)
    LIMIT 20
  ) q;

  -- incentives ending within 7 days
  SELECT _cards || COALESCE(jsonb_agg(c ORDER BY c->>'ends_on'), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','incentive', 'id', i.id, 'title', i.name,
             'metric', i.metric, 'target', i.target, 'ends_on', i.ends_on,
             'prize_note', i.prize_note
           ) AS c
    FROM public.incentives i
    WHERE i.is_active
      AND i.ends_on IS NOT NULL
      AND i.ends_on >= CURRENT_DATE
      AND i.ends_on <= CURRENT_DATE + 7
    LIMIT 10
  ) q;

  -- pinned published announcements not acknowledged
  SELECT _cards || COALESCE(jsonb_agg(c), '[]'::jsonb) INTO _cards
  FROM (
    SELECT jsonb_build_object(
             'type','announcement', 'id', ap.id, 'title', ap.title,
             'body', ap.body, 'when_at', ap.created_at
           ) AS c
    FROM public.announcement_posts ap
    WHERE COALESCE(ap.status,'draft') = 'published'
      AND COALESCE(ap.is_pinned,false) = true
      AND NOT EXISTS (SELECT 1 FROM public.announcement_acks a
                       WHERE a.post_id = ap.id AND a.user_id = _uid)
    LIMIT 10
  ) q;

  RETURN jsonb_build_object('cards', _cards);
END $$;

-- =========================================================
-- 6. get_channel_messages returns kind/ref_id/meta
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_channel_messages(_channel text, _before timestamp with time zone DEFAULT now(), _limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _uid uuid := auth.uid();
  _lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.visible_chat_channels(_uid) v WHERE v.slug = _channel
  ) AND _channel <> 'ai-coach' THEN
    RETURN jsonb_build_object('error', 'No access');
  END IF;

  IF _channel = 'ai-coach' THEN
    RETURN jsonb_build_object('messages', '[]'::jsonb, 'has_more', false);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.created_at), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT m.id, m.user_id, m.content, m.is_ai, m.created_at, m.reply_to,
           m.channel, COALESCE(m.is_pinned, false) AS is_pinned,
           COALESCE(m.kind,'text') AS kind, m.ref_id, m.meta,
           CASE WHEN m.is_ai THEN 'Summit AI' ELSE p.full_name END AS sender_name,
           p.avatar_url AS sender_avatar,
           p.is_active_now AS sender_active,
           COALESCE(p.archived, false) AS sender_archived,
           (SELECT r.role::text FROM public.user_roles r
             WHERE r.user_id = m.user_id
             ORDER BY CASE r.role::text
               WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END DESC
             LIMIT 1) AS sender_role,
           rp.id AS reply_id,
           CASE WHEN rp.is_ai THEN 'Summit AI' ELSE rpp.full_name END AS reply_sender,
           left(rp.content, 80) AS reply_excerpt,
           COALESCE((
             SELECT jsonb_agg(jsonb_build_object('emoji', g.emoji, 'count', g.cnt, 'mine', g.mine)
                              ORDER BY g.emoji)
             FROM (
               SELECT cr.emoji, count(*)::int AS cnt, bool_or(cr.user_id = _uid) AS mine
               FROM public.chat_reactions cr
               WHERE cr.message_id = m.id
               GROUP BY cr.emoji
             ) g
           ), '[]'::jsonb) AS reactions
    FROM public.chat_messages m
    LEFT JOIN public.profiles p ON p.user_id = m.user_id
    LEFT JOIN public.chat_messages rp ON rp.id = m.reply_to
    LEFT JOIN public.profiles rpp ON rpp.user_id = rp.user_id
    WHERE m.channel = _channel
      AND m.created_at < COALESCE(_before, now())
    ORDER BY m.created_at DESC
    LIMIT _lim
  ) y;

  RETURN jsonb_build_object(
    'messages', _rows,
    'has_more', jsonb_array_length(_rows) = _lim
  );
END;
$function$;

-- =========================================================
-- 7. GRANTS
-- =========================================================
REVOKE ALL ON FUNCTION public.rsvp_event(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rsvp_event(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_event_rsvp_rollup(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ack_announcement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_announcement_ack_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_action_cards() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_channel_messages(text, timestamptz, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_rollup(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ack_announcement(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_announcement_ack_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_action_cards() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_channel_messages(text, timestamptz, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.event_target_channel(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_card_meta(public.calendar_events) TO service_role;