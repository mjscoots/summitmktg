-- Pass 117: one new column for group cover photos.
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS cover_image_path text NULL;

-- Who may set a group cover: chat staff (owner/admin/president),
-- the leader of that team's room, or the person who created the channel.
CREATE OR REPLACE FUNCTION public.can_set_channel_cover(_slug text, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _uid IS NOT NULL
     AND _slug IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.chat_channels c
       WHERE c.slug = _slug
         AND COALESCE(c.kind, 'channel') <> 'dm'
         AND (
           public.is_chat_staff(_uid)
           OR c.created_by = _uid
           OR (
             c.slug LIKE 'team-%'
             AND EXISTS (
               SELECT 1 FROM public.teams t
               WHERE t.leader_id = _uid
                 AND public.team_channel_slug(t.name) = c.slug
             )
           )
         )
     );
$function$;

-- Set or clear a group cover. Authorization lives here, not in the client.
CREATE OR REPLACE FUNCTION public.set_channel_cover(_slug text, _path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  IF NOT public.can_read_channel(_slug, _uid) THEN
    RETURN jsonb_build_object('error', 'No access');
  END IF;
  IF NOT public.can_set_channel_cover(_slug, _uid) THEN
    RETURN jsonb_build_object('error', 'Only this room''s manager can change the photo.');
  END IF;

  UPDATE public.chat_channels
     SET cover_image_path = NULLIF(btrim(COALESCE(_path, '')), '')
   WHERE slug = _slug;

  RETURN jsonb_build_object('slug', _slug, 'cover_image_path', NULLIF(btrim(COALESCE(_path, '')), ''));
END;
$function$;

-- Room details for the header sheet: cover, whether the caller may change it,
-- and the people in the room with their profile photos.
CREATE OR REPLACE FUNCTION public.get_channel_details(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        -- direct message: the two people on it
        (_kind = 'dm' AND EXISTS (
          SELECT 1 FROM public.chat_channels c2
          WHERE c2.slug = _slug AND p.user_id = ANY (c2.member_ids)))
        -- team room: that team's roster
        OR (_slug LIKE 'team-%' AND EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id = p.team_id AND public.team_channel_slug(t.name) = _slug))
        -- any room: people who have posted in it
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
    'members', _members,
    'member_count', jsonb_array_length(_members)
  );
END;
$function$;

-- Covers live in the private chat bucket, so people who can read the room
-- can read its cover object.
CREATE OR REPLACE FUNCTION public.chat_attachment_readable(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    (storage.foldername(_object_name))[1] = auth.uid()::text
    OR public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.content LIKE '%' || _object_name
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.cover_image_path = _object_name
        AND public.can_read_channel(c.slug, auth.uid())
    )
  );
$function$;

-- Conversation list carries the cover so the list renders in one round trip.
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
  _dms jsonb;
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
           NULL::text AS avatar_url,
           NULL::uuid AS other_user_id,
           (SELECT c3.cover_image_path FROM public.chat_channels c3 WHERE c3.slug = v.slug) AS cover_image_path,
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

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.last_at DESC NULLS LAST, d.label), '[]'::jsonb)
  INTO _dms
  FROM (
    SELECT c.slug,
           COALESCE(op.full_name, c.label) AS label,
           'MessageSquare'::text AS icon,
           'text-foreground'::text AS color,
           900 AS display_order,
           'dm'::text AS kind,
           false AS is_pinned,
           op.avatar_url,
           other.uid AS other_user_id,
           NULL::text AS cover_image_path,
           lm.content AS last_content,
           lm.created_at AS last_at,
           lp.full_name AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = c.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = c.slug),
                     '-infinity'::timestamptz)
           ) AS unread
    FROM public.chat_channels c
    CROSS JOIN LATERAL (
      SELECT (SELECT u FROM unnest(c.member_ids) u WHERE u <> _uid LIMIT 1) AS uid
    ) other
    LEFT JOIN public.profiles op ON op.user_id = other.uid
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id
      FROM public.chat_messages m
      WHERE m.channel = c.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
    WHERE c.kind = 'dm'
      AND c.is_active = true
      AND (_uid = ANY (c.member_ids) OR public.is_chat_staff(_uid))
  ) d;

  _rows := _rows || _dms;

  RETURN jsonb_build_object(
    'conversations', _rows,
    'total_unread', (SELECT COALESCE(sum((c->>'unread')::int), 0) FROM jsonb_array_elements(_rows) c)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_set_channel_cover(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_channel_cover(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_channel_details(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_set_channel_cover(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_channel_cover(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_channel_details(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.chat_attachment_readable(text) TO authenticated, service_role;