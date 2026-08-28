-- Pass 121 — membership drives visibility for group rooms.
CREATE OR REPLACE FUNCTION public.visible_chat_channels(_user_id uuid)
RETURNS TABLE(slug text, label text, icon text, color text, display_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH me AS (
    SELECT t.name AS team_name
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE p.user_id = _user_id
    LIMIT 1
  ),
  mgr AS (
    SELECT (public.has_role(_user_id, 'manager') OR public.has_role(_user_id, 'admin')
            OR public.has_role(_user_id, 'owner')) AS ok
  )
  SELECT c.slug, c.label, c.icon, c.color, c.display_order
  FROM public.chat_channels c, mgr
  WHERE c.is_active = true
    AND c.slug <> 'ai-coach'
    AND COALESCE(c.kind,'channel') <> 'dm'
    AND (
      _user_id = ANY (COALESCE(c.member_ids, '{}'::uuid[]))
      OR (COALESCE(c.kind,'channel') = 'group' AND public.is_chat_admin(_user_id))
      OR (
        COALESCE(c.kind,'channel') <> 'group'
        AND (
          c.slug NOT LIKE 'team-%'
          OR mgr.ok
          OR c.slug = public.team_channel_slug((SELECT team_name FROM me))
        )
      )
    )
  ORDER BY c.display_order, c.label
$function$;

-- Who may add or remove people in a room.
CREATE OR REPLACE FUNCTION public.can_manage_channel_members(_slug text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.slug = _slug
      AND COALESCE(c.kind, 'channel') <> 'dm'
      AND (public.is_chat_admin(_uid) OR public.can_set_channel_cover(_slug, _uid))
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_channel_members(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_channel_members(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.add_channel_members(_slug text, _ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _added int := 0;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF NOT public.can_manage_channel_members(_slug, _uid) THEN
    RETURN jsonb_build_object('error', 'Only this room''s manager can change members');
  END IF;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('error', 'Pick at least one person');
  END IF;
  UPDATE public.chat_channels c
  SET member_ids = (
    SELECT ARRAY(SELECT DISTINCT u FROM unnest(COALESCE(c.member_ids, '{}'::uuid[]) || _ids) u WHERE u IS NOT NULL)
  )
  WHERE c.slug = _slug;
  GET DIAGNOSTICS _added = ROW_COUNT;
  IF _added = 0 THEN RETURN jsonb_build_object('error', 'Room not found'); END IF;
  RETURN jsonb_build_object('slug', _slug, 'added', array_length(_ids, 1));
END;
$$;
REVOKE ALL ON FUNCTION public.add_channel_members(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_channel_members(text, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remove_channel_member(_slug text, _id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _hit int := 0;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF NOT public.can_manage_channel_members(_slug, _uid) THEN
    RETURN jsonb_build_object('error', 'Only this room''s manager can change members');
  END IF;
  UPDATE public.chat_channels c
  SET member_ids = (
    SELECT ARRAY(SELECT u FROM unnest(COALESCE(c.member_ids, '{}'::uuid[])) u WHERE u <> _id)
  )
  WHERE c.slug = _slug;
  GET DIAGNOSTICS _hit = ROW_COUNT;
  IF _hit = 0 THEN RETURN jsonb_build_object('error', 'Room not found'); END IF;
  RETURN jsonb_build_object('slug', _slug, 'removed', _id);
END;
$$;
REVOKE ALL ON FUNCTION public.remove_channel_member(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_channel_member(text, uuid) TO authenticated, service_role;

-- The picker: active people with faces, flagged if already in the room.
CREATE OR REPLACE FUNCTION public.channel_member_options(_slug text DEFAULT NULL, _q text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _like text := '%' || btrim(COALESCE(_q, '')) || '%';
  _members uuid[] := '{}'::uuid[];
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF _slug IS NULL THEN
    IF NOT public.is_manager_tier(_uid) THEN RETURN jsonb_build_object('error', 'No access'); END IF;
  ELSE
    IF NOT public.can_manage_channel_members(_slug, _uid) THEN RETURN jsonb_build_object('error', 'No access'); END IF;
    SELECT COALESCE(c.member_ids, '{}'::uuid[]) INTO _members FROM public.chat_channels c WHERE c.slug = _slug;
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'full_name'), '[]'::jsonb) INTO _rows
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'in_room', (p.user_id = ANY (_members))
    ) AS x
    FROM public.profiles p
    WHERE COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text, '') <> 'nlc'
      AND p.full_name IS NOT NULL
      AND p.full_name ILIKE _like
    ORDER BY p.full_name
    LIMIT 50
  ) s;

  RETURN jsonb_build_object('people', _rows);
END;
$$;
REVOKE ALL ON FUNCTION public.channel_member_options(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.channel_member_options(text, text) TO authenticated, service_role;

-- New group rooms: managers and above.
CREATE OR REPLACE FUNCTION public.create_group_channel(_label text, _ids uuid[] DEFAULT '{}'::uuid[], _cover text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _name text := btrim(COALESCE(_label, ''));
  _slug text;
  _members uuid[];
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF NOT public.is_manager_tier(_uid) THEN RETURN jsonb_build_object('error', 'Only a manager can start a group'); END IF;
  IF length(_name) < 2 THEN RETURN jsonb_build_object('error', 'Name is too short'); END IF;

  _slug := 'grp-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  SELECT ARRAY(SELECT DISTINCT u FROM unnest(COALESCE(_ids, '{}'::uuid[]) || ARRAY[_uid]) u WHERE u IS NOT NULL)
    INTO _members;

  INSERT INTO public.chat_channels (slug, label, icon, color, kind, member_ids, is_active, display_order, created_by, cover_image_path)
  VALUES (_slug, _name, 'MessageSquare', 'text-foreground', 'group', _members, true, 500, _uid, _cover);

  RETURN jsonb_build_object('slug', _slug, 'label', _name, 'member_count', array_length(_members, 1));
END;
$$;
REVOKE ALL ON FUNCTION public.create_group_channel(text, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_channel(text, uuid[], text) TO authenticated, service_role;

-- The room sheet learns whether the viewer may manage members, and group rooms
-- list their member list rather than whoever has posted.
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
      AND p.full_name IS NOT NULL
      AND CASE
        WHEN _kind IN ('dm', 'group') THEN EXISTS (
          SELECT 1 FROM public.chat_channels c2
          WHERE c2.slug = _slug AND p.user_id = ANY (COALESCE(c2.member_ids, '{}'::uuid[])))
        ELSE (
          EXISTS (
            SELECT 1 FROM public.chat_channels c3
            WHERE c3.slug = _slug AND p.user_id = ANY (COALESCE(c3.member_ids, '{}'::uuid[])))
          OR (_slug LIKE 'team-%' AND EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = p.team_id AND public.team_channel_slug(t.name) = _slug))
          OR EXISTS (
            SELECT 1 FROM public.chat_messages msg
            WHERE msg.channel = _slug AND msg.user_id = p.user_id AND msg.is_ai = false)
        )
      END
  ) m;

  RETURN jsonb_build_object(
    'slug', _slug,
    'label', _label,
    'kind', _kind,
    'cover_image_path', _cover,
    'can_set_cover', public.can_set_channel_cover(_slug, _uid),
    'can_rename', (_kind <> 'dm' AND (public.is_chat_admin(_uid) OR public.can_set_channel_cover(_slug, _uid))),
    'can_delete_room', (_kind <> 'dm' AND public.is_chat_admin(_uid)),
    'can_manage_members', public.can_manage_channel_members(_slug, _uid),
    'members', _members,
    'member_count', jsonb_array_length(_members)
  );
END;
$$;