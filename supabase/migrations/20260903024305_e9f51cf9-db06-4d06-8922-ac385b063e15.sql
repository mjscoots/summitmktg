-- A room with member_ids populated is a direct message or small group thread.
-- Cards never belong there: fall back to the company room.
CREATE OR REPLACE FUNCTION public.card_channel_or_general(_slug text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _slug IS NULL THEN 'general'
    WHEN EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.slug = _slug
        AND c.member_ids IS NOT NULL
        AND array_length(c.member_ids, 1) > 0
    ) THEN 'general'
    ELSE _slug
  END
$$;

REVOKE ALL ON FUNCTION public.card_channel_or_general(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.card_channel_or_general(text) FROM anon;
REVOKE ALL ON FUNCTION public.card_channel_or_general(text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.event_target_channel(_scope text, _team_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.card_channel_or_general(
    CASE COALESCE(_scope,'everyone')
      WHEN 'team' THEN COALESCE(
        (SELECT public.team_channel_slug(t.name) FROM public.teams t WHERE t.id = _team_id), 'general')
      WHEN 'managers' THEN 'managers'
      ELSE 'general' END
  )
$$;

CREATE OR REPLACE FUNCTION public.sync_announcement_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _author uuid; _chan text;
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
      _chan := public.card_channel_or_general('announcements');
      INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, ref_id, meta, is_pinned)
      VALUES (_author, NEW.title, true, _chan, 'announcement', NEW.id,
              jsonb_build_object('title', NEW.title, 'body', NEW.body,
                                 'is_pinned', COALESCE(NEW.is_pinned,false)),
              COALESCE(NEW.is_pinned,false));
    END IF;
  ELSE
    DELETE FROM public.chat_messages WHERE kind = 'announcement' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.sync_incentive_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _author uuid; _chan text;
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
      _chan := public.card_channel_or_general('general');
      INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, ref_id, meta)
      VALUES (_author, NEW.name, true, _chan, 'incentive', NEW.id,
              jsonb_build_object('name', NEW.name, 'metric', NEW.metric,
                                 'target', NEW.target, 'ends_on', NEW.ends_on,
                                 'prize_note', NEW.prize_note));
    END IF;
  ELSE
    DELETE FROM public.chat_messages WHERE kind = 'incentive' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END $function$;