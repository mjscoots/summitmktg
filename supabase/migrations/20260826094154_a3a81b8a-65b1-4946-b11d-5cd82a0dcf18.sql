-- 1. Conversation list in one call
CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _vert text;
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  _vert := public.my_active_vertical();

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.display_order, x.label), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT v.slug,
           v.label,
           v.icon,
           v.color,
           v.display_order,
           CASE WHEN v.slug LIKE 'team-%' THEN 'team' ELSE 'channel' END AS kind,
           false AS is_pinned,
           lm.content AS last_content,
           lm.created_at AS last_at,
           CASE WHEN lm.is_ai THEN 'Summit AI' ELSE lp.full_name END AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = v.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = v.slug),
                     (SELECT r2.last_read_at FROM public.chat_read_state r2
                      WHERE r2.user_id = _uid AND r2.channel = 'general'),
                     now())
           ) AS unread
    FROM public.visible_chat_channels(_uid) v
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id, m.is_ai
      FROM public.chat_messages m
      WHERE m.channel = v.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
    WHERE EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.slug = v.slug
        AND (c.vertical IS NULL OR c.vertical = _vert)
    )
    OR NOT EXISTS (SELECT 1 FROM public.chat_channels c2 WHERE c2.slug = v.slug)
  ) x;

  RETURN jsonb_build_object(
    'conversations', _rows,
    'total_unread', (SELECT COALESCE(sum((c->>'unread')::int), 0) FROM jsonb_array_elements(_rows) c)
  );
END;
$function$;

-- 2. Keyset message page with senders, reply preview and reactions
CREATE OR REPLACE FUNCTION public.get_channel_messages(
  _channel text,
  _before timestamptz DEFAULT now(),
  _limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
             SELECT jsonb_agg(jsonb_build_object(
                      'emoji', g.emoji,
                      'count', g.cnt,
                      'mine', g.mine
                    ) ORDER BY g.emoji)
             FROM (
               SELECT cr.emoji, count(*)::int AS cnt,
                      bool_or(cr.user_id = _uid) AS mine
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

-- 3. Points + mention notifications on insert
CREATE OR REPLACE FUNCTION public.tg_chat_message_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_name text;
  _content text := COALESCE(NEW.content, '');
BEGIN
  IF NEW.is_ai THEN
    RETURN NEW;
  END IF;

  PERFORM public.award_chat_message_points(NEW.user_id, _content, NEW.id::text);

  IF position('@' in _content) > 0 THEN
    SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.user_id;

    INSERT INTO public.user_notifications (user_id, title, message, link)
    SELECT t.user_id,
           COALESCE(sender_name, 'Someone') || ' mentioned you in #' || COALESCE(NEW.channel, 'general'),
           'Tap to open the conversation.',
           '/app/chat?channel=' || COALESCE(NEW.channel, 'general')
    FROM (
      SELECT DISTINCT p.user_id
      FROM public.profiles p
      LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
      WHERE p.user_id <> NEW.user_id
        AND p.archived = false
        AND COALESCE(p.status::text, '') NOT IN ('nlc', 'rejected', 'pending')
        AND COALESCE(np.chat_mentions, true)
        AND p.full_name IS NOT NULL
        AND length(p.full_name) > 2
        AND (
          lower(_content) LIKE '%@' || lower(p.full_name) || '%'
          OR lower(_content) LIKE '%@' || lower(split_part(p.full_name, ' ', 1)) || '%'
        )
        AND EXISTS (
          SELECT 1 FROM public.rep_vertical_enrollments e
          WHERE e.user_id = p.user_id
            AND e.status IN ('approved','onboarding','active','paused')
        )
    ) t;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS chat_message_after_insert ON public.chat_messages;
CREATE TRIGGER chat_message_after_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_chat_message_after_insert();

-- 4. Grants: the app calls the two readers; the helpers are trigger-only now
REVOKE ALL ON FUNCTION public.get_conversations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_channel_messages(text, timestamptz, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_channel_messages(text, timestamptz, int) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.tg_chat_message_after_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_chat_message_after_insert() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.award_chat_message_points(uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_chat_mentions(uuid, uuid[]) FROM anon, authenticated;