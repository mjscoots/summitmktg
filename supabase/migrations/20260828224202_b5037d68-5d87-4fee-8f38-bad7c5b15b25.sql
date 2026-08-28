
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Owner and admin only: they run every room.
CREATE OR REPLACE FUNCTION public.is_chat_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = _uid AND r.role::text IN ('owner','admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_chat_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid) TO authenticated, service_role;

-- Edit any message when owner or admin, own message otherwise.
CREATE OR REPLACE FUNCTION public.edit_chat_message(_id uuid, _content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _owner uuid; _channel text; _body text := btrim(COALESCE(_content, ''));
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF _body = '' THEN RETURN jsonb_build_object('error', 'Message cannot be empty'); END IF;
  SELECT m.user_id, m.channel INTO _owner, _channel FROM public.chat_messages m WHERE m.id = _id;
  IF _owner IS NULL AND _channel IS NULL THEN RETURN jsonb_build_object('error', 'Message not found'); END IF;
  IF NOT public.can_read_channel(_channel, _uid) THEN RETURN jsonb_build_object('error', 'No access'); END IF;
  IF _owner <> _uid AND NOT public.is_chat_admin(_uid) THEN
    RETURN jsonb_build_object('error', 'You can only edit your own messages');
  END IF;
  UPDATE public.chat_messages SET content = _body, edited_at = now() WHERE id = _id;
  RETURN jsonb_build_object('id', _id, 'content', _body, 'edited_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.edit_chat_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_chat_message(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_chat_message(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _owner uuid; _channel text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  SELECT m.user_id, m.channel INTO _owner, _channel FROM public.chat_messages m WHERE m.id = _id;
  IF _owner IS NULL AND _channel IS NULL THEN RETURN jsonb_build_object('error', 'Message not found'); END IF;
  IF NOT public.can_read_channel(_channel, _uid) THEN RETURN jsonb_build_object('error', 'No access'); END IF;
  IF _owner <> _uid AND NOT public.is_chat_admin(_uid) THEN
    RETURN jsonb_build_object('error', 'You can only delete your own messages');
  END IF;
  DELETE FROM public.chat_messages WHERE id = _id;
  RETURN jsonb_build_object('id', _id, 'deleted', true);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_chat_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_chat_message(uuid) TO authenticated, service_role;

-- Rooms: owner and admin rename or delete any room, a team leader renames his own room.
CREATE OR REPLACE FUNCTION public.rename_chat_channel(_slug text, _label text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _name text := btrim(COALESCE(_label, '')); _kind text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF length(_name) < 2 THEN RETURN jsonb_build_object('error', 'Name is too short'); END IF;
  SELECT COALESCE(kind, 'channel') INTO _kind FROM public.chat_channels WHERE slug = _slug;
  IF _kind IS NULL THEN RETURN jsonb_build_object('error', 'Room not found'); END IF;
  IF _kind = 'dm' THEN RETURN jsonb_build_object('error', 'Direct messages cannot be renamed'); END IF;
  IF NOT (public.is_chat_admin(_uid) OR public.can_set_channel_cover(_slug, _uid)) THEN
    RETURN jsonb_build_object('error', 'Only this room''s manager can rename it');
  END IF;
  UPDATE public.chat_channels SET label = _name WHERE slug = _slug;
  RETURN jsonb_build_object('slug', _slug, 'label', _name);
END;
$$;
REVOKE ALL ON FUNCTION public.rename_chat_channel(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_chat_channel(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_chat_channel(_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _kind text; _removed int := 0;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF NOT public.is_chat_admin(_uid) THEN RETURN jsonb_build_object('error', 'Only an owner or admin can delete a room'); END IF;
  SELECT COALESCE(kind, 'channel') INTO _kind FROM public.chat_channels WHERE slug = _slug;
  IF _kind IS NULL THEN RETURN jsonb_build_object('error', 'Room not found'); END IF;
  DELETE FROM public.chat_messages WHERE channel = _slug;
  GET DIAGNOSTICS _removed = ROW_COUNT;
  DELETE FROM public.chat_channels WHERE slug = _slug;
  RETURN jsonb_build_object('slug', _slug, 'deleted', true, 'messages_removed', _removed);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_chat_channel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_chat_channel(text) TO authenticated, service_role;

-- Read ticks: the newest moment anyone else in the room read it.
CREATE OR REPLACE FUNCTION public.channel_read_mark(_channel text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _mark timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF NOT public.can_read_channel(_channel, _uid) THEN RETURN jsonb_build_object('error', 'No access'); END IF;
  SELECT max(s.last_read_at) INTO _mark
  FROM public.chat_read_state s
  WHERE s.channel = _channel AND s.user_id <> _uid;
  RETURN jsonb_build_object('channel', _channel, 'read_through', _mark);
END;
$$;
REVOKE ALL ON FUNCTION public.channel_read_mark(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.channel_read_mark(text) TO authenticated, service_role;

-- Tighten the direct table paths so a rep cannot touch another person's message.
DROP POLICY IF EXISTS "Managers can delete chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can delete chat messages" ON public.chat_messages;
CREATE POLICY "Owners and admins can delete any chat message"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (public.is_chat_admin(auth.uid()));
DROP POLICY IF EXISTS "Owners and admins can update any chat message" ON public.chat_messages;
CREATE POLICY "Owners and admins can update any chat message"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.is_chat_admin(auth.uid()))
  WITH CHECK (public.is_chat_admin(auth.uid()));

-- Room sheet flags and the edited stamp on message reads.
CREATE OR REPLACE FUNCTION public.get_channel_details(_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _kind text;
  _label text;
  _cover text;
  _members jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  IF NOT public.can_read_channel(_slug, _uid) THEN
    RETURN jsonb_build_object('error', 'No access');
  END IF;

  SELECT COALESCE(c.kind, 'channel'), c.label, c.cover_image_path
    INTO _kind, _label, _cover
  FROM public.chat_channels c WHERE c.slug = _slug;

  SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.full_name), '[]'::jsonb)
    INTO _members
  FROM (
    SELECT DISTINCT p.user_id, p.full_name, p.avatar_url
    FROM public.profiles p
    WHERE COALESCE(p.archived, false) = false
      AND (
        (_kind = 'dm' AND EXISTS (
          SELECT 1 FROM public.chat_channels c2
          WHERE c2.slug = _slug AND p.user_id = ANY (c2.member_ids)))
        OR (_slug LIKE 'team-%' AND EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id = p.team_id AND public.team_channel_slug(t.name) = _slug))
        OR EXISTS (
          SELECT 1 FROM public.chat_messages msg
          WHERE msg.channel = _slug AND msg.user_id = p.user_id AND msg.is_ai = false)
      )
      AND p.full_name IS NOT NULL
  ) m;

  RETURN jsonb_build_object(
    'slug', _slug,
    'label', _label,
    'kind', _kind,
    'cover_image_path', _cover,
    'can_set_cover', public.can_set_channel_cover(_slug, _uid),
    'can_rename', (_kind <> 'dm' AND (public.is_chat_admin(_uid) OR public.can_set_channel_cover(_slug, _uid))),
    'can_delete_room', (_kind <> 'dm' AND public.is_chat_admin(_uid)),
    'members', _members,
    'member_count', jsonb_array_length(_members)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_channel_messages(_channel text, _before timestamp with time zone DEFAULT now(), _limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF NOT public.can_read_channel(_channel, _uid) THEN
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
           COALESCE(m.kind,'text') AS kind, m.ref_id, m.meta, m.edited_at,
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
$$;
